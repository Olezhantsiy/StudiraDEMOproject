from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('research', '0007_publication_year_status'),
    ]

    operations = [
        # 1. Add task_type to StageTask
        migrations.AddField(
            model_name='stagetask',
            name='task_type',
            field=models.CharField(
                choices=[('FILE', 'FILE'), ('PUBLICATION', 'PUBLICATION')],
                default='FILE',
                max_length=25,
            ),
        ),

        # 2. Add task_type to PlanTemplateTask
        migrations.AddField(
            model_name='plantemplatetask',
            name='task_type',
            field=models.CharField(
                choices=[('FILE', 'FILE'), ('PUBLICATION', 'PUBLICATION')],
                default='FILE',
                max_length=25,
            ),
        ),

        # 3. Clean up existing publications (they reference old project FK)
        migrations.RunSQL("DELETE FROM research_publication;"),

        # 4. Remove old project FK from Publication
        migrations.RemoveField(
            model_name='publication',
            name='project',
        ),

        # 5. Add task FK to Publication
        migrations.AddField(
            model_name='publication',
            name='task',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='publications',
                to='research.stagetask',
            ),
            preserve_default=False,
        ),
    ]
