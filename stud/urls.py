from rest_framework.routers import DefaultRouter
from stud.views import (
    DepartmentViewSet,
    EducationalProgramViewSet,
    AcademicGroupViewSet,
    StudentEnrollmentViewSet,
    StudentViewSet,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="departments")
router.register("programs", EducationalProgramViewSet, basename="programs")
router.register("groups", AcademicGroupViewSet, basename="groups")
router.register("enrollments", StudentEnrollmentViewSet, basename="enrollments")
router.register("students", StudentViewSet, basename="students")

urlpatterns = router.urls
