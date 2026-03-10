from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://edutest:edutest@localhost:5432/edutestai"

settings = Settings()