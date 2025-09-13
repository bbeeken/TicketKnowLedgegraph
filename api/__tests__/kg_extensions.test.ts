import { describe, it, expect, beforeAll } from 'vitest';
import createServer from '../src/server';
import { getPool } from '../src/sql';
import { ensureBaseTestData } from './helpers';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Helper to create auth header (assuming user id 1)
function authHeader() {
  const token = jwt.sign({ sub: 1 }, process.env.JWT_SECRET || 'testsecret'.repeat(4));
  return { authorization: `Bearer ${token}` };
}

describe('Knowledge Graph Extensions', () => {
  const server = createServer();
  let ticketId = 0;
  let token = '';

  beforeAll(async () => {
    const pool = await getPool();
    // Always apply KG scripts to ensure enhanced snippet proc is active
    const root = path.resolve(__dirname, '..', '..');
    const s22 = fs.readFileSync(path.join(root, '22_kg_extensions.sql'), 'utf8');
    const s23 = fs.readFileSync(path.join(root, '23_kg_extensions_seed.sql'), 'utf8');
    const s24Path = path.join(root, '24_kg_enhancements.sql');
    const s24 = fs.existsSync(s24Path) ? fs.readFileSync(s24Path, 'utf8') : '';
    const run = async (sql: string) => {
      for (const part of sql.split(/\bGO\b/gi).map(p=>p.trim()).filter(Boolean)) {
        try { 
          await pool.request().batch(part); 
        } catch(e:any) {
          const m=(e.message||'').toLowerCase();
          if (!(m.includes('already exists')||m.includes('there is already an object')||m.includes('duplicate key'))) {
            console.warn('SQL script execution warning:', e.message);
            // Don't throw - let test continue
          }
        }
      }
    };
    try {
      await run(s22); 
      await run(s23); 
      // Force apply script 24 (enhanced snippet proc) unconditionally
      if (s24) await run(s24);
    } catch (scriptError) {
      console.warn('KG script application failed:', scriptError);
      // Continue with test - scripts may already be applied
    }
    
    await ensureBaseTestData();
    const loginRes = await server.inject({ method:'POST', url:'/api/auth/local/signin', payload:{ email:'admin@coffeecup.com', password:'ChangeMe1!' } });
    if (loginRes.statusCode !== 200) throw new Error('Local signin failed for KG test: '+loginRes.body);
    token = loginRes.json().access_token || loginRes.json().token;
    // create a ticket via API to ensure kg.Ticket mirror
    const createRes = await server.inject({ method:'POST', url:'/api/tickets', headers:{ authorization:`Bearer ${token}` }, payload:{ summary:'KG Test Ticket', status:'Open', substatus_code:'awaiting_assignment', site_id:1000, category_id:1, severity:1, privacy_level:'public', watchers:[] } });
    if (createRes.statusCode !== 201) throw new Error('Ticket create failed for KG test: '+createRes.body);
    ticketId = createRes.json().ticket_id;
  });

  it('upserts knowledge snippet and links to ticket', async () => {
  const res = await server.inject({
      method: 'POST',
      url: '/api/kg/snippet',
      headers: { authorization:`Bearer ${token}` },
      payload: { source: 'manual', label: 'Test Snippet', content: 'Test content for KG', ticket_id: ticketId }
    });
    if (res.statusCode !== 200) {
      // eslint-disable-next-line no-console
      console.error('Snippet upsert failed:', res.body);
    }
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.snippet_id).toBeDefined();
  });

  it('retrieves ticket knowledge context', async () => {
  const res = await server.inject({
      method: 'GET',
      url: `/api/kg/ticket/${ticketId}/context`,
      headers: { authorization:`Bearer ${token}` },
    });
    if (res.statusCode !== 200) {
      // eslint-disable-next-line no-console
      console.error('Context fetch failed:', res.body);
    }
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticket_id).toBe(ticketId);
  });
});
