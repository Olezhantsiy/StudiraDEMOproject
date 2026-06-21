from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0008_task_type_publication_refactor'),
    ]

    operations = [
        migrations.CreateModel(
            name='IndexingSystem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AlterField(
            model_name='publication',
            name='url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='publication',
            name='indexes',
            field=models.ManyToManyField(
                blank=True,
                related_name='publications',
                to='research.indexingsystem',
            ),
        ),
    ]
