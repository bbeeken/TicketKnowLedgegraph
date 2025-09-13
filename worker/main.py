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
    try:
        conn = pyodbc.connect(settings.db_dsn, autocommit=True)
        cursor = conn.cursor()
        cursor.execute("EXEC sys.sp_set_session_context @key=N'user_id', @value=?;", 'worker')
        cursor.execute("EXEC app.usp_Outbox_DequeueBatch")
        rows = cursor.fetchall()
        if rows:
            col_names = [d[0] for d in cursor.description]
            for row in rows:
                payload = {col_names[i]: row[i] for i in range(len(col_names))}
                log.info("Sending webhook", payload=payload)
                httpx.post(settings.webhook_url, json=payload, timeout=5.0)
        conn.close()
    except Exception as e:
        log.error("Error in dequeue_and_fanout", error=str(e))

scheduler = BackgroundScheduler()
scheduler.add_job(dequeue_and_fanout, 'interval', seconds=5)
scheduler.start()

@app.get("/health")
def health():
    return {"status": "ok"}
