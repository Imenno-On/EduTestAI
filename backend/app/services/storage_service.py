"""Сервис работы с S3-совместимым хранилищем (MinIO)."""
import logging
import uuid
from typing import Optional

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".txt"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "text/plain",
}
MAX_SIZE_BYTES = settings.max_upload_size_mb * 1024 * 1024
PRE_SIGNED_EXPIRE = 3600  # 1 hour


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region or "us-east-1",
        config=BotoConfig(signature_version="s3v4"),
        use_ssl=settings.s3_use_ssl,
    )


def ensure_bucket() -> None:
    """Создать бакет, если не существует."""
    client = _get_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            client.create_bucket(Bucket=settings.s3_bucket)
            logger.info("Bucket %s created", settings.s3_bucket)
        else:
            raise


def validate_file(filename: str, content_type: str, size: int) -> None:
    """Проверить тип и размер файла. При ошибке — ValueError."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Недопустимый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}")
    if not content_type or content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Недопустимый тип файла. Разрешены: PDF, JPEG, PNG, GIF, TXT")
    if size > MAX_SIZE_BYTES:
        raise ValueError(f"Размер файла превышает {settings.max_upload_size_mb} МБ")


def generate_s3_key(form_id: int, filename: str) -> str:
    """Сгенерировать уникальный S3-ключ."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"tests/{form_id}/{uuid.uuid4().hex}.{ext}"


def upload_file(file_content: bytes, s3_key: str, content_type: str) -> None:
    """Загрузить файл в S3."""
    client = _get_client()
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=s3_key,
        Body=file_content,
        ContentType=content_type,
    )


def delete_file(s3_key: str) -> None:
    """Удалить файл из S3."""
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.s3_bucket, Key=s3_key)
    except ClientError as e:
        logger.warning("S3 delete failed for %s: %s", s3_key, e)


def get_presigned_download_url(s3_key: str, filename: str) -> str:
    """Вернуть pre-signed URL для скачивания."""
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": s3_key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=PRE_SIGNED_EXPIRE,
    )
