// This is a small helper for tests to simulate enqueuing outbox events
import { getPool } from '../sql';

export async function enqueueOutboxEvent(eventType: string, payload: any) {
  const pool = await getPool();
  const req = pool.request();
  req.input('event_type', eventType);
  req.input('payload', JSON.stringify(payload));
  await req.query(`INSERT INTO app.Outbox (event_type, payload, created_at) VALUES (@event_type, @payload, SYSUTCDATETIME())`);
}
