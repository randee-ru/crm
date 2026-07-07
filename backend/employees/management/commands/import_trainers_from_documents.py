from __future__ import annotations

import re
from pathlib import Path
from zipfile import ZipFile

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from branches.models import Branch
from companies.models import Company
from employees.models import Trainer
from xml.etree import ElementTree as ET


COMMON_FIRST_NAMES = {
    "Александр",
    "Алексей",
    "Алена",
    "Алёна",
    "Алина",
    "Анастасия",
    "Анна",
    "Артем",
    "Артём",
    "Борис",
    "Валерий",
    "Валерия",
    "Вера",
    "Вероника",
    "Виктор",
    "Виктория",
    "Владимир",
    "Дарина",
    "Дарья",
    "Денис",
    "Дмитрий",
    "Евгений",
    "Екатерина",
    "Елена",
    "Иван",
    "Игорь",
    "Инна",
    "Ирина",
    "Кирилл",
    "Кристина",
    "Лариса",
    "Лидия",
    "Лилия",
    "Любовь",
    "Максим",
    "Марат",
    "Мария",
    "Михаил",
    "Милана",
    "Мирослава",
    "Надежда",
    "Наталья",
    "Никита",
    "Николай",
    "Оксана",
    "Олег",
    "Ольга",
    "Павел",
    "Петр",
    "Пётр",
    "Полина",
    "Роман",
    "Руслан",
    "Сабина",
    "Сергей",
    "София",
    "Софья",
    "Станислав",
    "Светлана",
    "Татьяна",
    "Тимур",
    "Юлия",
    "Юрий",
    "Яна",
    "Ярослав",
    "Эдуард",
    "Жанна",
    "Галина",
    "Георгий",
    "Григорий",
    "Даниил",
    "Даша",
    "Елизавета",
    "Злата",
    "Леонид",
    "Мадина",
    "Малика",
    "Марк",
    "Нина",
    "Ольга",
    "Снежана",
    "Таисия",
    "Федор",
    "Фёдор",
}


def normalize_text(value: object) -> str:
    return " ".join(str(value).replace("\xa0", " ").split()).strip()


def raw_block_text(value: object) -> str:
    text = str(value).replace("\xa0", " ").strip()
    return text


def split_name(text: str) -> tuple[str, str, str]:
    cleaned = normalize_text(text)
    cleaned = re.split(
        r"(?:\bОбразование\b|\bСпециализация\b|\bТренерский стаж\b|\bСтаж работы\b|\bЗвания и регалии\b|\bСпортивные достижения\b|\bРабота со мной\b|\bКому подойдет\b|\bМастер спорта\b|\bКМС\b|\bМСМК\b|\bМС\b|\bЧемпион\b|\bСертифицированный\b|\bСертифицированная\b|\bДействующий спортсмен\b)",
        cleaned,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    cleaned = cleaned.split("@", 1)[0].strip()
    tokens = re.findall(r"[А-Яа-яЁёA-Za-z'-]+", cleaned)

    if len(tokens) >= 3:
        return tokens[1], tokens[2], tokens[0]
    if len(tokens) == 2:
        first, second = tokens
        if first in COMMON_FIRST_NAMES and second not in COMMON_FIRST_NAMES:
            return first, "", second
        if second in COMMON_FIRST_NAMES and first not in COMMON_FIRST_NAMES:
            return second, "", first
        return first, "", second
    if len(tokens) == 1:
        return tokens[0], "", ""
    return "", "", ""


def extract_section(text: str, start_markers: list[str], end_markers: list[str]) -> str:
    lowered = text.lower()
    start_index = -1
    for marker in start_markers:
        idx = lowered.find(marker.lower())
        if idx != -1:
            start_index = idx
            break
    if start_index == -1:
        return ""

    after = text[start_index:]
    end_index = len(after)
    for marker in end_markers:
        idx = after.lower().find(marker.lower())
        if idx != -1:
            end_index = min(end_index, idx)
    return normalize_text(after[:end_index])


def extract_specialization(text: str) -> str:
    match = re.search(
        r"Специализац(?:ия|ии)\s*:?\s*(.+?)(?:\bТренерский стаж\b|\bСтаж работы\b|\bЗвания и регалии\b|\bОбразование\b|$)",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return ""
    return normalize_text(match.group(1))


def extract_achievements(text: str) -> str:
    value = extract_section(
        text,
        ["Спортивные достижения:", "Звания и регалии:", "Звания и регалии"],
        ["Специализация:", "Специализация", "Тренерский стаж:", "Тренерский стаж", "Стаж работы:", "Стаж работы"],
    )
    if value:
        return value

    value = extract_section(
        text,
        ["Образование:", "Образование"],
        ["Специализация:", "Специализация", "Тренерский стаж:", "Тренерский стаж", "Стаж работы:", "Стаж работы"],
    )
    return value


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}


def _col_letters(ref: str) -> str:
    return "".join(ch for ch in ref if ch.isalpha())


def _load_shared_strings(zip_file: ZipFile) -> list[str]:
    try:
        data = zip_file.read("xl/sharedStrings.xml")
    except KeyError:
        return []

    root = ET.fromstring(data)
    strings: list[str] = []
    for item in root.findall("main:si", NS):
        parts = [node.text or "" for node in item.findall(".//main:t", NS)]
        strings.append("".join(parts))
    return strings


def iter_xlsx_blocks(path: Path) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    with ZipFile(path) as zip_file:
        shared_strings = _load_shared_strings(zip_file)
        sheet_names = [name for name in zip_file.namelist() if name.startswith("xl/worksheets/sheet")]
        if not sheet_names:
            raise CommandError("В Excel-файле не найден ни один лист.")
        sheet_name = sorted(sheet_names)[0]
        root = ET.fromstring(zip_file.read(sheet_name))

        for row in root.findall(".//main:row", NS):
            row_number = row.attrib.get("r", "?")
            for cell in row.findall("main:c", NS):
                ref = cell.attrib.get("r", "")
                cell_type = cell.attrib.get("t", "")
                value = ""
                if cell_type == "inlineStr":
                    value = "".join(node.text or "" for node in cell.findall(".//main:t", NS))
                else:
                    raw_value = cell.findtext("main:v", default="", namespaces=NS)
                    if raw_value:
                        if cell_type == "s":
                            index = int(raw_value)
                            if 0 <= index < len(shared_strings):
                                value = shared_strings[index]
                        else:
                            value = raw_value
                value = value.strip()
                if value:
                    blocks.append((f"{path.name}:{_col_letters(ref)}{row_number}", raw_block_text(value)))
    return blocks


def iter_docx_blocks(path: Path) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    with ZipFile(path) as zip_file:
        root = ET.fromstring(zip_file.read("word/document.xml"))

        for table_index, table in enumerate(root.findall(".//w:tbl", NS)):
            for row_index, row in enumerate(table.findall(".//w:tr", NS)):
                cells = row.findall("w:tc", NS)
                for col_index, cell in enumerate(cells):
                    text_parts = [node.text or "" for node in cell.findall(".//w:t", NS)]
                    text = " ".join(part for part in text_parts if part).strip()
                    if text:
                        blocks.append((f"{path.name}:table{table_index}:r{row_index}:c{col_index}", raw_block_text(text)))

    return blocks


class Command(BaseCommand):
    help = "Импортирует тренеров из Excel / Word документов в базу."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании")
        parser.add_argument("--xlsx", required=True, help="Путь к Excel-файлу с тренерами")
        parser.add_argument("--docx", required=True, help="Путь к Word-файлу с тренерами")
        parser.add_argument("--branch", default="", help="Название филиала для всех импортируемых тренеров")
        parser.add_argument("--dry-run", action="store_true", help="Показать, что будет импортировано, без записи в БД")

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        company_slug = options["company"]
        xlsx_path = Path(options["xlsx"]).expanduser()
        docx_path = Path(options["docx"]).expanduser()
        branch_name = options["branch"].strip()
        dry_run = options["dry_run"]

        if not xlsx_path.exists():
            raise CommandError(f"Excel-файл не найден: {xlsx_path}")
        if not docx_path.exists():
            raise CommandError(f"Word-файл не найден: {docx_path}")

        try:
            company = Company.objects.get(slug=company_slug, is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{company_slug}' не найдена.") from exc

        branch = None
        if branch_name:
            branch, _ = Branch.objects.get_or_create(company=company, name=branch_name)
        else:
            branch = Branch.objects.filter(company=company, is_active=True).order_by("-is_primary", "id").first()
            if branch is None:
                branch = Branch.objects.create(company=company, name="Main Hall", is_primary=True)

        sources = iter_xlsx_blocks(xlsx_path) + iter_docx_blocks(docx_path)
        entries = [(ref, text) for ref, text in sources if text]

        self.stdout.write(f"Найдено записей: {len(entries)}")

        created = 0
        updated = 0
        skipped = 0

        for index, (source_ref, text) in enumerate(entries, start=1):
            first_name, middle_name, last_name = split_name(text)
            if not first_name or not last_name:
                skipped += 1
                self.stderr.write(self.style.WARNING(f"[skip] {source_ref}: не удалось распознать имя"))
                continue

            phone = f"+7901000{index:05d}"
            specialization = extract_specialization(text)
            achievements = extract_achievements(text)
            bio = text.strip()

            defaults = {
                "branch": branch,
                "first_name": first_name[:100],
                "middle_name": middle_name[:100],
                "last_name": last_name[:100],
                "phone": phone[:32],
                "email": "",
                "specialization": specialization[:255],
                "achievements": achievements[:5000],
                "bio": bio[:5000],
                "trains_gym_floor": True,
                "trains_group_programs": False,
                "is_active": True,
            }

            if dry_run:
                self.stdout.write(f"[dry-run] {source_ref} -> {first_name} {middle_name} {last_name} | {phone}")
                continue

            trainer, was_created = Trainer.objects.update_or_create(
                company=company,
                phone=phone,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1
            self.stdout.write(f"[ok] {trainer.full_name} | {source_ref}")

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run завершён."))
            return

        self.stdout.write(self.style.SUCCESS("Импорт тренеров завершён."))
        self.stdout.write(f"  created: {created}")
        self.stdout.write(f"  updated: {updated}")
        self.stdout.write(f"  skipped: {skipped}")
