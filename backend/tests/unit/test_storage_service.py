import pytest

from app.services import storage_service


@pytest.mark.unit
def test_validate_file_accepts_supported_text_file():
    storage_service.validate_file("lesson.txt", "text/plain", 128)


@pytest.mark.unit
def test_validate_file_rejects_unsupported_extension():
    with pytest.raises(ValueError, match="Недопустимый тип файла"):
        storage_service.validate_file("archive.exe", "application/octet-stream", 128)


@pytest.mark.unit
def test_validate_file_rejects_oversized_file(monkeypatch):
    monkeypatch.setattr(storage_service.settings, "max_upload_size_mb", 1)
    monkeypatch.setattr(storage_service, "MAX_SIZE_BYTES", 1024 * 1024)

    with pytest.raises(ValueError, match="Размер файла превышает 1 МБ"):
        storage_service.validate_file("lesson.txt", "text/plain", 1024 * 1024 + 1)
