from django.contrib import admin
from .models import (
    StageTask, SubmissionReview, ResearchProject, ResearchStage, TaskSubmission,
    PlanTemplate, PlanTemplateStage, PlanTemplateTask, IndexingSystem, Publication,
)

admin.site.register(StageTask)
admin.site.register(SubmissionReview)
admin.site.register(ResearchProject)
admin.site.register(ResearchStage)
admin.site.register(TaskSubmission)
admin.site.register(PlanTemplate)
admin.site.register(PlanTemplateStage)
admin.site.register(PlanTemplateTask)
admin.site.register(IndexingSystem)
admin.site.register(Publication)

