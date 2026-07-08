from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0005_fitness_funnels"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="deal",
            index=models.Index(
                fields=["company", "pipeline", "stage", "-created_at"],
                name="crm_deal_kanban_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="deal",
            index=models.Index(
                fields=["company", "pipeline", "stage"],
                name="crm_deal_pipeline_stage_idx",
            ),
        ),
    ]
