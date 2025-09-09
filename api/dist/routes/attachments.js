"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAttachmentRoutes = registerAttachmentRoutes;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
async function registerAttachmentRoutes(fastify) {
    // Ensure upload dir exists
    const uploadDir = config_1.cfg.uploadDir || '/data/attachments';
    try {
        await fs_1.default.promises.mkdir(uploadDir, { recursive: true });
    }
    catch (e) {
        fastify.log.error({ err: e }, 'Failed to ensure upload dir');
    }
    fastify.register(require('@fastify/multipart'));
    // POST /tickets/:id/attachments
    fastify.post('/tickets/:id/attachments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const params = request.params || {};
        const ticketId = Number(params.id);
        if (!ticketId)
            return reply.code(400).send({ error: 'Invalid ticket id' });
        // Expect multipart form with file (field 'file') and optional 'kind'
        const mp = await request.file();
        if (!mp)
            return reply.code(400).send({ error: 'File required' });
        const filename = path_1.default.basename(mp.filename || 'upload.bin');
        // sanitize filename
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tmpName = `${Date.now()}-${crypto_1.default.randomBytes(6).toString('hex')}-${safeName}`;
        const tmpPath = path_1.default.join(uploadDir, `.tmp-${tmpName}`);
        const finalPath = path_1.default.join(uploadDir, tmpName);
        // stream to temp file while computing sha256 and size
        const hash = crypto_1.default.createHash('sha256');
        let size = 0;
        try {
            const writeStream = fs_1.default.createWriteStream(tmpPath, { flags: 'wx' });
            mp.file.on('data', (chunk) => {
                hash.update(chunk);
                size += chunk.length;
            });
            await (0, promises_1.pipeline)(mp.file, writeStream);
            const digest = hash.digest();
            // move temp to final
            await fs_1.default.promises.rename(tmpPath, finalPath);
            // simple mime inference from extension
            const ext = path_1.default.extname(safeName).slice(1).toLowerCase();
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
            const kind = (mp.fields && mp.fields.kind) || 'other';
            const uploadedBy = Number(request.user?.sub) || null;
            // Call stored proc within request transaction/connection
            const sqlConn = request.sqlConn;
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
        }
        catch (err) {
            fastify.log.error({ err }, 'Attachment upload failed');
            // cleanup temp if exists
            try {
                if (await fs_1.default.promises.stat(tmpPath).then(() => true).catch(() => false))
                    await fs_1.default.promises.unlink(tmpPath);
            }
            catch (e) { /* ignore */ }
            return reply.code(500).send({ error: 'Attachment upload failed' });
        }
    });
}
//# sourceMappingURL=attachments.js.map