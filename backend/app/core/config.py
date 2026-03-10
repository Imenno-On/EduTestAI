from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://edutest:edutest@localhost:5432/edutestai"

    # S3 / MinIO
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "edutestai-files"
    s3_region: Optional[str] = None
    s3_use_ssl: bool = False

    # File limits
    max_upload_size_mb: int = 10
    allowed_content_types: str = "application/pdf,image/jpeg,image/png,image/gif,text/plain,.pdf,.jpg,.jpeg,.png,.gif,.txt"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()