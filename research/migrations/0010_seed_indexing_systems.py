from django.db import migrations

INDEXING_SYSTEMS = [
    "РИНЦ",
    "ВАК",
    "Белый список",
    "RSCI",
    "Scopus",
    "WoS",
]


def seed_systems(apps, schema_editor):
    IndexingSystem = apps.get_model("research", "IndexingSystem")
    for name in INDEXING_SYSTEMS:
        IndexingSystem.objects.get_or_create(name=name)


def remove_systems(apps, schema_editor):
    IndexingSystem = apps.get_model("research", "IndexingSystem")
    IndexingSystem.objects.filter(name__in=INDEXING_SYSTEMS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0009_indexingsystem_publication_indexes'),
    ]

    operations = [
        migrations.RunPython(seed_systems, remove_systems),
    ]
