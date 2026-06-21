"""Aggregation helpers for monitoring / statistics dashboards."""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from research.models import ResearchProject, StageTask, TaskStatus


def _task_counts(project_ids):
    """Return {project_id: counts dict} for the given project ids."""
    raw = (
        StageTask.objects.filter(stage__project_id__in=project_ids)
        .values("stage__project_id")
        .annotate(
            total=Count("id"),
            done=Count("id", filter=Q(status=TaskStatus.DONE)),
            in_progress=Count("id", filter=Q(status=TaskStatus.IN_PROGRESS)),
            todo=Count("id", filter=Q(status=TaskStatus.TODO)),
            overdue=Count("id", filter=Q(status=TaskStatus.OVERDUE)),
        )
    )
    result = {}
    for row in raw:
        pid = row["stage__project_id"]
        total = row["total"]
        result[pid] = {
            "total": total,
            "done": row["done"],
            "in_progress": row["in_progress"],
            "todo": row["todo"],
            "overdue": row["overdue"],
            "completion_percent": round(row["done"] / total * 100) if total else 0,
        }
    return result


def _empty_counts():
    return {
        "total": 0,
        "done": 0,
        "in_progress": 0,
        "todo": 0,
        "overdue": 0,
        "completion_percent": 0,
    }


def project_progress(project):
    """Task counts + completion percent for a single project."""
    return _task_counts([project.id]).get(project.id, _empty_counts())


def _serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "stage_name": task.stage.name,
    }


def upcoming_tasks(project, limit=5):
    """Nearest not-done tasks that have a deadline, soonest first."""
    qs = (
        StageTask.objects.filter(stage__project=project, deadline__isnull=False)
        .exclude(status=TaskStatus.DONE)
        .select_related("stage")
        .order_by("deadline")[:limit]
    )
    return [_serialize_task(t) for t in qs]


def overdue_tasks(project):
    """Tasks marked OVERDUE or past their deadline and not done."""
    today = timezone.now().date()
    qs = (
        StageTask.objects.filter(stage__project=project)
        .exclude(status=TaskStatus.DONE)
        .filter(Q(status=TaskStatus.OVERDUE) | Q(deadline__lt=today))
        .select_related("stage")
        .order_by("deadline")
    )
    return [_serialize_task(t) for t in qs]


def burndown(project):
    """
    Burndown: remaining work over time (both lines go from total down to 0).

    ideal_remaining — linear plan from total at project start to 0 at end date
    (last task deadline, or today if no deadlines).

    actual_remaining — total minus tasks completed by each date (completed_at);
    DONE tasks without completed_at are counted from today onward.
    """
    tasks = list(
        StageTask.objects.filter(stage__project=project).values_list(
            "deadline", "completed_at", "status"
        )
    )
    total = len(tasks)
    if total == 0:
        return []

    today = timezone.now().date()
    start = project.start_date or today

    deadlines = [d for d, _, _ in tasks if d]
    end = max([today, start] + deadlines)

    legacy_done = sum(
        1 for _, completed_at, status in tasks
        if status == TaskStatus.DONE and completed_at is None
    )

    def actual_done_on(day):
        count = sum(
            1 for _, completed_at, _ in tasks
            if completed_at and timezone.localtime(completed_at).date() <= day
        )
        if day >= today:
            count += legacy_done
        return count

    span_days = max((end - start).days, 1)
    step_days = 1 if span_days <= 365 else 7

    series = []
    d = start
    while d <= end:
        elapsed = min(max((d - start).days, 0), span_days)
        ideal = max(0, round(total * (1 - elapsed / span_days)))
        series.append({
            "date": d.isoformat(),
            "ideal_remaining": ideal,
            "actual_remaining": total - actual_done_on(d),
        })
        d += timedelta(days=step_days)

    last_date = series[-1]["date"] if series else None
    for mandatory in (today, end):
        if mandatory >= start and mandatory.isoformat() != last_date:
            elapsed = min(max((mandatory - start).days, 0), span_days)
            ideal = max(0, round(total * (1 - elapsed / span_days)))
            series.append({
                "date": mandatory.isoformat(),
                "ideal_remaining": ideal,
                "actual_remaining": total - actual_done_on(mandatory),
            })
            last_date = mandatory.isoformat()

    series.sort(key=lambda p: p["date"])
    return series


def _user_short(user):
    if not user:
        return None
    full_name = f"{user.last_name} {user.first_name} {user.middle_name}".strip()
    return {
        "id": user.id,
        "username": user.username,
        "full_name": full_name or user.username,
    }


def supervisor_summary(supervisor):
    """Aggregated metrics for one supervisor, with per-student breakdown."""
    projects = list(
        ResearchProject.objects.filter(supervisor=supervisor)
        .select_related("enrollment__student")
    )
    counts_map = _task_counts([p.id for p in projects])

    students = []
    student_ids = set()
    completion_values = []
    total_overdue = 0

    for p in projects:
        c = counts_map.get(p.id, _empty_counts())
        completion_values.append(c["completion_percent"])
        total_overdue += c["overdue"]
        student = p.enrollment.student if p.enrollment else None
        if student:
            student_ids.add(student.id)
        students.append({
            "student": _user_short(student),
            "project_id": p.id,
            "project_title": p.title,
            "status": p.status,
            "completion_percent": c["completion_percent"],
            "overdue": c["overdue"],
            "total": c["total"],
        })

    avg = round(sum(completion_values) / len(completion_values)) if completion_values else 0
    return {
        "supervisor": _user_short(supervisor),
        "students_count": len(student_ids),
        "avg_completion_percent": avg,
        "total_overdue_tasks": total_overdue,
        "students": students,
    }


def department_summary(head):
    """One aggregated row per supervisor in the head's department."""
    projects = list(
        ResearchProject.objects.filter(
            enrollment__group__program__department__head=head
        ).select_related("supervisor", "enrollment__student")
    )
    counts_map = _task_counts([p.id for p in projects])

    by_supervisor = {}
    for p in projects:
        sup = p.supervisor
        if not sup:
            continue
        bucket = by_supervisor.setdefault(sup.id, {
            "supervisor": sup,
            "student_ids": set(),
            "completion_values": [],
            "total_overdue": 0,
        })
        c = counts_map.get(p.id, _empty_counts())
        bucket["completion_values"].append(c["completion_percent"])
        bucket["total_overdue"] += c["overdue"]
        student = p.enrollment.student if p.enrollment else None
        if student:
            bucket["student_ids"].add(student.id)

    rows = []
    for bucket in by_supervisor.values():
        values = bucket["completion_values"]
        avg = round(sum(values) / len(values)) if values else 0
        rows.append({
            "supervisor": _user_short(bucket["supervisor"]),
            "students_count": len(bucket["student_ids"]),
            "avg_completion_percent": avg,
            "total_overdue_tasks": bucket["total_overdue"],
        })

    rows.sort(key=lambda r: r["supervisor"]["full_name"] if r["supervisor"] else "")
    return rows
