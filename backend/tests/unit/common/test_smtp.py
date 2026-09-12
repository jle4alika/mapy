from __future__ import annotations

from infrastructure.smtp.repository import SmtpRepository


async def test_smtp_disabled_logs_only(monkeypatch) -> None:
    from core.config import settings

    monkeypatch.setattr(settings.smtp, "ENABLED", False)
    repo = SmtpRepository()
    await repo.send(to="a@b.c", subject="Hi", body="body")


async def test_smtp_enabled_calls_smtplib(monkeypatch) -> None:
    from unittest.mock import MagicMock, patch

    from core.config import settings

    monkeypatch.setattr(settings.smtp, "ENABLED", True)
    monkeypatch.setattr(settings.smtp, "HOST", "smtp.test")
    monkeypatch.setattr(settings.smtp, "PORT", 587)
    monkeypatch.setattr(settings.smtp, "USER", "u")
    monkeypatch.setattr(settings.smtp, "PASSWORD", "p")
    monkeypatch.setattr(settings.smtp, "FROM_EMAIL", "from@test")
    monkeypatch.setattr(settings.smtp, "USE_TLS", True)

    smtp_cm = MagicMock()
    client = MagicMock()
    smtp_cm.__enter__.return_value = client
    smtp_cm.__exit__.return_value = None

    with patch("infrastructure.smtp.repository.smtplib.SMTP", return_value=smtp_cm):
        await SmtpRepository().send(to="a@b.c", subject="Hi", body="hello")

    client.starttls.assert_called_once()
    client.login.assert_called_once_with("u", "p")
    client.send_message.assert_called_once()
