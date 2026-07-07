from __future__ import annotations

DEFAULT_GROUP_PROGRAMS: list[dict[str, str]] = [
    {
        "title": "Велоинтенсив",
        "code": "CYCLE",
        "description": "Интенсивная кардиотренировка на велотренажёрах. Повышает выносливость, способствует снижению веса и формированию рельефа ног.",
        "color": "#e53935",
    },
    {
        "title": "Стальная динамика",
        "code": "PUMP",
        "description": "Силовая тренировка со штангой для глубокой проработки всех мышечных групп. Развитие силы и плотности мышц.",
        "color": "#6d4c41",
    },
    {
        "title": "Архитектура тела",
        "code": "FULL BODY",
        "description": "Комплексная силовая тренировка с собственным весом и оборудованием. Гармоничная проработка всего тела.",
        "color": "#3949ab",
    },
    {
        "title": "Чистая сила",
        "code": "TOTAL BODY",
        "description": "Работа со свободными весами для увеличения силы и силовой выносливости.",
        "color": "#5e35b1",
    },
    {
        "title": "Подвесной тренинг",
        "code": "TRX",
        "description": "Функциональная тренировка на подвесной системе. Развитие стабилизации, координации и контроля движения.",
        "color": "#00897b",
    },
    {
        "title": "Форма 360",
        "code": "3D ЯГОДИЦЫ",
        "description": "Объёмная проработка ягодичных мышц во всех плоскостях движения для формирования выразительного силуэта.",
        "color": "#d81b60",
    },
    {
        "title": "Сила характера",
        "code": "POWER WOMEN",
        "description": "Силовая программа для формирования рельефа и пропорций тела.",
        "color": "#c2185b",
    },
    {
        "title": "Предел",
        "code": "HARD CORE",
        "description": "Интенсивная авторская тренировка высокой плотности нагрузки. Сила, темп и выносливость.",
        "color": "#f4511e",
    },
    {
        "title": "Кардиоимпульс",
        "code": "POWER + CARDIO",
        "description": "Сочетание кардионагрузки и силовой работы для повышения общей физической подготовки.",
        "color": "#ff7043",
    },
    {
        "title": "Функция",
        "code": "FUNCTIONAL",
        "description": "Многосуставная тренировка на основе естественных движений для развития устойчивости и координации.",
        "color": "#43a047",
    },
    {
        "title": "Центр",
        "code": "CORE",
        "description": "Глубокая проработка мышц пресса, спины и стабилизаторов.",
        "color": "#1e88e5",
    },
    {
        "title": "Центр и пластика",
        "code": "CORE + STRETCHING",
        "description": "Укрепление корпуса в сочетании с развитием гибкости.",
        "color": "#039be5",
    },
    {
        "title": "Пластика",
        "code": "STRETCHING",
        "description": "Растяжка для снятия мышечного напряжения и повышения подвижности.",
        "color": "#00acc1",
    },
    {
        "title": "МФР + пластика",
        "code": "STRETCHING + МФР",
        "description": "Растяжка с элементами глубокого мышечного расслабления.",
        "color": "#26a69a",
    },
    {
        "title": "Метод Пилатеса",
        "code": "PILATES",
        "description": "Укрепление глубоких мышц, улучшение осанки и подвижности суставов.",
        "color": "#7cb342",
    },
    {
        "title": "Йога. Основа",
        "code": "HATHA YOGA",
        "description": "Практика асан и дыхания для гармонизации тела и концентрации.",
        "color": "#8e24aa",
    },
    {
        "title": "Равновесие",
        "code": "ДЫХАНИЕ + ЙОГА ПРАКТИКА",
        "description": "Дыхательные техники в сочетании с мягкой йогической практикой.",
        "color": "#ab47bc",
    },
    {
        "title": "Уверенный старт",
        "code": "SOFT TRAINING",
        "description": "Бережная тренировка для проработки всех основных мышечных групп в умеренном темпе.",
        "color": "#66bb6a",
    },
    {
        "title": "Здоровая спина",
        "code": "HEALTHY BACK",
        "description": "Комплекс для укрепления мышечного корсета и улучшения осанки.",
        "color": "#29b6f6",
    },
    {
        "title": "ZUMBA",
        "code": "ZUMBA",
        "description": "Танцевальная программа с выраженной кардионагрузкой.",
        "color": "#ec407a",
    },
    {
        "title": "Эстетика соблазна",
        "code": "STRIPDANCE",
        "description": "Танцевальное направление: пластика, хореография и сценическая выразительность.",
        "color": "#ef5350",
    },
    {
        "title": "Грация",
        "code": "HIGH HEELS",
        "description": "Практика баланса, пластики и уверенности в движении на каблуках.",
        "color": "#ba68c8",
    },
]


def ensure_default_group_programs(company) -> int:
    from schedule.models import GroupProgram

    created = 0
    for index, item in enumerate(DEFAULT_GROUP_PROGRAMS):
        _, was_created = GroupProgram.objects.get_or_create(
            company=company,
            title=item["title"],
            defaults={
                "code": item["code"],
                "description": item["description"],
                "color": item["color"],
                "sort_order": index,
            },
        )
        if was_created:
            created += 1
    return created
