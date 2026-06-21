"""
Тесты: встречи (meetings app).
"""

import pytest
from datetime import datetime, timezone, timedelta
from rest_framework import status

from meetings.models import Meeting, MeetingStatus


MEETINGS_URL = "/api/meetings/"


def meeting_url(pk):
    return f"/api/meetings/{pk}/"


def future_dt():
    return (datetime.now(tz=timezone.utc) + timedelta(days=3)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


# ── Создание встречи ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeetingCreate:

    def test_supervisor_creates_meeting(self, api_client, supervisor, project):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "project": project.id,
            "title": "Консультация",
            "datetime": future_dt(),
            "duration_minutes": 60,
            "location": "ауд. 301",
            "timezone": "Europe/Moscow",
            "notes": "",
            "status": MeetingStatus.PLANNED,
        }
        response = api_client.post(MEETINGS_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Meeting.objects.filter(title="Консультация").exists()
        meeting = Meeting.objects.get(title="Консультация")
        assert meeting.organizer == supervisor

    def test_student_creates_meeting_for_own_project(
        self, api_client, student, project
    ):
        api_client.force_authenticate(user=student)
        payload = {
            "project": project.id,
            "title": "Встреча студента",
            "datetime": future_dt(),
            "duration_minutes": 30,
            "timezone": "UTC",
            "status": MeetingStatus.PLANNED,
        }
        response = api_client.post(MEETINGS_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_unauthenticated_cannot_create(self, api_client, project):
        payload = {
            "project": project.id,
            "title": "Тест",
            "datetime": future_dt(),
            "duration_minutes": 30,
            "timezone": "UTC",
        }
        response = api_client.post(MEETINGS_URL, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_timezone_returns_400(self, api_client, supervisor, project):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "project": project.id,
            "title": "Неверный TZ",
            "datetime": future_dt(),
            "duration_minutes": 60,
            "timezone": "Mars/Olympus",
        }
        response = api_client.post(MEETINGS_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ── Список встреч ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeetingList:

    @pytest.fixture
    def meeting(self, db, supervisor, project):
        return Meeting.objects.create(
            project=project,
            organizer=supervisor,
            title="Плановая встреча",
            datetime=datetime.now(tz=timezone.utc) + timedelta(days=1),
            duration_minutes=60,
            timezone="UTC",
            status=MeetingStatus.PLANNED,
        )

    def test_supervisor_sees_own_meetings(
        self, api_client, supervisor, meeting
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(MEETINGS_URL)
        assert response.status_code == status.HTTP_200_OK
        titles = [m["title"] for m in response.data]
        assert "Плановая встреча" in titles

    def test_student_sees_meetings_of_own_project(
        self, api_client, student, meeting
    ):
        api_client.force_authenticate(user=student)
        response = api_client.get(MEETINGS_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_foreign_user_does_not_see_meeting(
        self, api_client, student2, meeting
    ):
        api_client.force_authenticate(user=student2)
        response = api_client.get(MEETINGS_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [m["id"] for m in response.data]
        assert meeting.id not in ids

    def test_filter_by_project(self, api_client, supervisor, project, meeting):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(f"{MEETINGS_URL}?project={project.id}")
        assert response.status_code == status.HTTP_200_OK
        for m in response.data:
            assert m["project"] == project.id

    def test_filter_by_status(self, api_client, supervisor, meeting):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(f"{MEETINGS_URL}?status=PLANNED")
        assert response.status_code == status.HTTP_200_OK
        for m in response.data:
            assert m["status"] == "PLANNED"


# ── Обновление встречи ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeetingUpdate:

    @pytest.fixture
    def meeting(self, db, supervisor, project):
        return Meeting.objects.create(
            project=project,
            organizer=supervisor,
            title="Встреча для правки",
            datetime=datetime.now(tz=timezone.utc) + timedelta(days=2),
            duration_minutes=45,
            timezone="UTC",
            status=MeetingStatus.PLANNED,
        )

    def test_supervisor_updates_meeting(self, api_client, supervisor, meeting):
        api_client.force_authenticate(user=supervisor)
        response = api_client.patch(
            meeting_url(meeting.id), {"title": "Обновлённая встреча"}
        )
        assert response.status_code == status.HTTP_200_OK
        meeting.refresh_from_db()
        assert meeting.title == "Обновлённая встреча"

    def test_supervisor_updates_status_to_done(
        self, api_client, supervisor, meeting
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.patch(
            meeting_url(meeting.id), {"status": MeetingStatus.DONE}
        )
        assert response.status_code == status.HTTP_200_OK
        meeting.refresh_from_db()
        assert meeting.status == MeetingStatus.DONE

    def test_student_cannot_reschedule(self, api_client, student, meeting):
        api_client.force_authenticate(user=student)
        response = api_client.patch(
            meeting_url(meeting.id),
            {"datetime": future_dt()},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Удаление встречи ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeetingDelete:

    @pytest.fixture
    def meeting(self, db, supervisor, project):
        return Meeting.objects.create(
            project=project,
            organizer=supervisor,
            title="Встреча для удаления",
            datetime=datetime.now(tz=timezone.utc) + timedelta(days=5),
            duration_minutes=30,
            timezone="UTC",
            status=MeetingStatus.PLANNED,
        )

    def test_organizer_deletes_meeting(self, api_client, supervisor, meeting):
        api_client.force_authenticate(user=supervisor)
        response = api_client.delete(meeting_url(meeting.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Meeting.objects.filter(id=meeting.id).exists()

    def test_foreign_user_cannot_delete(self, api_client, student2, meeting):
        api_client.force_authenticate(user=student2)
        response = api_client.delete(meeting_url(meeting.id))
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        )
