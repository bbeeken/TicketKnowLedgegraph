import time
import json
import logging
from .db import get_conn
from .settings import settings
import httpx

logger = logging.getLogger('outbox')

def process_batch():
    conn = get_conn()
    try:
        cur = conn.cursor()
        # set session context for worker
        cur.execute("EXEC sys.sp_set_session_context @key=N'user_id', @value=?", settings.worker_user_id)
        conn.commit()
        # call stored proc to dequeue batch
        cur.execute("EXEC app.usp_Outbox_DequeueBatch @batch_size=10")
        rows = cur.fetchall()
        for row in rows:
            try:
                event_id = row.event_id
                event_type = row.event_type
                payload = json.loads(row.payload)
                # POST to internal API SSE fan-in if configured
                if settings.api_sse_post_url:
                    httpx.post(settings.api_sse_post_url, json={'event_type': event_type, 'payload': payload}, timeout=10)
                # mark published - depends on proc implementation; here assume proc marks published
            except Exception as e:
                logger.exception('Failed to process outbox row %s', row)
        conn.commit()
    except Exception as e:
        logger.exception('Outbox processing failed')
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    while True:
        process_batch()
        time.sleep(settings.outbox_poll_ms / 1000.0)
