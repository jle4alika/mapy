"""
Хеширование паролей (passlib/bcrypt).

Основная аутентификация — fastapi-users (pwdlib/argon2 в UserManager).
Модуль оставлен для кастомных сценариев вне fastapi-users.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from passlib.context import CryptContext


class HashingService(ABC):
    """Абстракция сервиса хеширования на базе passlib."""

    def __init__(self, schemes: list[str] | None = None) -> None:
        scheme_list = schemes if schemes is not None else ["bcrypt"]
        self.pwd_context = CryptContext(schemes=scheme_list, deprecated="auto")

    @abstractmethod
    async def get_hash(self, plain: str) -> str: ...

    @abstractmethod
    async def verify_hashes(self, plain: str, hashed: str) -> bool: ...


class PasswordHashingService(HashingService):
    """Bcrypt-хеширование паролей."""

    async def get_hash(self, password: str) -> str:
        return self.pwd_context.hash(password)

    async def verify_hashes(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)


password_hasher = PasswordHashingService()
