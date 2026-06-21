from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("research", "0014_publication_publisher_varchar"),
    ]

    operations = [
        migrations.AddField(
            model_name="stagetask",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
