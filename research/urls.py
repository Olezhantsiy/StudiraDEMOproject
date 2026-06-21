from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from research.views import (
    ResearchProjectViewSet,
    ResearchStageViewSet,
    StageTaskViewSet,
    TaskSubmissionViewSet,
    SubmissionReviewViewSet,
    PublicationsViewSet,
    IndexingSystemViewSet,
    PlanTemplateViewSet,
)

router = DefaultRouter()
router.register("projects", ResearchProjectViewSet, basename="projects")
router.register("plan-templates", PlanTemplateViewSet, basename="plan-templates")
router.register("indexing-systems", IndexingSystemViewSet, basename="indexing-systems")

# /projects/{project_pk}/stages/
projects_router = NestedDefaultRouter(router, "projects", lookup="project")
projects_router.register("stages", ResearchStageViewSet, basename="project-stages")
projects_router.register("publications", PublicationsViewSet, basename="project-publications")

# /projects/{project_pk}/stages/{stage_pk}/tasks/
stages_router = NestedDefaultRouter(projects_router, "stages", lookup="stage")
stages_router.register("tasks", StageTaskViewSet, basename="stage-tasks")

# /projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/submissions/
# /projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/publications/
tasks_router = NestedDefaultRouter(stages_router, "tasks", lookup="task")
tasks_router.register("submissions", TaskSubmissionViewSet, basename="task-submissions")
tasks_router.register("publications", PublicationsViewSet, basename="task-publications")

# /projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/submissions/{submission_pk}/review/
submissions_router = NestedDefaultRouter(tasks_router, "submissions", lookup="submission")
submissions_router.register("review", SubmissionReviewViewSet, basename="submission-review")

urlpatterns = (
    router.urls
    + projects_router.urls
    + stages_router.urls
    + tasks_router.urls
    + submissions_router.urls
)
