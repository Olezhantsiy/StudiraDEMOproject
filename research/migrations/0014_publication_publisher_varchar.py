from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("research", "0013_publisher"),
    ]

    operations = [
        # Remove the FK column (publisher_id) and add a simple varchar column (publisher)
        migrations.RemoveField(
            model_name="publication",
            name="publisher",
        ),
        migrations.AddField(
            model_name="publication",
            name="publisher",
            field=models.CharField(blank=True, max_length=500, default=""),
            preserve_default=False,
        ),
    ]
