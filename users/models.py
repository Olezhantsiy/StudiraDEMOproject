from django.db import models
from django.contrib.auth.models import AbstractUser

class UserRole(models.TextChoices):
    STUDENT = "STD", "Студент"
    SUPERVISOR = "SPV", "Дипломный-руководитель"
    HEAD = "HOD", "Заведующий-кафедры"
    #DEKAN = "D", "Дэкан"
    ADMIN = "ADM", "Админ"

class User(AbstractUser):
    role = models.CharField(max_length=20, choices=UserRole.choices)
    middle_name = models.CharField(max_length=150, blank=True)
    def __str__(self):
        return f"{self.username} ({self.role})"
