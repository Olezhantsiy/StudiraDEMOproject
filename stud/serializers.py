from rest_framework import serializers
from .models import Department, EducationalProgram, AcademicGroup, StudentEnrollment
from users.serializers import UserShortSerializer
from users.models import User


class DepartmentSerializer(serializers.ModelSerializer):
    head = UserShortSerializer(read_only=True)
    head_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="head",
        write_only=True
    )

    class Meta:
        model = Department
        fields = ("id", "name", "description", "head", "head_id")


class EducationalProgramSerializer(serializers.ModelSerializer):
    department = serializers.StringRelatedField()
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True
    )

    class Meta:
        model = EducationalProgram
        fields = (
            "id",
            "full_name",
            "short_name",
            "degree_level",
            "department",
            "department_id",
        )


class AcademicGroupSerializer(serializers.ModelSerializer):
    program = EducationalProgramSerializer(read_only=True)
    program_id = serializers.PrimaryKeyRelatedField(
        queryset=EducationalProgram.objects.all(),
        source="program",
        write_only=True
    )

    class Meta:
        model = AcademicGroup
        fields = ("id", "name", "program", "program_id", "start_date", "end_date")


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    student = UserShortSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="student",
        write_only=True
    )

    group = AcademicGroupSerializer(read_only=True)
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicGroup.objects.all(),
        source="group",
        write_only=True
    )

    supervisor = UserShortSerializer(read_only=True)
    supervisor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="supervisor",
        allow_null=True,
        required=False,
        write_only=True
    )

    class Meta:
        model = StudentEnrollment
        fields = (
            "id",
            "student",
            "student_id",
            "group",
            "group_id",
            "supervisor",
            "supervisor_id",
            "start_date",
            "end_date",
            "status",
        )
