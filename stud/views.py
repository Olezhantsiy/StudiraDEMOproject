from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from research.permissions import IsHead
from stud.models import Department, EducationalProgram, AcademicGroup, StudentEnrollment
from stud.serializers import (
    DepartmentSerializer,
    EducationalProgramSerializer,
    AcademicGroupSerializer,
    StudentEnrollmentSerializer,
)
from users.models import User, UserRole
from users.serializers import UserShortSerializer


class DepartmentViewSet(ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHead()]
        return [permissions.IsAuthenticated()]


class EducationalProgramViewSet(ModelViewSet):
    serializer_class = EducationalProgramSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHead()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.HEAD:
            return EducationalProgram.objects.filter(department__head=user)
        return EducationalProgram.objects.all()


class AcademicGroupViewSet(ModelViewSet):
    serializer_class = AcademicGroupSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHead()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.HEAD:
            return AcademicGroup.objects.filter(program__department__head=user)
        return AcademicGroup.objects.all()

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def students(self, request, pk=None):
        group = self.get_object()
        student_ids = group.enrollments.values_list("student_id", flat=True)
        students = User.objects.filter(id__in=student_ids)
        serializer = UserShortSerializer(students, many=True)
        return Response(serializer.data)


class StudentEnrollmentViewSet(ModelViewSet):
    serializer_class = StudentEnrollmentSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsHead()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.role == UserRole.HEAD:
            return StudentEnrollment.objects.filter(
                group__program__department__head=user,
                status="ACTIVE",
                research_projects__isnull=True,
            )

        if user.role == UserRole.SUPERVISOR:
            return StudentEnrollment.objects.filter(
                status="ACTIVE", research_projects__isnull=True
            )

        if user.role == UserRole.STUDENT:
            return StudentEnrollment.objects.filter(student=user)

        return StudentEnrollment.objects.none()


class StudentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserShortSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return User.objects.filter(role=UserRole.STUDENT)
