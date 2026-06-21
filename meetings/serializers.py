from rest_framework import serializers
from .models import Meeting
from users.models import User


class OrganizerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "middle_name", "full_name", "role"]

    def get_full_name(self, obj):
        parts = [obj.last_name, obj.first_name, obj.middle_name]
        return " ".join(p for p in parts if p).strip() or obj.username


class MeetingSerializer(serializers.ModelSerializer):
    organizer_detail = OrganizerSerializer(source="organizer", read_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id",
            "project",
            "organizer",
            "organizer_detail",
            "title",
            "datetime",
            "duration_minutes",
            "location",
            "timezone",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["organizer", "created_at", "updated_at"]

    def validate_timezone(self, value):
        import zoneinfo
        try:
            zoneinfo.ZoneInfo(value)
        except (KeyError, Exception):
            raise serializers.ValidationError(f"Неверный часовой пояс: {value}")
        return value

    def create(self, validated_data):
        validated_data["organizer"] = self.context["request"].user
        return super().create(validated_data)


class MeetingUpdateSerializer(MeetingSerializer):
    """For supervisor/head: allows updating datetime, title, notes, location, status."""

    class Meta(MeetingSerializer.Meta):
        read_only_fields = ["organizer", "project", "created_at", "updated_at"]
