import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import server from '../src/server';

describe('Tickets API', () => {
  it('should return open/in-progress tickets', async () => {
    const token = 'valid-jwt-token'; // mock or generate
    const res = await supertest(server.server)
      .get('/tickets')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
