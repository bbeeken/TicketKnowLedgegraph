import json
import logging
import time
from typing import Any, Dict, List, Optional

import pyodbc
import httpx
from .db import get_conn
from .settings import settings

logger = logging.getLogger('outbox_worker')

# Exponential backoff helper
def backoff(attempt: int) -> float:
    return min(60.0, (2 ** attempt) + (0.5 * attempt))


def process_batch_once(batch_size: int = 25) -> int:
    """Process one batch from the Outbox. Returns number of rows processed."""
    conn = get_conn()
    try:
        cur = conn.cursor()
        # set session context for worker
        try:
            cur.execute("EXEC sys.sp_set_session_context @key=N'user_id', @value=?", settings.worker_user_id)
            conn.commit()
        except Exception:
            # session context set failure should not block; log and continue
            logger.exception('Failed to set session context')
            conn.rollback()

        # Call dequeue proc which marks rows as published and returns them
        cur.execute("EXEC app.usp_Outbox_DequeueBatch @batch_size=?", batch_size)
        rows = cur.fetchall()
        if not rows:
            conn.close()
            return 0

        # Process each row sequentially; the dequeue proc already set published=1
        for row in rows:
            try:
                event_id = getattr(row, 'event_id', None)
                aggregate = getattr(row, 'aggregate', None)
                aggregate_id = getattr(row, 'aggregate_id', None)
                etype = getattr(row, 'type', None)
                payload = getattr(row, 'payload', None)

                data = json.loads(payload) if payload else {}

                # If API fan-in is configured, POST to it; else, try to publish to configured WEBHOOK_URL
                if settings.api_sse_post_url:
                    try:
                        r = httpx.post(settings.api_sse_post_url, json={'event_type': etype, 'payload': data}, timeout=10)
                        r.raise_for_status()
                    except Exception:
                        logger.exception('Failed to post to api_sse_post_url for event %s', event_id)
                        # revert published flag and increment try_count
                        cur.execute("UPDATE app.Outbox SET published=0, try_count = try_count + 1 WHERE event_id = ?", event_id)
                        conn.commit()
                        continue
                elif settings.webhook_url:
                    try:
                        r = httpx.post(settings.webhook_url, json={'event_type': etype, 'payload': data}, timeout=10)
                        r.raise_for_status()
                    except Exception:
                        logger.exception('Failed to post to webhook for event %s', event_id)
                        cur.execute("UPDATE app.Outbox SET published=0, try_count = try_count + 1 WHERE event_id = ?", event_id)
                        conn.commit()
                        continue
                else:
                    # No target configured — write IntegrationErrors and continue
                    cur.execute("INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at) VALUES (?, ?, ?, ?, SYSUTCDATETIME())",
                                'outbox_worker', str(event_id), 'no target configured', str({'type': etype}))
                    conn.commit()
                    continue

                # If we reach here, event processed successfully; optionally insert a published marker
                logger.info('Processed outbox event %s type=%s', event_id, etype)

            except Exception:
                logger.exception('Failed processing outbox row, marking for retry')
                try:
                    cur.execute("UPDATE app.Outbox SET published=0, try_count = try_count + 1 WHERE event_id = ?", getattr(row, 'event_id', None))
                    conn.commit()
                except Exception:
                    conn.rollback()
        conn.close()
        return len(rows)
    except Exception:
        logger.exception('Outbox batch processing failed')
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()
        return 0


async def run_loop(poll_seconds: float = 2.0):
    attempt = 0
    while True:
        try:
            processed = process_batch_once()
            if processed == 0:
                # no work — sleep poll interval
                await asyncio.sleep(poll_seconds)
                attempt = 0
            else:
                # got work, reset attempt
                attempt = 0
        except Exception:
            logger.exception('Outbox worker loop error')
            await asyncio.sleep(backoff(attempt))
            attempt += 1


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    try:
        import asyncio

        asyncio.run(run_loop(settings.outbox_poll_ms / 1000.0))
    except KeyboardInterrupt:
        logger.info('Outbox worker stopped')
