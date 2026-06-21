from rest_framework import serializers
from rest_framework.generics import get_object_or_404

from stud.models import StudentEnrollment
from .models import (
    ResearchProject, ResearchStage, StageTask, TaskSubmission, SubmissionReview,
    Publication, PublicationStatus, IndexingSystem,
    PlanTemplate, PlanTemplateStage, PlanTemplateTask,
)
from users.serializers import UserShortSerializer
from stud.serializers import StudentEnrollmentSerializer
from users.models import User


class ResearchProjectSerializer(serializers.ModelSerializer):
    enrollment = StudentEnrollmentSerializer(read_only=True)
    enrollment_id = serializers.PrimaryKeyRelatedField(
        queryset=StudentEnrollment.objects.all(),
        source="enrollment",
        write_only=True
    )
    supervisor = UserShortSerializer(read_only=True)

    class Meta:
        model = ResearchProject
        fields = (
            "id",
            "enrollment",
            "enrollment_id",
            "supervisor",
            "title",
            "description",
            "keywords",
            "start_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "supervisor", "updated_at") #возмсожно добавить сюда руковожителя

class ResearchStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchStage
        fields = (
            "id",
            "project",
            "name",
            "order",
            "start_date",
            "deadline",
            "status",
        )
        read_only_fields = ["project"]

class StageTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StageTask
        fields = (
            "id",
            "stage",
            "title",
            'task_type',
            "description",
            "deadline",
            "status",
            "created_at",
        )
        read_only_fields = ("stage", "created_at")

    def create(self, validated_data):
        stage_id = self.context["view"].kwargs["stage_pk"]
        validated_data["stage_id"] = stage_id
        return super().create(validated_data)


class TaskSubmissionSerializer(serializers.ModelSerializer):
    #student = UserShortSerializer(read_only=True)
    task = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TaskSubmission
        fields = (
            "id",
            "task",
            "text",
            "file",
            "report",
            "status",
            "created_at",
        )
        read_only_fields = ("task", "status", "created_at", "report",)

class SubmissionReviewSerializer(serializers.ModelSerializer):
    reviewer = UserShortSerializer(read_only=True)
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SubmissionReview
        fields = (
            "id",
            "submission",
            "reviewer",
            "comment",
            "decision", #проверить!
            "created_at",
        )
        read_only_fields = ("submission", "reviewer", "created_at")

class IndexingSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndexingSystem
        fields = ("id", "name")


class PublicationsSerializer(serializers.ModelSerializer):
    indexes = IndexingSystemSerializer(many=True, read_only=True)
    index_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=IndexingSystem.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Publication
        fields = (
            "id",
            "task",
            "type",
            "status",
            "url",
            "title",
            "doi",
            "year",
            "indexes",
            "index_ids",
            "publisher",
            "created_at",
        )
        read_only_fields = ("created_at", "task")

    def create(self, validated_data):
        index_ids = validated_data.pop("index_ids", [])
        instance = super().create(validated_data)
        instance.indexes.set(index_ids)
        return instance

    def update(self, instance, validated_data):
        index_ids = validated_data.pop("index_ids", None)
        instance = super().update(instance, validated_data)
        if index_ids is not None:
            instance.indexes.set(index_ids)
        return instance


class PlanTemplateTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanTemplateTask
        fields = ("id", "title", "order", "task_type")


class PlanTemplateStageSerializer(serializers.ModelSerializer):
    tasks = PlanTemplateTaskSerializer(many=True)

    class Meta:
        model = PlanTemplateStage
        fields = ("id", "name", "order", "duration_days", "tasks")


class PlanTemplateSerializer(serializers.ModelSerializer):
    stages = PlanTemplateStageSerializer(many=True)
    created_by = UserShortSerializer(read_only=True)
    stages_count = serializers.SerializerMethodField()

    class Meta:
        model = PlanTemplate
        fields = (
            "id", "name", "description",
            "created_by", "is_system",
            "stages_count", "stages",
            "created_at", "updated_at",
        )
        read_only_fields = ("created_by", "is_system", "created_at", "updated_at")

    def get_stages_count(self, obj):
        return obj.stages.count()

    def create(self, validated_data):
        stages_data = validated_data.pop("stages", [])
        template = PlanTemplate.objects.create(**validated_data)
        for i, stage_data in enumerate(stages_data):
            tasks_data = stage_data.pop("tasks", [])
            stage_data.setdefault("order", i + 1)
            stage = PlanTemplateStage.objects.create(template=template, **stage_data)
            for j, task_data in enumerate(tasks_data):
                task_data.setdefault("order", j + 1)
                PlanTemplateTask.objects.create(stage=stage, **task_data)
        return template

    def update(self, instance, validated_data):
        stages_data = validated_data.pop("stages", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if stages_data is not None:
            instance.stages.all().delete()
            for i, stage_data in enumerate(stages_data):
                tasks_data = stage_data.pop("tasks", [])
                stage_data.setdefault("order", i + 1)
                stage = PlanTemplateStage.objects.create(template=instance, **stage_data)
                for j, task_data in enumerate(tasks_data):
                    task_data.setdefault("order", j + 1)
                    PlanTemplateTask.objects.create(stage=stage, **task_data)
        return instance


class PlanTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no nested stages)."""
    created_by = UserShortSerializer(read_only=True)
    stages_count = serializers.SerializerMethodField()

    class Meta:
        model = PlanTemplate
        fields = ("id", "name", "description", "created_by", "is_system", "stages_count", "created_at")

    def get_stages_count(self, obj):
        return obj.stages.count()