from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from branches.models import Branch
from companies.models import Company
from employees.models import Trainer


GROUP_PROGRAM_TRAINERS: list[dict[str, object]] = [
    {
        "first_name": "Оксана",
        "middle_name": "",
        "last_name": "Ларюкова",
        "specialization": "Групповые программы",
        "achievements": "Дата из документа: 11.07.1991. Направления: силовые, мягкие классы, йога, танцевальные классы.",
        "bio": "Проводит групповые тренировки: силовые, мягкие классы (растяжка, здоровая спина), йога и танцевальные направления для женщин.",
        "trains_gym_floor": False,
        "trains_group_programs": True,
    },
    {
        "first_name": "Юлия",
        "middle_name": "",
        "last_name": "Моисеева",
        "specialization": "Инструктор групповых программ; персональный тренер",
        "achievements": "Дата из документа: 26.01.1976. Направления: Step, aerobics, Pilates, Stretching, функциональный тренинг, MFR, Bosu, Fitboll, Slide.",
        "bio": "Инструктор групповых программ и персональный тренер. Участвует в обучениях по нейрохакингу, фитнес-тестированию и мобилизации.",
        "trains_gym_floor": True,
        "trains_group_programs": True,
    },
    {
        "first_name": "Екатерина",
        "middle_name": "",
        "last_name": "Недорезова",
        "specialization": "Групповые программы",
        "achievements": "Дата из документа: 04.12.1998. КМС по лёгкой атлетике. Призёр соревнований по велоспорту и шоссейному бегу.",
        "bio": "Тренер-универсал: cycle, силовые тренировки, HIIT, tabata, стретчинг и здоровая спина. Стаж работы с 2022 года.",
        "trains_gym_floor": False,
        "trains_group_programs": True,
    },
    {
        "first_name": "Оксана",
        "middle_name": "",
        "last_name": "Пушкаренко",
        "specialization": "Групповые программы",
        "achievements": "Дата из документа: 08.06.1980. Обучение: Zumba, «Проф навыки», «Новые ритмы», Strong Nation.",
        "bio": "Групповые программы с акцентом на танцевальные и функциональные направления.",
        "trains_gym_floor": False,
        "trains_group_programs": True,
    },
    {
        "first_name": "Ирина",
        "middle_name": "",
        "last_name": "Ребенькова",
        "specialization": "Тренер групповых программ",
        "achievements": "Дата из документа: 11.09.1983. Направления: аэробика, степ-аэробика, TRX.",
        "bio": "Тренер групповых программ с опытом в аэробике, степ-аэробике и TRX.",
        "trains_gym_floor": False,
        "trains_group_programs": True,
    },
    {
        "first_name": "Анастасия",
        "middle_name": "",
        "last_name": "Кузьмина",
        "specialization": "Групповые программы",
        "achievements": "Дата из документа: 13.10.1980. Диплом Прана. Стаж работы с 2011 года.",
        "bio": "Групповые программы, подготовка и обучение в направлении Прана.",
        "trains_gym_floor": False,
        "trains_group_programs": True,
    },
    {
        "first_name": "Татьяна",
        "middle_name": "",
        "last_name": "Понежина",
        "specialization": "Групповые программы",
        "achievements": "Дата из документа: 18.07.1984. Опыт работы с групповыми направлениями и функциональным тренингом.",
        "bio": "Групповые программы, функциональный тренинг, работа с фитнес-направлениями клуба.",
        "trains_gym_floor": False,
        "trains_group_programs": True,
    },
]


class Command(BaseCommand):
    help = "Создаёт или обновляет сотрудников групповых программ из утверждённого списка."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--company", default="sportmax", help="Slug компании")
        parser.add_argument("--branch", default="", help="Название филиала для всех тренеров")
        parser.add_argument("--dry-run", action="store_true", help="Показать изменения без записи в БД")

    @transaction.atomic
    def handle(self, *args: object, **options: object) -> None:
        company_slug = str(options["company"]).strip()
        branch_name = str(options["branch"]).strip()
        dry_run = bool(options["dry_run"])

        try:
            company = Company.objects.get(slug=company_slug, is_active=True)
        except Company.DoesNotExist as exc:
            raise CommandError(f"Компания '{company_slug}' не найдена.") from exc

        if branch_name:
            branch, _created = Branch.objects.get_or_create(company=company, name=branch_name)
        else:
            branch = Branch.objects.filter(company=company, is_active=True).order_by("-is_primary", "id").first()
            if branch is None:
                branch = Branch.objects.create(company=company, name="Main Hall", is_primary=True)

        created = 0
        updated = 0

        for trainer_data in GROUP_PROGRAM_TRAINERS:
            lookup = {
                "company": company,
                "first_name": trainer_data["first_name"],
                "middle_name": trainer_data["middle_name"],
                "last_name": trainer_data["last_name"],
            }
            defaults = {
                "branch": branch,
                "specialization": trainer_data["specialization"],
                "achievements": trainer_data["achievements"],
                "bio": trainer_data["bio"],
                "trains_gym_floor": trainer_data["trains_gym_floor"],
                "trains_group_programs": trainer_data["trains_group_programs"],
                "is_active": True,
            }

            if dry_run:
                self.stdout.write(
                    f"[dry-run] {trainer_data['first_name']} {trainer_data['last_name']} -> "
                    f"group_programs={trainer_data['trains_group_programs']}"
                )
                continue

            trainer, was_created = Trainer.objects.update_or_create(defaults=defaults, **lookup)
            if was_created:
                created += 1
            else:
                updated += 1
            self.stdout.write(f"[ok] {trainer.full_name}")

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run завершён."))
            return

        self.stdout.write(self.style.SUCCESS("Сотрудники групповых программ обновлены."))
        self.stdout.write(f"  created: {created}")
        self.stdout.write(f"  updated: {updated}")
