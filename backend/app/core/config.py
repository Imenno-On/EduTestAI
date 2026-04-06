from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://edutest:edutest@localhost:5432/edutestai"
    frontend_public_url: str = "http://localhost:5173"
    backend_public_url: str = "http://localhost:8000"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "z-ai/glm-4.5-air:free"
    google_script_url: str = ""
    external_api_timeout_seconds: int = 30
    external_api_max_retries: int = 3
    external_api_concurrency_limit: int = 3

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