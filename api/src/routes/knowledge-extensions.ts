import { FastifyInstance } from 'fastify';
import * as mssql from 'mssql';
import { safeQuery, getPool } from '../sql';

// Helper to run proc with params
async function execProc(proc: string, params: Record<string, any>) {
  const pool = await getPool();
  const request = pool.request();
  Object.entries(params).forEach(([k,v]) => {
    if (v === undefined) return;
    request.input(k, v as any);
  });
  return request.execute(proc);
}

export async function knowledgeExtensionsRoutes(app: FastifyInstance) {
  app.post('/api/kg/document', {
    schema: { body: {
      type: 'object',
      required: ['source_system','external_key','title'],
      properties: {
        source_system: { type: 'string' },
        external_key: { type: 'string' },
        title: { type: 'string' },
        mime_type: { type: 'string' },
        summary: { type: 'string' },
        hash: { type: 'string' },
        ticket_id: { type: 'integer' },
        asset_id: { type: 'integer' }
      }
    }}
  }, async (req, reply) => {
    try {
      const body:any = req.body;
      const r = await execProc('kg.usp_UpsertDocumentAndLink', body);
      reply.send(r.recordset?.[0] || { ok: true });
    } catch (err:any) {
      req.log.error({ err }, 'document upsert failed');
      reply.code(500).send({ error: 'document_upsert_failed', message: err.message });
    }
  });

  app.post('/api/kg/invoice', { schema: { body: {
    type: 'object', required: ['invoice_number','invoice_date'], properties: {
      invoice_number:{type:'string'}, invoice_date:{type:'string'}, total_amount:{type:'number'}, currency:{type:'string'}, status:{type:'string'}, vendor_id:{type:'integer'}, ticket_id:{type:'integer'}
    }}}}, async (req, reply) => {
  try {
    const r = await execProc('kg.usp_UpsertInvoiceAndLink', req.body as any);
    reply.send(r.recordset?.[0] || { ok: true });
  } catch (err:any) {
    req.log.error({ err }, 'invoice upsert failed');
    reply.code(500).send({ error: 'invoice_upsert_failed', message: err.message });
  }
  });

  app.post('/api/kg/remote-session', { schema: { body: {
    type: 'object', required: ['provider','session_code','started_at'], properties: {
      provider:{type:'string'}, session_code:{type:'string'}, started_at:{type:'string'}, ended_at:{type:'string'}, technician:{type:'string'}, outcome:{type:'string'}, ticket_id:{type:'integer'}, asset_id:{type:'integer'}
    }}}}, async (req, reply) => {
  try {
    const r = await execProc('kg.usp_UpsertRemoteSessionAndLink', req.body as any);
    reply.send(r.recordset?.[0] || { ok: true });
  } catch (err:any) {
    req.log.error({ err }, 'remote session upsert failed');
    reply.code(500).send({ error: 'remote_session_upsert_failed', message: err.message });
  }
  });

  app.post('/api/kg/external-file', { schema: { body: {
    type:'object', required:['system','external_path'], properties: {
      system:{type:'string'}, external_path:{type:'string'}, title:{type:'string'}, file_type:{type:'string'}, ticket_id:{type:'integer'}, asset_id:{type:'integer'}
    }}}}, async (req, reply) => {
  try {
    const r = await execProc('kg.usp_LinkExternalFile', req.body as any);
    reply.send(r.recordset?.[0] || { ok: true });
  } catch (err:any) {
    req.log.error({ err }, 'external file link failed');
    reply.code(500).send({ error: 'external_file_link_failed', message: err.message });
  }
  });

  app.post('/api/kg/snippet', { schema: { body: {
    type:'object', required:['source','content'], properties: {
      source:{type:'string'}, label:{type:'string'}, content:{type:'string'}, ticket_id:{type:'integer'}, asset_id:{type:'integer'}, document_id:{type:'integer'}
    }}}}, async (req, reply) => {
  try {
    const body:any = req.body;
  const r = await execProc('kg.usp_UpsertKnowledgeSnippet', body);
    reply.send(r.recordset?.[0] || { ok: true });
  } catch (err:any) {
    req.log.error({ err }, 'snippet upsert failed');
    reply.code(500).send({ error: 'snippet_upsert_failed', message: err.message });
  }
  });

  app.get('/api/kg/ticket/:ticketId/context', async (req, reply) => {
    const { ticketId } = req.params as any;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('ticket_id', mssql.Int, ticketId);
    const r = await request.query('SELECT * FROM kg.vw_TicketKnowledgeContext WHERE ticket_id = @ticket_id');
    if (!r.recordset.length) return reply.code(404).send({ error: 'Not found' });
    reply.send(r.recordset[0]);
  } catch (err:any) {
    req.log.error({ err }, 'ticket context fetch failed');
    reply.code(500).send({ error: 'ticket_context_failed', message: err.message });
  }
  });
}

export default knowledgeExtensionsRoutes;
