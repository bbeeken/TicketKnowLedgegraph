import { describe, it, expect, beforeAll } from 'vitest';
import createServer from '../src/server';
import { getAdminToken } from '../__tests__/helpers';

describe('Privacy and RLS', () => {
  let token: string;
  let server: any;

  beforeAll(async () => {
    server = createServer();
    token = await getAdminToken(server);
  });

  it('creates ticket and lists with proper RLS access', async () => {
    // Create a ticket
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        summary: 'Privacy Test Ticket',
        description: 'Testing RLS privacy controls',
        category_id: 1,
        site_id: 1000,
        status: 'Open',
        severity: 2
      }
    });

    console.log('Create response:', createRes.statusCode, createRes.body);
    expect(createRes.statusCode).toBe(201);
    
    const created = createRes.json();
    expect(created.ticket_id).toBeDefined();
    console.log('Created ticket ID:', created.ticket_id);

    // List tickets - should include the one we just created
    const listRes = await server.inject({
      method: 'GET',
      url: '/api/tickets',
      headers: { authorization: `Bearer ${token}` }
    });

    console.log('List response:', listRes.statusCode, listRes.body);
    expect(listRes.statusCode).toBe(200);
    
    const tickets = listRes.json();
    console.log('Retrieved tickets:', tickets);
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeGreaterThan(0);
    
    // Should find our ticket in the list
    const ourTicket = tickets.find((t: any) => t.ticket_id === created.ticket_id);
    expect(ourTicket).toBeDefined();
    expect(ourTicket.summary).toBe('Privacy Test Ticket');
  });
});
