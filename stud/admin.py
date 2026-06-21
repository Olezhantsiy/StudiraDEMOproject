from django.contrib import admin
from .models import Department, EducationalProgram, StudentEnrollment, AcademicGroup

admin.site.register(Department)
admin.site.register(EducationalProgram)
admin.site.register(StudentEnrollment)
admin.site.register(AcademicGroup)