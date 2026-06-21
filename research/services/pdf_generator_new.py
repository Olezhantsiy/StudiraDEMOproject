import io
from pathlib import Path
from django.conf import settings
from django.core.files.base import ContentFile

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def generate_submission_report(submission):
    buffer = io.BytesIO()

    FONT_PATH = Path(settings.BASE_DIR) / "research" / "fonts" / "times.ttf"
    pdfmetrics.registerFont(TTFont("TimesNewRoman", str(FONT_PATH)))

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=30 * mm,
        rightMargin=10 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="Center14",
        fontName="TimesNewRoman",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
    ))

    styles.add(ParagraphStyle(
        name="Left14",
        fontName="TimesNewRoman",
        fontSize=14,
        leading=18,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        name="TitleCenter",
        fontName="TimesNewRoman",
        fontSize=16,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=20
    ))

    task = submission.task
    stage = task.stage
    project = stage.project

    elements = []

    elements.append(Paragraph(
        "...",
        styles["Center14"]
    ))
    elements.append(Paragraph(
        "Ростовский государственный экономический университет (РИНХ)",
        styles["Center14"]
    ))
    elements.append(Paragraph(
        "Факультет Компьютерных технологий и информационной безопасности",
        styles["Center14"]
    ))
    elements.append(Paragraph(
        "Кафедра информационных систем и прикладной информатики",
        styles["Center14"]
    ))
    elements.append(Spacer(1, 40))

    elements.append(Paragraph(
        "ОТЧЕТ ПО ВЫПОЛНЕНИЮ ЗАДАЧИ",
        styles["TitleCenter"]
    ))

    elements.append(Paragraph(f"<b>Проект:</b> {project.title}", styles["Left14"]))
    elements.append(Paragraph(f"<b>Этап:</b> {stage.name}", styles["Left14"]))
    elements.append(Paragraph(f"<b>Задача:</b> {task.title}", styles["Left14"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(
        f"<b>Студент:</b> {project.enrollment.student.get_full_name()}",
        styles["Left14"]
    ))
    elements.append(Paragraph(
        f"<b>Руководитель:</b> {project.supervisor.get_full_name()}",
        styles["Left14"]
    ))
    elements.append(Paragraph(
        f"<b>Дата:</b> {submission.created_at.strftime('%d.%m.%Y')}",
        styles["Left14"]
    ))

    elements.append(Spacer(1, 20))

    elements.append(Paragraph("<b>Ответ студента:</b>", styles["Left14"]))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(submission.text or "-", styles["Left14"]))

    elements.append(Spacer(1, 60))

    signatures = Table([
        ["Студент", "", project.enrollment.student.get_full_name()],
        ["Руководитель", "", project.supervisor.get_full_name()],
    ], colWidths=[60 * mm, 50 * mm, 70 * mm])

    signatures.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "TimesNewRoman"),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("LINEBELOW", (1, 0), (1, 1), 1, None),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))

    elements.append(signatures)

    doc.build(elements)

    pdf = buffer.getvalue()
    buffer.close()

    filename = f"submission_report_{submission.id}.pdf"
    return ContentFile(pdf, filename)