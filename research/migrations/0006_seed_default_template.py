from django.db import migrations

DEFAULT_PLAN = [
    {
        "stage": "Анализ литературы",
        "duration_days": 14,
        "tasks": [
            "Подбор научных источников",
            "Обзор существующих решений",
            "Формирование цели и задач исследования",
        ],
    },
    {
        "stage": "Проектирование",
        "duration_days": 14,
        "tasks": [
            "Выбор архитектуры решения",
            "Проектирование БД",
            "Подготовка технического задания",
        ],
    },
    {
        "stage": "Разработка",
        "duration_days": 21,
        "tasks": [
            "Реализация backend",
            "Реализация frontend",
            "Интеграция компонентов",
        ],
    },
    {
        "stage": "Эксперименты и тестирование",
        "duration_days": 14,
        "tasks": [
            "Подготовка тестовых данных",
            "Проведение экспериментов",
            "Анализ результатов",
        ],
    },
    {
        "stage": "Подготовка ВКР",
        "duration_days": 14,
        "tasks": [
            "Написание пояснительной записки",
            "Подготовка презентации",
            "Подготовка к защите",
        ],
    },
]


def seed_default_template(apps, schema_editor):
    PlanTemplate = apps.get_model("research", "PlanTemplate")
    PlanTemplateStage = apps.get_model("research", "PlanTemplateStage")
    PlanTemplateTask = apps.get_model("research", "PlanTemplateTask")

    template = PlanTemplate.objects.create(
        name="Стандартный план исследования",
        description="Типовой план, автоматически создаваемый при генерации шаблона. Подходит для большинства магистерских и аспирантских работ.",
        is_system=True,
    )

    for i, stage_data in enumerate(DEFAULT_PLAN, start=1):
        stage = PlanTemplateStage.objects.create(
            template=template,
            name=stage_data["stage"],
            order=i,
            duration_days=stage_data["duration_days"],
        )
        for j, task_title in enumerate(stage_data["tasks"], start=1):
            PlanTemplateTask.objects.create(stage=stage, title=task_title, order=j)


def unseed_default_template(apps, schema_editor):
    PlanTemplate = apps.get_model("research", "PlanTemplate")
    PlanTemplate.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0005_plan_templates'),
    ]

    operations = [
        migrations.RunPython(seed_default_template, unseed_default_template),
    ]
