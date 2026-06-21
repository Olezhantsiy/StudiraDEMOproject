from django.db import models
from django.conf import settings
User = settings.AUTH_USER_MODEL

    #TODO: Соискатель?
class DegreeLevel(models.TextChoices):
    MAGISTR = "MAG", "Магистратура"
    ASPIRANT = "ASP", "Аспирантура"

class Department(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    head = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.name

class EducationalProgram(models.Model):
    full_name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=50)
    degree_level = models.CharField(max_length=10, choices=DegreeLevel.choices)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)

    def __str__(self):
        return self.short_name


class AcademicGroup(models.Model):
    name = models.CharField(max_length=50)
    program = models.ForeignKey(EducationalProgram, on_delete=models.CASCADE, related_name="groups")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name

class EnrollmentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Обучается"
    TRANSFERRED = "TRANSFERRED", "Переведён"
    GRADUATED = "GRADUATED", "Выпущен"
    EXPELLED = "EXPELLED", "Отчислен"
    ACADEMIC = "ACADEMIC",  "Академический отпуск"

class StudentEnrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    group = models.ForeignKey(AcademicGroup, on_delete=models.CASCADE, related_name="enrollments", null=True)
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="supervised_students")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=EnrollmentStatus.choices)

    def __str__(self):
        return f"{self.student} - {self.group}"

    @property
    def course(self):
        from django.utils import timezone

        today = timezone.now().date()
        course = today.year - self.start_date.year + 1

        if today.month < 9:
            course -= 1

        return max(course, 1)



