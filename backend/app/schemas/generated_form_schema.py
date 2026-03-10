from datetime import datetime
from pydantic import BaseModel, field_validator
import re
from typing import Optional, List, Generic, TypeVar

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    per_page: int
    total_pages: int


class GenerateTestRequest(BaseModel):
    text: str

    @field_validator("text")
    def validate_and_clean_text(cls, v: str) -> str:
        # Удаление нулевых байтов и опасных символов
        v = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", v)

        # Нормализация переносов строк
        v = v.replace("\r\n", "\n").replace("\r", "\n")

        # Замена табов на пробелы
        v = v.replace("\t", "    ")

        # Очистка пробелов в каждой строке
        lines = [line.strip() for line in v.split("\n")]
        v = "\n".join(lines)

        # Сжатие пустых строк
        v = re.sub(r"\n{3,}", "\n\n", v)

        # Ограничение длины
        max_length = 10000
        if len(v) > max_length:
            raise ValueError(f"Текст слишком длинный. Максимум {max_length} символов.")

        return v.strip()


class GeneratedFormRead(BaseModel):
    id: int
    published_url: str  # Используем str вместо HttpUrl для совместимости
    edit_url: str  # Используем str вместо HttpUrl для совместимости
    question_count: Optional[int] = 0  # Может быть None в старых записях
    title: str
    created_at: datetime
    # Информация о владельце (заполняется только для admin, для остальных ролей None)
    owner_id: Optional[int] = None
    owner_email: Optional[str] = None
    owner_full_name: Optional[str] = None

    class Config:
        from_attributes = True


class GeneratedFormUpdate(BaseModel):
    title: Optional[str] = None


class TestAttachmentRead(BaseModel):
    id: int
    form_id: int
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True


class TestAttachmentWithUrl(BaseModel):
    id: int
    form_id: int
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
    download_url: str
