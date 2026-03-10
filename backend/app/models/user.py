from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.roles import Role


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    role = Column(String(50), default=Role.USER.value, nullable=False)  # Роль пользователя
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связь с сгенерированными формами
    generated_forms = relationship("GeneratedForm", back_populates="owner", cascade="all, delete-orphan")

    # Refresh tokens for sessions
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

    def get_role(self) -> Role:
        """Получить роль пользователя как enum"""
        if not self.role:
            return Role.USER
        try:
            return Role(self.role)
        except ValueError:
            return Role.USER  # По умолчанию USER, если роль невалидна