"""Модель вложения (файла) к сгенерированному тесту."""
from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class TestAttachment(Base):
    __tablename__ = "test_attachments"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("generated_forms.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    s3_key = Column(String(500), nullable=False, unique=True)
    content_type = Column(String(100), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("GeneratedForm", back_populates="attachments")
