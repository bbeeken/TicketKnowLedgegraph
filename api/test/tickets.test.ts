import { describe, it, expect } from 'vitest';
import server from '../src/server';

describe('Tickets API (integration placeholder)', () => {
  it.skip('lists tickets (requires seeded auth + DB)', async () => {
    const app = server();
    const res = await app.inject({ method: 'GET', url: '/api/tickets', headers: { authorization: 'Bearer REPLACE' } });
    expect(res.statusCode).toBe(200);
  });
});
