from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0006_seed_default_template'),
    ]

    operations = [
        migrations.AddField(
            model_name='publication',
            name='year',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='publication',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', 'Черновик'),
                    ('SUBMITTED', 'Подана'),
                    ('ACCEPTED', 'Принята'),
                    ('PUBLISHED', 'Опубликована'),
                    ('REJECTED', 'Отклонена'),
                ],
                default='DRAFT',
                max_length=20,
            ),
        ),
    ]
