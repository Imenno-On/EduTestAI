from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class GeneratedForm(Base):
    __tablename__ = "generated_forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    published_url = Column(String(500), nullable=False)  # URL для прохождения теста
    edit_url = Column(String(500), nullable=False)  # URL для редактирования
    question_count = Column(Integer, default=0, nullable=False)
    original_text = Column(Text, nullable=True)  # Исходный текст, использованный для генерации
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связь с пользователем
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner = relationship("User", back_populates="generated_forms")

    def __repr__(self):
        return f"<GeneratedForm(id={self.id}, title={self.title})>"