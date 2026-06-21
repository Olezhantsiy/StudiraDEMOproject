import io
from pathlib import Path

from django.core.files.base import ContentFile
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics

from Studira import settings


def generate_submission_report(submission, os=None):
    buffer = io.BytesIO()

    FONT_PATH = Path(settings.BASE_DIR) / "research" / "fonts" / "times.ttf"

    # проверка (очень полезно)
    if not FONT_PATH.exists():
        raise Exception(f"Font NOT FOUND: {FONT_PATH}")

    # ⚠️ КЛЮЧЕВАЯ СТРОКА
    pdfmetrics.registerFont(TTFont("TimesNewRoman", str(FONT_PATH)))

    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()

    task = submission.task
    stage = task.stage
    project = stage.project
    #username = user.first_name + user.last_name +user.middle_name

    normal_style = ParagraphStyle(
        "CustomNormal",
        parent=styles["Normal"],
        fontName="TimesNewRoman",
        fontSize=12,
    )

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontName="TimesNewRoman",
    )

    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontName="TimesNewRoman",
    )

    task = submission.task
    stage = task.stage
    project = stage.project

    elements = []

    elements.append(Paragraph("ОТЧЕТ ПО ВЫПОЛНЕНИЮ ЗАДАЧИ", title_style))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(f"<b>Проект:</b> {project.title}", normal_style))
    elements.append(Paragraph(f"<b>Этап:</b> {stage.name}", normal_style))
    elements.append(Paragraph(f"<b>Задача:</b> {task.title}", normal_style))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(
        f"<b>Студент:</b> {project.enrollment.student.get_full_name()}",
        normal_style
    ))
    elements.append(Paragraph(
        f"<b>Руководитель:</b> {project.supervisor.get_full_name()}",
        normal_style
    ))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(
        f"<b>Дата отправки:</b> {submission.created_at.strftime('%d.%m.%Y')}",
        normal_style
    ))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("<b>Ответ студента:</b>", heading_style))
    elements.append(Paragraph(submission.text or "-", normal_style))
    elements.append(Spacer(1, 40))

    elements.append(Paragraph("Подпись студента: ____________________", normal_style))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Подпись руководителя: ________________", normal_style))

    doc.build(elements)

    pdf = buffer.getvalue()
    buffer.close()

    filename = f"submission_report_{submission.id}.pdf"
    return ContentFile(pdf, filename)