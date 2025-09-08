from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    sql_host: str
    sql_port: int = 1433
    sql_user: str
    sql_password: str
    sql_database: str = 'OpsGraph'
    outbox_poll_ms: int = 2000
    api_sse_post_url: str | None = None
    webhook_url: str | None = None
    worker_user_id: int = 0

    class Config:
        env_file = '.env'

settings = Settings()
