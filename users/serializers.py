from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import User, UserRole
User = get_user_model()

class UserShortSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "role",
        )
    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name} {obj.middle_name}".strip()

class UserDetailSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "middle_name",
            "role",
            "date_joined",
            "last_login",
        )
        read_only_fields = ("date_joined", "last_login", "role", "id", "username")

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "middle_name",
        )

    def create(self, validated_data): #добавиль perform_create? вроде нет...
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name"),
            last_name=validated_data.get("last_name"),
            middle_name=validated_data.get("middle_name", "")
        )

        user.role = UserRole.STUDENT
        user.save()

        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # добавляем данные пользователя в payload токена
        token["username"] = user.username
        token["role"] = user.role
        token["is_staff"] = user.is_staff

        return token