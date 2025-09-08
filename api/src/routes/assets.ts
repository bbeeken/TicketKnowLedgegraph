import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { withRls } from '../sql';
import { cfg } from '../config';

function getRequestFromContext(request: FastifyRequest) {
  const sqlConn = (request as any).sqlConn;
  if (sqlConn && typeof sqlConn.request === 'function') return sqlConn.request();
  return null;
}

export async function registerAssetRoutes(fastify: FastifyInstance) {
  const uploadDir = cfg.uploadDir || '/data/attachments';
  try { await fs.promises.mkdir(uploadDir, { recursive: true }); } catch (e) { fastify.log.warn('Could not ensure uploadDir', e); }

  // Create or update asset
  fastify.post('/assets', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any || {};
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const payload = {
      asset_id: body.asset_id,
      site_id: body.site_id,
      zone_id: body.zone_id || null,
      type: body.type,
      model: body.model || null,
      vendor_id: body.vendor_id || null,
      serial: body.serial || null,
      location: body.location || null,
      purchase_date: body.purchase_date || null,
      warranty_until: body.warranty_until || null
    };

    try {
      const localReq = getRequestFromContext(request);
      if (localReq) {
        const req = localReq;
        req.input('asset_id', payload.asset_id);
        req.input('site_id', payload.site_id);
        req.input('zone_id', payload.zone_id);
        req.input('type', payload.type);
        req.input('model', payload.model);
        req.input('vendor_id', payload.vendor_id);
        req.input('serial', payload.serial);
        req.input('location', payload.location);
        req.input('purchase_date', payload.purchase_date);
        req.input('warranty_until', payload.warranty_until);
        const res = await req.execute('app.usp_CreateAsset');
        const out = res.recordset && res.recordset[0] ? res.recordset[0].asset_id : payload.asset_id;
        return reply.code(201).send({ asset_id: out });
      }

      const out = await withRls(userId, async (conn) => {
        const r = await conn.request()
          .input('asset_id', payload.asset_id)
          .input('site_id', payload.site_id)
          .input('zone_id', payload.zone_id)
          .input('type', payload.type)
          .input('model', payload.model)
          .input('vendor_id', payload.vendor_id)
          .input('serial', payload.serial)
          .input('location', payload.location)
          .input('purchase_date', payload.purchase_date)
          .input('warranty_until', payload.warranty_until)
          .execute('app.usp_CreateAsset');
        return r.recordset && r.recordset[0] ? r.recordset[0].asset_id : payload.asset_id;
      });
      return reply.code(201).send({ asset_id: out });
    } catch (err) {
      fastify.log.error({ err }, 'Failed to create/update asset');
      return reply.code(500).send({ error: 'Failed to create/update asset' });
    }
  });

  // Get asset detail with images and maintenance
  fastify.get('/assets/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const id = Number((request.params as any).id);
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const localReq = getRequestFromContext(request);
      const sql = `SELECT a.*, v.name AS vendor_name FROM app.Assets a LEFT JOIN app.Vendors v ON v.vendor_id = a.vendor_id WHERE a.asset_id = @id`;
      let res: any;
      if (localReq) res = await localReq.input('id', id).query(sql);
      else res = await withRls(userId, async (conn) => conn.request().input('id', id).query(sql));
      const row = res.recordset[0];
      if (!row) return reply.code(404).send({ error: 'Not found' });
      // images
      const imgsSql = `SELECT image_id, uri, mime_type, size_bytes, uploaded_by, uploaded_at FROM app.AssetImages WHERE asset_id = @id`;
      let imgsRes: any;
      if (localReq) imgsRes = await localReq.input('id', id).query(imgsSql);
      else imgsRes = await withRls(userId, async (conn) => conn.request().input('id', id).query(imgsSql));
      row.images = imgsRes.recordset;
      return row;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch asset');
      return reply.code(500).send({ error: 'Failed to fetch asset' });
    }
  });

  // POST /assets/:id/images - upload image for asset
  fastify.post('/assets/:id/images', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const id = Number((request.params as any).id);
    const userId = Number((request as any).user?.sub);
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const mp = await (request as any).file();
    if (!mp) return reply.code(400).send({ error: 'file required' });

    const filename = path.basename(mp.filename || `asset-${id}.bin`).replace(/[^a-zA-Z0-9._-]/g,'_');
    const tmp = path.join(uploadDir, `.tmp-${Date.now()}-${filename}`);
    const final = path.join(uploadDir, `${Date.now()}-${filename}`);

    const hash = crypto.createHash('sha256');
    let size = 0;
    try {
      const ws = fs.createWriteStream(tmp, { flags: 'wx' });
      mp.file.on('data', (chunk: Buffer) => { hash.update(chunk); size += chunk.length; });
      await mp.toBuffer ? (async () => { const buf = await mp.toBuffer(); hash.update(buf); size = buf.length; await fs.promises.writeFile(tmp, buf); })() : new Promise((res, rej) => mp.file.pipe(ws).on('finish', res).on('error', rej));
      const digest = hash.digest();
      await fs.promises.rename(tmp, final);

      const ext = path.extname(filename).slice(1).toLowerCase();
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'application/octet-stream';

      const localReq = getRequestFromContext(request);
      if (!localReq) return reply.code(500).send({ error: 'No request SQL context for transactional image insert' });
      const req = localReq;
      req.input('asset_id', id);
      req.input('uri', final);
      req.input('mime_type', mimeType);
      req.input('size_bytes', size);
      req.input('sha256', digest);
      req.input('uploaded_by', userId);
      const res = await req.execute('app.usp_AddAssetImage');
      const imageId = res.recordset && res.recordset[0] ? res.recordset[0].image_id : null;
      return reply.code(201).send({ image_id: imageId, uri: final, size_bytes: size, mime_type: mimeType });
    } catch (err) {
      fastify.log.error({ err }, 'Asset image upload failed');
      try { if (await fs.promises.stat(tmp).then(()=>true).catch(()=>false)) await fs.promises.unlink(tmp); } catch(e){}
      return reply.code(500).send({ error: 'Upload failed' });
    }
  });

  // POST /assets/:id/maintenance - schedule maintenance
  fastify.post('/assets/:id/maintenance', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const id = Number((request.params as any).id);
    const body = request.body as any || {};
    const userId = Number((request as any).user?.sub);
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const localReq = getRequestFromContext(request);
      const when = body.scheduled_at || null;
      const notes = body.notes || null;
      if (!localReq) return reply.code(500).send({ error: 'No request-bound SQL connection' });
      const req = localReq;
      req.input('asset_id', id);
      req.input('scheduled_at', when);
      req.input('performed_by', null);
      req.input('notes', notes);
      const res = await req.execute('app.usp_RegisterMaintenance');
      const mid = res.recordset && res.recordset[0] ? res.recordset[0].maintenance_id : null;
      return reply.code(201).send({ maintenance_id: mid });
    } catch (err) {
      fastify.log.error({ err }, 'Failed to register maintenance');
      return reply.code(500).send({ error: 'Failed to register maintenance' });
    }
  });
}
