import time
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from .outbox import process_batch
from .settings import settings

logger = logging.getLogger('worker_jobs')

scheduler = BackgroundScheduler()

def start():
    scheduler.add_job(process_batch, 'interval', seconds=max(1,int(settings.outbox_poll_ms/1000)))
    # schedule cofail refresh every 2 minutes
    from .db import get_conn
    def refresh_cofails():
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute('EXEC kg.usp_RefreshCofailScores @site_id=NULL, @window_minutes=120')
            conn.commit()
        except Exception:
            conn.rollback()
        finally:
            conn.close()

    scheduler.add_job(refresh_cofails, 'interval', minutes=2)
    scheduler.start()
    logger.info('Worker jobs started')

if __name__ == '__main__':
    start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        scheduler.shutdown()
