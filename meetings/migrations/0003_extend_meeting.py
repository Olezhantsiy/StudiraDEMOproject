import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="meeting",
            name="title",
            field=models.CharField(default="Встреча", max_length=255),
        ),
        migrations.AddField(
            model_name="meeting",
            name="duration_minutes",
            field=models.PositiveIntegerField(default=60),
        ),
        migrations.AddField(
            model_name="meeting",
            name="location",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="meeting",
            name="timezone",
            field=models.CharField(default="UTC", max_length=64),
        ),
        migrations.AddField(
            model_name="meeting",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="meeting",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name="meeting",
            name="status",
            field=models.CharField(
                choices=[
                    ("PLANNED", "Планируется"),
                    ("DONE", "Проведено"),
                    ("CANCELLED", "Отменено"),
                ],
                default="PLANNED",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="meeting",
            name="organizer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="organized_meetings",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="meeting",
            name="project",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="meetings",
                to="research.researchproject",
            ),
        ),
        migrations.AlterModelOptions(
            name="meeting",
            options={"ordering": ["datetime"]},
        ),
    ]
