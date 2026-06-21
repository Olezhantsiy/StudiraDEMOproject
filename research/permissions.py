from rest_framework.permissions import BasePermission
from users.models import UserRole


def _get_project(obj):
    """Return the ResearchProject associated with any research-related object."""
    if hasattr(obj, "enrollment"):   # ResearchProject itself
        return obj
    if hasattr(obj, "project"):      # ResearchStage
        return obj.project
    if hasattr(obj, "stage"):        # StageTask
        return obj.stage.project
    if hasattr(obj, "task"):         # TaskSubmission / Publication
        return obj.task.stage.project
    if hasattr(obj, "submission"):   # SubmissionReview
        return obj.submission.task.stage.project
    return None


def _is_dept_head_of_project(user, project) -> bool:
    """Return True if *user* is the department head for the project's programme."""
    try:
        return project.enrollment.group.program.department.head_id == user.id
    except AttributeError:
        return False


def supervisor_ids_in_department(head) -> set:
    """Set of supervisor ids who supervise projects in the head's department."""
    from research.models import ResearchProject

    return set(
        ResearchProject.objects.filter(
            enrollment__group__program__department__head=head
        )
        .exclude(supervisor__isnull=True)
        .values_list("supervisor_id", flat=True)
    )


def is_supervisor_of(user, obj) -> bool:
    """
    Return True if *user* has supervisor-level rights over *obj*.

    For HEAD users this includes any project whose department they lead,
    not just projects where they are explicitly set as supervisor.
    """
    if user.role == UserRole.HEAD:
        project = _get_project(obj)
        if project:
            return (
                project.supervisor_id == user.id
                or _is_dept_head_of_project(user, project)
            )
        return False

    if hasattr(obj, "supervisor"):          # ResearchProject
        return obj.supervisor == user
    if hasattr(obj, "project"):             # ResearchStage
        return obj.project.supervisor == user
    if hasattr(obj, "stage"):               # StageTask
        return obj.stage.project.supervisor == user
    if hasattr(obj, "task"):                # TaskSubmission / Publication
        return obj.task.stage.project.supervisor == user
    if hasattr(obj, "submission"):          # SubmissionReview
        return obj.submission.task.stage.project.supervisor == user
    return False


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.STUDENT


class IsSupervisor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.SUPERVISOR


class IsHead(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.HEAD


class IsProjectOwnerStudent(BasePermission):
    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and obj.enrollment.student == request.user
        )


class IsProjectSupervisor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            UserRole.SUPERVISOR,
            UserRole.HEAD,
        )

    def has_object_permission(self, request, view, obj):
        return is_supervisor_of(request.user, obj)


class IsSubmissionOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.student == request.user


class IsPublicationOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == UserRole.HEAD:
            # HOD acting as supervisor has owner rights on their supervised projects
            if is_supervisor_of(user, obj):
                return True
            return obj.task.stage.project.enrollment.group.program.department.head == user
        if user.role == UserRole.SUPERVISOR:
            return obj.task.stage.project.supervisor == user
        if user.role == UserRole.STUDENT:
            return obj.task.stage.project.enrollment.student == user
        return False


class IsSubmissionAuthorOrReviewer(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == UserRole.HEAD:
            if is_supervisor_of(user, obj):
                return True
            return obj.task.stage.project.enrollment.group.program.department.head == user
        if user.role == UserRole.SUPERVISOR:
            return obj.task.stage.project.supervisor == user
        if user.role == UserRole.STUDENT:
            return obj.task.stage.project.enrollment.student == user
        return False


class IsSupervisorOrHead(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            UserRole.SUPERVISOR,
            UserRole.HEAD,
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == UserRole.HEAD:
            return True
        # Supervisor can only edit their own non-system templates
        if user.role == UserRole.SUPERVISOR:
            return not obj.is_system and obj.created_by == user
        return False


class IsStudentOrSupervisor(BasePermission):
    def has_object_permission(self, request, view, obj):
        return (
            obj.enrollment.student == request.user
            or obj.supervisor == request.user
        )
