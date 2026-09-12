"""SMTP: отправка почты."""

from infrastructure.smtp.repository import (
    AbstractSmtpRepository,
    SmtpRepository,
    get_smtp_repository,
    smtp_repository,
)

__all__ = [
    "AbstractSmtpRepository",
    "SmtpRepository",
    "get_smtp_repository",
    "smtp_repository",
]
