import secrets
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://edutest:edutest@localhost:5432/edutestai"
    alembic_database_url: Optional[str] = None
    frontend_public_url: str = "http://localhost:3000"
    backend_public_url: str = "http://localhost:8000"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "z-ai/glm-4.5-air:free"
    google_script_url: str = ""
    external_api_timeout_seconds: int = 30
    external_api_max_retries: int = 3
    external_api_concurrency_limit: int = 3
    jwt_secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(64))
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    sql_echo: bool = False

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

    @field_validator("jwt_secret_key", mode="before")
    @classmethod
    def normalize_jwt_secret_key(cls, value: str | None) -> str:
        if value is None:
            return secrets.token_urlsafe(64)
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized or normalized == "change-me-in-production":
                return secrets.token_urlsafe(64)
            return normalized
        return value

    @property
    def sync_database_url(self) -> str:
        if self.alembic_database_url:
            return self.alembic_database_url
        return self.database_url.replace("+asyncpg", "")


settings = Settings()