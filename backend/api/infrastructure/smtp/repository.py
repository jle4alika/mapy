"""
SMTP-репозиторий: отправка писем (инфраструктурный адаптер).
"""

from __future__ import annotations

import asyncio
import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class AbstractSmtpRepository(ABC):
    """Порт отправки email."""

    @abstractmethod
    async def send(
        self,
        *,
        to: str,
        subject: str,
        body: str,
        html: str | None = None,
    ) -> None: ...


class SmtpRepository(AbstractSmtpRepository):
    """
    Репозиторий SMTP на stdlib smtplib.

    Если SMTP_ENABLED=false — письмо только логируется (dev/тест).
    """

    async def send(
        self,
        *,
        to: str,
        subject: str,
        body: str,
        html: str | None = None,
    ) -> None:
        if not settings.smtp.ENABLED:
            logger.info(
                "SMTP disabled: to=%s subject=%s body=%s",
                to,
                subject,
                body[:200],
            )
            return

        message = EmailMessage()
        message["From"] = settings.smtp.FROM_EMAIL
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        if html:
            message.add_alternative(html, subtype="html")

        await asyncio.to_thread(self._send_sync, message)

    def _send_sync(self, message: EmailMessage) -> None:
        smtp = settings.smtp
        with smtplib.SMTP(smtp.HOST, smtp.PORT, timeout=smtp.TIMEOUT) as client:
            if smtp.USE_TLS:
                client.starttls()
            if smtp.USER:
                client.login(smtp.USER, smtp.PASSWORD)
            client.send_message(message)
            logger.info("SMTP sent to=%s subject=%s", message["To"], message["Subject"])


smtp_repository = SmtpRepository()


def get_smtp_repository() -> AbstractSmtpRepository:
    """FastAPI Depends: порт SMTP."""

    return smtp_repository
