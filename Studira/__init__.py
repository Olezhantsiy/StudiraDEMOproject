# Это гарантирует, что Celery-приложение загружается вместе с Django.
# Без этого @shared_task не будет знать о нашем приложении.
from .celery import app as celery_app

__all__ = ("celery_app",)
