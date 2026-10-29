from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Medigurdian AI"
    environment: str = "development"

    # Keep this for the existing project structure.
    # We will migrate database modules to Supabase step-by-step.
    database_url: str = "sqlite:///./medigurdian.db"

    # Supabase
    supabase_url: str
    supabase_publishable_key: str

    # Server-only admin key. Used for private report storage operations.
    # Never expose this value to the frontend or any VITE_* variable.
    supabase_service_role_key: str | None = None

    # AI
    llm_provider: str = "mock"
    llm_model: str = "llama3"

    # Frontend
    cors_origins: str = "http://localhost:5173"

    # Storage
    upload_dir: str = "uploads"
    chroma_dir: str = "chroma_db"

    # Medical Reports
    report_storage_bucket: str = "medical-reports"
    report_max_file_size_bytes: int = 10 * 1024 * 1024
    report_analysis_llm_enabled: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()