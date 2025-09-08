import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import { cfg } from '../config';

export async function registerAttachmentRoutes(fastify: FastifyInstance) {
  // Ensure upload dir exists
  const uploadDir = cfg.uploadDir || '/data/attachments';
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

      const kind = (mp.fields && (mp.fields.kind as string)) || 'other';
      const uploadedBy = Number((request as any).user?.sub) || null;

      // Call stored proc within request transaction/connection
      const sqlConn = (request as any).sqlConn;
      if (!sqlConn || typeof sqlConn.request !== 'function') {
        // Fallback: use global pool but that's not recommended for RLS
        fastify.log.warn('No request-bound SQL connection available for attachment insert');
        return reply.code(500).send({ error: 'Server not configured for transactional upload' });
      }

      const req = sqlConn.request();
      req.input('ticket_id', ticketId);
      req.input('uri', finalPath);
      req.input('kind', kind);
      req.input('mime_type', mimeType);
      req.input('size_bytes', size);
      req.input('content_sha256', digest);
      req.input('uploaded_by', uploadedBy);

      const res = await req.execute('app.usp_AddAttachment');
      const attachmentId = res.recordset && res.recordset[0] ? res.recordset[0].attachment_id : null;

      return reply.code(201).send({ attachment_id: attachmentId, uri: finalPath, size_bytes: size, mime_type: mimeType, content_sha256: digest.toString('hex') });
    } catch (err: any) {
      fastify.log.error({ err }, 'Attachment upload failed');
      // cleanup temp if exists
      try { if (await fs.promises.stat(tmpPath).then(() => true).catch(() => false)) await fs.promises.unlink(tmpPath); } catch (e) { /* ignore */ }
      return reply.code(500).send({ error: 'Attachment upload failed' });
    }
  });
}
