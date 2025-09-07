import pyodbc
import structlog
from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
import httpx
from pydantic_settings import BaseSettings

log = structlog.get_logger()
app = FastAPI()

class Settings(BaseSettings):
    db_dsn: str
    webhook_url: str

settings = Settings()

def dequeue_and_fanout():
    conn = pyodbc.connect(settings.db_dsn, autocommit=True)
    cursor = conn.cursor()
    cursor.execute("EXEC sys.sp_set_session_context @key=N'user_id', @value=?;", 'worker')
    cursor.execute("EXEC app.usp_Outbox_DequeueBatch")
    rows = cursor.fetchall()
    for row in rows:
        httpx.post(settings.webhook_url, json=row._asdict())
    conn.close()

scheduler = BackgroundScheduler()
scheduler.add_job(dequeue_and_fanout, 'interval', seconds=5)
scheduler.start()

@app.get("/health")
def health():
    return {"status": "ok"}
