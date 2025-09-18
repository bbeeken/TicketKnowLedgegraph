import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import { cfg } from '../config';
import { withRls } from '../sql';

export async function registerAttachmentRoutes(fastify: FastifyInstance) {
  // Ensure upload dir exists
  const uploadDir = cfg.uploadDir || '/tmp/attachments';
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  } catch (e) {
    fastify.log.error({ err: e }, 'Failed to ensure upload dir');
  }

  fastify.register(require('@fastify/multipart'));

  // POST /tickets/:id/attachments
  fastify.post('/tickets/:id/attachments', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = (request.params as any) || {};
    const ticketId = Number(params.id);
    if (!ticketId) return reply.code(400).send({ error: 'Invalid ticket id' });

    // Expect multipart form with file (field 'file') and optional 'kind'
    const mp = await (request as any).file();
    if (!mp) return reply.code(400).send({ error: 'File required' });

    const filename = path.basename(mp.filename || 'upload.bin');
    // sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tmpName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}`;
    const tmpPath = path.join(uploadDir, `.tmp-${tmpName}`);
    const finalPath = path.join(uploadDir, tmpName);

    // stream to temp file while computing sha256 and size
    const hash = crypto.createHash('sha256');
    let size = 0;
    try {
      const writeStream = fs.createWriteStream(tmpPath, { flags: 'wx' });
      mp.file.on('data', (chunk: Buffer) => {
        hash.update(chunk);
        size += chunk.length;
      });
      await pipeline(mp.file, writeStream);
      const digest = hash.digest();
      // move temp to final
      await fs.promises.rename(tmpPath, finalPath);

      // simple mime inference from extension
      const ext = path.extname(safeName).slice(1).toLowerCase();
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';

      // Get kind from form fields, default to 'other' if not provided
      let kind = 'other';
      if (mp.fields && mp.fields.kind) {
        const kindValue = mp.fields.kind;
        kind = typeof kindValue === 'string' ? kindValue : 'other';
      }
      const uploadedBy = Number((request as any).user?.sub) || null;

      // Call stored proc within request transaction/connection (if available), otherwise use withRls fallback
      const sqlConn = (request as any).sqlConn;
      let res: any;
      if (sqlConn && typeof sqlConn.request === 'function') {
        const req = sqlConn.request();
        req.input('ticket_id', ticketId);
        req.input('uri', finalPath);
        req.input('kind', kind);
        req.input('mime_type', mimeType);
        req.input('size_bytes', size);
        req.input('content_sha256', digest);
        req.input('uploaded_by', uploadedBy);
        res = await req.execute('app.usp_AddAttachment');
      } else {
        fastify.log.warn('No request-bound SQL connection; using withRls fallback for attachment insert');
        const userId = Number((request as any).user?.sub) || 0;
        res = await withRls(userId, async (conn) => {
          const req = conn.request();
          req.input('ticket_id', ticketId);
          req.input('uri', finalPath);
          req.input('kind', kind || 'other');
          req.input('mime_type', mimeType);
          req.input('size_bytes', size);
          req.input('content_sha256', digest);
          req.input('uploaded_by', uploadedBy);
          return req.execute('app.usp_AddAttachment');
        });
      }

      const attachmentId = res.recordset && res.recordset[0] ? res.recordset[0].attachment_id : null;

      return reply.code(201).send({ attachment_id: attachmentId, uri: finalPath, size_bytes: size, mime_type: mimeType, content_sha256: digest.toString('hex') });
    } catch (err: any) {
      fastify.log.error({ err }, 'Attachment upload failed');
      // cleanup temp if exists
      try { if (await fs.promises.stat(tmpPath).then(() => true).catch(() => false)) await fs.promises.unlink(tmpPath); } catch (e) { /* ignore */ }
      
      // Check for duplicate content error
      if (err.number === 2601 && err.message && err.message.includes('UQ_Attachments_ContentSHA256')) {
        return reply.code(409).send({ 
          error: 'Duplicate file content', 
          message: 'A file with identical content has already been uploaded' 
        });
      }
      
      return reply.code(500).send({ error: 'Attachment upload failed' });
    }
  });

  // GET /tickets/:id/attachments - List attachments for a ticket
  fastify.get('/tickets/:id/attachments', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = (request.params as any) || {};
    const ticketId = Number(params.id);
    if (!ticketId) return reply.code(400).send({ error: 'Invalid ticket id' });

    const userId = Number((request as any).user?.sub) || 0;

    try {
      const rows = await withRls(userId, async (conn) => {
        const req = conn.request();
        req.input('ticket_id', ticketId);
        const res = await req.query(`
          SELECT 
            at.attachment_id,
            at.ticket_id,
            at.uri,
            at.kind,
            at.mime_type,
            at.size_bytes,
            at.content_sha256,
            at.uploaded_by,
            at.created_at as uploaded_at,
            u.name as uploaded_by_name
          FROM app.Attachments at
          LEFT JOIN app.Users u ON u.user_id = at.uploaded_by
          WHERE at.ticket_id = @ticket_id
          ORDER BY at.created_at DESC
        `);
        return res.recordset;
      });

      // Map to UI contract shape
      const result = (rows || []).map((r: any) => {
        const base = r?.uri ? path.basename(r.uri as string) : '';
        return {
          attachment_id: Number(r.attachment_id),
          ticket_id: Number(r.ticket_id),
          filename: base,
          original_filename: base,
          file_size: Number(r.size_bytes ?? 0),
          mime_type: r.mime_type || 'application/octet-stream',
          kind: r.kind || 'other',
          uploaded_by: Number(r.uploaded_by ?? 0),
          uploaded_by_name: r.uploaded_by_name ?? null,
          uploaded_at: r.uploaded_at,
        };
      });

      return reply.send(result);
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch attachments');
      return reply.code(500).send({ error: 'Failed to fetch attachments' });
    }
  });

  // GET /tickets/:ticketId/attachments/:attachmentId/download - Download an attachment
  fastify.get('/tickets/:ticketId/attachments/:attachmentId/download', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = (request.params as any) || {};
    const ticketId = Number(params.ticketId);
    const attachmentId = Number(params.attachmentId);
    if (!ticketId || !attachmentId) return reply.code(400).send({ error: 'Invalid ticket or attachment id' });

    const userId = Number((request as any).user?.sub) || 0;

    try {
      const attachment = await withRls(userId, async (conn) => {
        const req = conn.request();
        req.input('ticket_id', ticketId);
        req.input('attachment_id', attachmentId);
        const res = await req.query(`
          SELECT 
            attachment_id,
            uri,
            mime_type,
            size_bytes
          FROM app.Attachments 
          WHERE ticket_id = @ticket_id AND attachment_id = @attachment_id
        `);
        return res.recordset[0];
      });

      if (!attachment) {
        return reply.code(404).send({ error: 'Attachment not found' });
      }

      // Check if file exists
      try {
        await fs.promises.access(attachment.uri);
      } catch (e) {
        fastify.log.error({ uri: attachment.uri }, 'Attachment file not found on disk');
        return reply.code(404).send({ error: 'Attachment file not found' });
      }

      // Set headers for download
      const filename = `attachment_${attachment.attachment_id}`;
      reply.header('Content-Type', attachment.mime_type || 'application/octet-stream');
      reply.header('Content-Length', attachment.size_bytes);
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file
      const fileStream = fs.createReadStream(attachment.uri);
      return reply.send(fileStream);
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to download attachment');
      return reply.code(500).send({ error: 'Failed to download attachment' });
    }
  });

  // DELETE /tickets/:ticketId/attachments/:attachmentId - Delete an attachment
  fastify.delete('/tickets/:ticketId/attachments/:attachmentId', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = (request.params as any) || {};
    const ticketId = Number(params.ticketId);
    const attachmentId = Number(params.attachmentId);
    if (!ticketId || !attachmentId) return reply.code(400).send({ error: 'Invalid ticket or attachment id' });

    const userId = Number((request as any).user?.sub) || 0;

    try {
      const attachment = await withRls(userId, async (conn) => {
        const req = conn.request();
        req.input('ticket_id', ticketId);
        req.input('attachment_id', attachmentId);
        const res = await req.query(`
          SELECT uri FROM app.Attachments 
          WHERE ticket_id = @ticket_id AND attachment_id = @attachment_id
        `);
        return res.recordset[0];
      });

      if (!attachment) {
        return reply.code(404).send({ error: 'Attachment not found' });
      }

      // Delete from database
      await withRls(userId, async (conn) => {
        const req = conn.request();
        req.input('ticket_id', ticketId);
        req.input('attachment_id', attachmentId);
        await req.query(`
          DELETE FROM app.Attachments 
          WHERE ticket_id = @ticket_id AND attachment_id = @attachment_id
        `);
      });

      // Delete file from disk
      try {
        await fs.promises.unlink(attachment.uri);
      } catch (e) {
        fastify.log.warn({ uri: attachment.uri }, 'Failed to delete attachment file from disk');
        // Continue anyway - database record is deleted
      }

      return reply.send({ success: true });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to delete attachment');
      return reply.code(500).send({ error: 'Failed to delete attachment' });
    }
  });
}
