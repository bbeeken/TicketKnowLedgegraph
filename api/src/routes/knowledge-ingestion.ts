import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { withRls } from '../sql';
import formidable from 'formidable';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { cfg } from '../config';
import { embedText } from '../ai/embeddings';
import { isEnabled as qdrantEnabled, upsertPoints, search as qdrantSearch } from '../ai/vector/qdrant';

// Types for knowledge ingestion
interface DocumentMetadata {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  relatedTo: {
    type: 'ticket' | 'asset' | 'vendor' | 'site';
    id: number;
  };
}

interface ProcessingResult {
  documentId: bigint;
  snippets: Array<{
    snippetId: bigint;
    content: string;
    embedding?: Float32Array;
  }>;
  extractedText?: string;
  imageAnalysis?: string;
}

export async function registerKnowledgeIngestionRoutes(fastify: FastifyInstance) {
  const uploadDir = cfg.uploadDir || '/data/attachments';
  
  // Ensure upload directory exists
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (e) {
    fastify.log.warn({ err: e }, 'Could not ensure uploadDir');
  }

  // Upload and process document/image with knowledge extraction
  fastify.post('/knowledge/ingest', { 
    preHandler: [fastify.authenticate],
    schema: {
      consumes: ['multipart/form-data'],
      description: 'Upload and process documents/images for knowledge extraction'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      // Parse multipart form data
      const form = formidable({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB limit
        multiples: false
      });

      const [fields, files] = await form.parse(request.raw);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const metadataStr = Array.isArray(fields.metadata) ? fields.metadata[0] : fields.metadata;

      if (!file || !metadataStr) {
        return reply.code(400).send({ error: 'File and metadata required' });
      }

      // Validate metadata
      const metadataSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        relatedTo: z.object({
          type: z.enum(['ticket', 'asset', 'vendor', 'site']),
          id: z.number()
        })
      });

      const metadata = metadataSchema.parse(JSON.parse(metadataStr));

      // Calculate file hash
      const fileBuffer = await fs.readFile(file.filepath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Determine MIME type and processing strategy
      const mimeType = file.mimetype || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isDocument = mimeType.includes('pdf') || mimeType.includes('text') || 
                        mimeType.includes('document') || mimeType.includes('word');

      // Enforce allowlist (defensive) to avoid storing unsupported binary types without parsing logic
      const ALLOWED_MIME_PREFIXES = ['image/', 'text/'];
      const ALLOWED_MIME_EXACT = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]);
      const allowed = ALLOWED_MIME_PREFIXES.some(p => mimeType.startsWith(p)) || ALLOWED_MIME_EXACT.has(mimeType);
      if (!allowed) {
        return reply.code(415).send({ error: 'Unsupported media type', mime_type: mimeType });
      }

      // Process the file and extract knowledge
      const processingResult = await processFile(file, metadata, hash, mimeType, userId);

      // Store in database with knowledge graph relationships
      const result = await withRls(String(userId), async (conn) => {
        // 1. Create attachment record
        const attachmentResult = await conn.request()
          .input('ticket_id', metadata.relatedTo.type === 'ticket' ? metadata.relatedTo.id : null)
          .input('asset_id', metadata.relatedTo.type === 'asset' ? metadata.relatedTo.id : null)
          .input('vendor_id', metadata.relatedTo.type === 'vendor' ? metadata.relatedTo.id : null)
          .input('uri', file.filepath)
          .input('kind', isImage ? 'image' : 'document')
          .input('mime_type', mimeType)
          .input('size_bytes', file.size)
          .input('content_sha256', Buffer.from(hash, 'hex'))
          .input('uploaded_by', userId)
          .query(`
            INSERT INTO app.Attachments (ticket_id, asset_id, vendor_id, uri, kind, mime_type, size_bytes, content_sha256, uploaded_by, created_at)
            OUTPUT INSERTED.attachment_id
            VALUES (@ticket_id, @asset_id, @vendor_id, @uri, @kind, @mime_type, @size_bytes, @content_sha256, @uploaded_by, SYSUTCDATETIME())
          `);

        const attachmentId = attachmentResult.recordset[0].attachment_id;

        // 2. Create knowledge graph document node
        const documentResult = await conn.request()
          .input('source_system', 'attachment')
          .input('external_key', attachmentId.toString())
          .input('title', metadata.title)
          .input('mime_type', mimeType)
          .input('summary', metadata.description || `${metadata.title} - ${isImage ? 'Image' : 'Document'} attachment`)
          .input('hash', hash)
          .query(`
            INSERT INTO kg.Document (source_system, external_key, title, mime_type, summary, hash, created_at)
            OUTPUT INSERTED.document_id
            VALUES (@source_system, @external_key, @title, @mime_type, @summary, @hash, SYSUTCDATETIME())
          `);

  const documentId = documentResult.recordset[0].document_id;

        // 3. Create knowledge snippets from extracted content
  const snippetIds: number[] = [];
        const usingReal = !!process.env.OPENAI_API_KEY;
        const modelName = process.env.OPENAI_EMBED_MODEL || (usingReal ? 'text-embedding-3-small' : (process.env.OPENAI_EMBED_ALLOW_FALLBACK === 'true' ? 'mock-deterministic-512' : null));
        for (const snippet of processingResult.snippets) {
          const snippetResult = await conn.request()
            .input('source', `document:${documentId}`)
            .input('label', `${metadata.title} - Snippet`)
            .input('content', snippet.content)
            .input('embedding', snippet.embedding ? Buffer.from(snippet.embedding.buffer) : null)
            .input('embedding_model', modelName)
            .input('embedding_dim', snippet.embedding ? snippet.embedding.length : null)
            .query(`
              INSERT INTO kg.KnowledgeSnippet (source, label, content, embedding, embedding_model, embedding_dim, created_at)
              OUTPUT INSERTED.snippet_id
              VALUES (@source, @label, @content, @embedding, @embedding_model, @embedding_dim, SYSUTCDATETIME())
            `);
          snippetIds.push(snippetResult.recordset[0].snippet_id);
        }

        // Optional: Upsert to Qdrant vector store in a single batch (fire and forget)
        if (qdrantEnabled()) {
          try {
            const points = processingResult.snippets.map((s, idx) => ({
              id: snippetIds[idx],
              vector: s.embedding ? Array.from(s.embedding as any) : [],
              payload: {
                snippet_id: snippetIds[idx],
                document_id: Number(documentId),
                attachment_id: Number(attachmentId),
                ticket_id: metadata.relatedTo.type === 'ticket' ? metadata.relatedTo.id : null,
                asset_id: metadata.relatedTo.type === 'asset' ? metadata.relatedTo.id : null,
                site_id: null, // can be inferred via joins later if needed
                embedding_model: modelName || undefined,
                created_at: new Date().toISOString(),
                mime_type: mimeType,
                label: `${metadata.title} - Snippet`
              }
            })).filter(p => p.vector.length > 0);
            if (points.length) await upsertPoints(points as any);
          } catch (e) {
            fastify.log.warn({ err: e }, 'Qdrant upsert skipped');
          }
        }

        // Update embedding usage metrics (if embeddings were generated)
        if (processingResult.snippets.some(s => s.embedding)) {
          await conn.request()
            .input('model', modelName || 'unavailable')
            .input('provider', usingReal ? 'openai' : (process.env.OPENAI_EMBED_ALLOW_FALLBACK === 'true' ? 'mock' : 'none'))
            .input('vector_count', processingResult.snippets.filter(s => s.embedding).length)
            .input('tokens', null)
            .execute('kg.usp_UpsertEmbeddingUsage');
        }

        // 4. Create knowledge graph relationships
        await createKnowledgeGraphRelationships(conn, documentId, metadata, attachmentId);

        return {
          attachmentId,
          documentId,
          snippetIds,
          extractedText: processingResult.extractedText,
          imageAnalysis: processingResult.imageAnalysis
        };
      });

      return reply.code(201).send({
        success: true,
        attachment_id: result.attachmentId,
        document_id: result.documentId,
        snippet_count: result.snippetIds.length,
        extracted_text_length: result.extractedText?.length || 0,
        has_image_analysis: !!result.imageAnalysis
      });

    } catch (error) {
      fastify.log.error({ error }, 'Failed to ingest knowledge');
      return reply.code(500).send({ error: 'Failed to process knowledge ingestion' });
    }
  });

  // Search knowledge base with semantic similarity
  fastify.get('/knowledge/search', { 
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['all', 'documents', 'snippets'], default: 'all' },
          related_to: { type: 'string' },
          limit: { type: 'string', default: '10' },
          mode: { type: 'string', enum: ['keyword','semantic'], default: 'keyword' }
        },
        required: ['q']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { q, type = 'all', related_to, limit = '10', mode = 'keyword' } = (request.query as any);

    try {
      let results: any[] = [];

      if (mode === 'keyword') {
        const data = await withRls(String(userId), async (conn) => {
          let querySql = '';
          const r = conn.request().input('query', q).input('limit', parseInt(limit));
          if (type === 'documents' || type === 'all') {
            querySql += `
              SELECT 'document' as result_type, d.document_id as id, d.title, d.summary as content,
                     d.mime_type, d.created_at, NULL as similarity_score
              FROM kg.Document d
              WHERE d.title LIKE '%' + @query + '%' OR d.summary LIKE '%' + @query + '%'
            `;
          }
          if (type === 'all') querySql += ' UNION ALL ';
          if (type === 'snippets' || type === 'all') {
            querySql += `
              SELECT 'snippet' as result_type, ks.snippet_id as id, ks.label as title, ks.content,
                     'text/plain' as mime_type, ks.created_at, NULL as similarity_score
              FROM kg.KnowledgeSnippet ks
              WHERE ks.content LIKE '%' + @query + '%' OR ks.label LIKE '%' + @query + '%'
            `;
          }
          querySql += ` ORDER BY created_at DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
          const res = await r.query(querySql);
          return res.recordset;
        });
        results = data;
      } else {
        // semantic mode
        const queryEmbedding = await generateEmbedding(q);
        if (qdrantEnabled()) {
          const hits = await qdrantSearch(queryEmbedding, parseInt(limit));
          // fetch snippet details for hit IDs
          const ids = hits.map(h => h.id).filter(Boolean);
          const idList = ids.length ? ids.map(() => '?').join(',') : '';
          let rows: any[] = [];
          if (ids.length) {
            rows = await withRls(String(userId), async (conn) => {
              const res = await conn.request().query(`
                SELECT ks.snippet_id, ks.label, ks.content, ks.created_at
                FROM kg.KnowledgeSnippet ks
                WHERE ks.snippet_id IN (${ids.map((id:any)=>Number(id)).join(',')})`);
              return res.recordset;
            });
          }
          const byId: Record<string, any> = Object.fromEntries(rows.map(r => [String(r.snippet_id), r]));
          results = hits.map(h => {
            const r = byId[String(h.id)];
            if (!r) return null;
            return { result_type: 'snippet', id: r.snippet_id, title: r.label, content: r.content, mime_type: 'text/plain', created_at: r.created_at, similarity_score: h.score };
          }).filter(Boolean) as any[];
        } else {
          // fallback: fetch candidate snippets and score in-app
          const candidates = await withRls(String(userId), async (conn) => {
            const res = await conn.request()
              .input('limit', parseInt(limit) * 10)
              .query(`SELECT TOP (@limit) ks.snippet_id, ks.label, ks.content, ks.created_at, ks.embedding FROM kg.KnowledgeSnippet ks ORDER BY ks.created_at DESC`);
            return res.recordset;
          });
          results = candidates.map(c => {
            let sim: number | null = null;
              if (c.embedding) {
                try {
                  const emb = bufferToFloat32Array(c.embedding);
                  sim = cosineSimilarity(queryEmbedding, emb);
                } catch {
                  sim = null;
                }
              }
            return {
              result_type: 'snippet', id: c.snippet_id, title: c.label, content: c.content, mime_type: 'text/plain', created_at: c.created_at, similarity_score: sim
            };
          }).sort((a,b) => (b.similarity_score ?? -1) - (a.similarity_score ?? -1))
            .slice(0, parseInt(limit));
        }
      }

      return reply.send({ query: q, mode, results, total: results.length });

    } catch (error) {
      fastify.log.error({ error }, 'Failed to search knowledge base');
      return reply.code(500).send({ error: 'Failed to search knowledge base' });
    }
  });

  // Get knowledge context for a specific entity (ticket, asset, vendor)
  fastify.get('/knowledge/context/:type/:id', { 
    preHandler: [fastify.authenticate] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const params = (request.params as any);
    const entityType = params.type;
    const entityId = parseInt(params.id);

    if (!['ticket', 'asset', 'vendor', 'site'].includes(entityType)) {
      return reply.code(400).send({ error: 'Invalid entity type' });
    }

    try {
      const context = await withRls(String(userId), async (conn) => {
        // Get attachments and related knowledge
        const attachmentColumn = entityType === 'ticket' ? 'ticket_id' :
                               entityType === 'asset' ? 'asset_id' :
                               entityType === 'vendor' ? 'vendor_id' : null;

        if (!attachmentColumn) {
          return { attachments: [], documents: [], snippets: [] };
        }

        // Get attachments
        const attachments = await conn.request()
          .input('entity_id', entityId)
          .query(`
            SELECT attachment_id, uri, kind, mime_type, size_bytes, created_at
            FROM app.Attachments 
            WHERE ${attachmentColumn} = @entity_id
            ORDER BY created_at DESC
          `);

        // Get related documents from knowledge graph
        const documents = await conn.request()
          .input('entity_id', entityId)
          .query(`
            SELECT d.document_id, d.title, d.summary, d.mime_type, d.created_at
            FROM kg.Document d
            INNER JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR)
            WHERE a.${attachmentColumn} = @entity_id AND d.source_system = 'attachment'
            ORDER BY d.created_at DESC
          `);

        // Get related knowledge snippets
        const snippets = await conn.request()
          .input('entity_id', entityId)
          .query(`
            SELECT ks.snippet_id, ks.label, ks.content, ks.created_at
            FROM kg.KnowledgeSnippet ks
            INNER JOIN kg.Document d ON ks.source = 'document:' + CAST(d.document_id AS NVARCHAR)
            INNER JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR)
            WHERE a.${attachmentColumn} = @entity_id AND d.source_system = 'attachment'
            ORDER BY ks.created_at DESC
          `);

        return {
          attachments: attachments.recordset,
          documents: documents.recordset,
          snippets: snippets.recordset
        };
      });

      return reply.send({
        entity_type: entityType,
        entity_id: entityId,
        knowledge_context: context
      });

    } catch (error) {
      fastify.log.error({ error }, 'Failed to get knowledge context');
      return reply.code(500).send({ error: 'Failed to get knowledge context' });
    }
  });

  // Semantic search dedicated endpoint (returns only ranked snippets)
  fastify.get('/knowledge/semantic-search', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    const { q, top = '5' } = (request.query as any);
    if (!q) return reply.code(400).send({ error: 'q required' });
    try {
      const queryEmbedding = await generateEmbedding(q);
      const candidates = await withRls(String(userId), async (conn) => {
        const res = await conn.request().input('limit', parseInt(top) * 20)
          .query(`SELECT TOP (@limit) ks.snippet_id, ks.label, ks.content, ks.embedding, ks.created_at FROM kg.KnowledgeSnippet ks ORDER BY ks.created_at DESC`);
        return res.recordset;
      });
      const scored = candidates.map(c => {
        let sim: number | null = null;
        if (c.embedding) {
          try { sim = cosineSimilarity(queryEmbedding, bufferToFloat32Array(c.embedding)); } catch { sim = null; }
        }
        return { id: c.snippet_id, title: c.label, content: c.content, created_at: c.created_at, similarity: sim };
      }).sort((a,b) => (b.similarity ?? -1) - (a.similarity ?? -1))
        .slice(0, parseInt(top));
      return reply.send({ query: q, top: parseInt(top), results: scored });
    } catch (error) {
      fastify.log.error({ error }, 'semantic-search failed');
      return reply.code(500).send({ error: 'semantic search failed' });
    }
  });

  // Chat-oriented retrieval endpoint (no LLM call here, just context assembly)
  fastify.post('/knowledge/chat', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    const bodySchema = z.object({
      messages: z.array(z.object({ role: z.enum(['user','assistant','system']), content: z.string() })).min(1),
      topK: z.number().min(1).max(20).default(6),
      entityHints: z.object({ ticket_id: z.number().optional(), asset_id: z.number().optional(), site_id: z.number().optional() }).optional()
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid payload', details: parsed.error.issues });
    try {
      const { messages, topK, entityHints } = parsed.data;
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      if (!lastUser) return reply.code(400).send({ error: 'no user message' });
      const queryEmbedding = await generateEmbedding(lastUser.content);
      // Candidate restriction if entity hints provided
      const candidates = await withRls(String(userId), async (conn) => {
        if (entityHints?.ticket_id) {
          return (await conn.request().input('ticket_id', entityHints.ticket_id)
            .query(`SELECT TOP (200) ks.snippet_id, ks.label, ks.content, ks.embedding, ks.created_at
                    FROM kg.KnowledgeSnippet ks
                    INNER JOIN kg.Document d ON ks.source = 'document:' + CAST(d.document_id AS NVARCHAR)
                    INNER JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR)
                    WHERE a.ticket_id = @ticket_id AND d.source_system = 'attachment'
                    ORDER BY ks.created_at DESC`)).recordset;
        }
        if (entityHints?.asset_id) {
          return (await conn.request().input('asset_id', entityHints.asset_id)
            .query(`SELECT TOP (200) ks.snippet_id, ks.label, ks.content, ks.embedding, ks.created_at
                    FROM kg.KnowledgeSnippet ks
                    INNER JOIN kg.Document d ON ks.source = 'document:' + CAST(d.document_id AS NVARCHAR)
                    INNER JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR)
                    WHERE a.asset_id = @asset_id AND d.source_system = 'attachment'
                    ORDER BY ks.created_at DESC`)).recordset;
        }
        if (entityHints?.site_id) {
          // Site: join through assets or tickets referencing site (simplest: attachments -> assets filter by site)
          return (await conn.request().input('site_id', entityHints.site_id)
            .query(`SELECT TOP (250) ks.snippet_id, ks.label, ks.content, ks.embedding, ks.created_at
                    FROM kg.KnowledgeSnippet ks
                    INNER JOIN kg.Document d ON ks.source = 'document:' + CAST(d.document_id AS NVARCHAR)
                    INNER JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR)
                    LEFT JOIN app.Assets sA ON a.asset_id = sA.asset_id
                    LEFT JOIN app.Tickets t ON a.ticket_id = t.ticket_id
                    WHERE d.source_system = 'attachment'
                      AND (sA.site_id = @site_id OR t.site_id = @site_id)
                    ORDER BY ks.created_at DESC`)).recordset;
        }
        return (await conn.request().query(`SELECT TOP (300) ks.snippet_id, ks.label, ks.content, ks.embedding, ks.created_at FROM kg.KnowledgeSnippet ks ORDER BY ks.created_at DESC`)).recordset;
      });
      const scored = candidates.map(c => {
        let sim: number | null = null;
        if (c.embedding) { try { sim = cosineSimilarity(queryEmbedding, bufferToFloat32Array(c.embedding)); } catch { sim = null; } }
        return { id: c.snippet_id, title: c.label, content: c.content, similarity: sim };
      }).sort((a,b) => (b.similarity ?? -1) - (a.similarity ?? -1)).slice(0, topK);
      return reply.send({
        messages,
        retrieval_query: lastUser.content,
        context_snippets: scored,
        note: 'LLM generation not performed here; client/worker should call model with messages + context_snippets.'
      });
    } catch (error) {
      fastify.log.error({ error }, 'chat retrieval failed');
      return reply.code(500).send({ error: 'chat retrieval failed' });
    }
  });

  // Ingest URL as knowledge
  fastify.post('/knowledge/ingest-url', { 
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Ingest URL content as knowledge item',
      body: {
        type: 'object',
        required: ['url', 'metadata'],
        properties: {
          url: { type: 'string', format: 'uri' },
          metadata: {
            type: 'object',
            required: ['title', 'relatedTo'],
            properties: {
              title: { type: 'string', minLength: 1 },
              description: { type: 'string' },
              category: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              relatedTo: {
                type: 'object',
                required: ['type', 'id'],
                properties: {
                  type: { type: 'string', enum: ['ticket', 'asset', 'vendor', 'site'] },
                  id: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const { url, metadata } = request.body as {
        url: string;
        metadata: DocumentMetadata;
      };

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return reply.code(400).send({ error: 'Only HTTP and HTTPS URLs are allowed' });
        }
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid URL format' });
      }

      // Fetch and process URL content
      const processingResult = await processUrl(url, metadata, userId);

      // Calculate hash from URL and content
      const hash = crypto.createHash('sha256').update(url + (processingResult.extractedText || '')).digest('hex');

      // Store in database with knowledge graph relationships
      const result = await withRls(String(userId), async (conn) => {
        // 1. Create attachment record (for URL references)
        const attachmentResult = await conn.request()
          .input('ticket_id', metadata.relatedTo.type === 'ticket' ? metadata.relatedTo.id : null)
          .input('asset_id', metadata.relatedTo.type === 'asset' ? metadata.relatedTo.id : null)
          .input('vendor_id', metadata.relatedTo.type === 'vendor' ? metadata.relatedTo.id : null)
          .input('uri', url)
          .input('kind', 'url')
          .input('mime_type', 'text/html')
          .input('size_bytes', processingResult.extractedText?.length || 0)
          .input('content_sha256', Buffer.from(hash, 'hex'))
          .input('uploaded_by', userId)
          .query(`
            INSERT INTO app.Attachments (ticket_id, asset_id, vendor_id, uri, kind, mime_type, size_bytes, content_sha256, uploaded_by, created_at)
            OUTPUT INSERTED.attachment_id
            VALUES (@ticket_id, @asset_id, @vendor_id, @uri, @kind, @mime_type, @size_bytes, @content_sha256, @uploaded_by, SYSUTCDATETIME())
          `);

        const attachmentId = attachmentResult.recordset[0].attachment_id;

        // 2. Create knowledge graph document node
        const documentResult = await conn.request()
          .input('source_system', 'url')
          .input('external_key', attachmentId.toString())
          .input('title', metadata.title)
          .input('mime_type', 'text/html')
          .input('summary', metadata.description || `${metadata.title} - Web page content`)
          .input('hash', hash)
          .query(`
            INSERT INTO kg.Document (source_system, external_key, title, mime_type, summary, hash, created_at)
            OUTPUT INSERTED.document_id
            VALUES (@source_system, @external_key, @title, @mime_type, @summary, @hash, SYSUTCDATETIME())
          `);

        const documentId = documentResult.recordset[0].document_id;

        // 3. Create knowledge snippets from extracted content
        const snippetIds: number[] = [];
        const usingReal = !!process.env.OPENAI_API_KEY;
        const modelName = process.env.OPENAI_EMBED_MODEL || (usingReal ? 'text-embedding-3-small' : (process.env.OPENAI_EMBED_ALLOW_FALLBACK === 'true' ? 'mock-deterministic-512' : null));
        
        for (const snippet of processingResult.snippets) {
          const snippetResult = await conn.request()
            .input('source', `document:${documentId}`)
            .input('label', `${metadata.title} - Web Content`)
            .input('content', snippet.content)
            .input('embedding', snippet.embedding ? Buffer.from(snippet.embedding.buffer) : null)
            .input('embedding_model', modelName)
            .input('embedding_dim', snippet.embedding ? snippet.embedding.length : null)
            .query(`
              INSERT INTO kg.KnowledgeSnippet (source, label, content, embedding, embedding_model, embedding_dim, created_at)
              OUTPUT INSERTED.snippet_id
              VALUES (@source, @label, @content, @embedding, @embedding_model, @embedding_dim, SYSUTCDATETIME())
            `);
          snippetIds.push(snippetResult.recordset[0].snippet_id);
        }

        // Optional: Upsert to Qdrant vector store
        if (qdrantEnabled()) {
          try {
            const points = processingResult.snippets.map((s: any, idx: number) => ({
              id: snippetIds[idx],
              vector: s.embedding ? Array.from(s.embedding as any) : [],
              payload: {
                snippet_id: snippetIds[idx],
                document_id: Number(documentId),
                attachment_id: Number(attachmentId),
                ticket_id: metadata.relatedTo.type === 'ticket' ? metadata.relatedTo.id : null,
                asset_id: metadata.relatedTo.type === 'asset' ? metadata.relatedTo.id : null,
                site_id: null,
                embedding_model: modelName || undefined,
                created_at: new Date().toISOString(),
                mime_type: 'text/html',
                label: `${metadata.title} - Web Content`,
                url: url
              }
            })).filter((p: any) => p.vector.length > 0);
            if (points.length) await upsertPoints(points as any);
          } catch (e) {
            fastify.log.warn({ err: e }, 'Qdrant upsert skipped for URL');
          }
        }

        // Update embedding usage metrics
        if (processingResult.snippets.some((s: any) => s.embedding)) {
          await conn.request()
            .input('model', modelName || 'unavailable')
            .input('provider', usingReal ? 'openai' : (process.env.OPENAI_EMBED_ALLOW_FALLBACK === 'true' ? 'mock' : 'none'))
            .input('vector_count', processingResult.snippets.filter((s: any) => s.embedding).length)
            .input('tokens', null)
            .execute('kg.usp_UpsertEmbeddingUsage');
        }

        // 4. Create knowledge graph relationships
        await createKnowledgeGraphRelationships(conn, documentId, metadata, attachmentId);

        return {
          attachmentId,
          documentId,
          snippetIds,
          extractedText: processingResult.extractedText,
          url: url
        };
      });

      return reply.code(201).send({
        success: true,
        attachment_id: result.attachmentId,
        document_id: result.documentId,
        snippet_count: result.snippetIds.length,
        extracted_text_length: result.extractedText?.length || 0,
        url: result.url
      });

    } catch (error) {
      fastify.log.error({ error }, 'Failed to ingest URL');
      return reply.code(500).send({ error: 'Failed to process URL ingestion' });
    }
  });
}

// Helper functions

async function processFile(
  file: any, 
  metadata: DocumentMetadata, 
  hash: string, 
  mimeType: string, 
  userId: number
): Promise<ProcessingResult> {
  const snippets = [];
  let extractedText = '';
  let imageAnalysis = '';

  if (mimeType.startsWith('image/')) {
    // For now we do not fabricate analysis; store only a minimal reference snippet
    imageAnalysis = '';
    snippets.push({
      snippetId: BigInt(0),
      content: `Image attachment: ${metadata.title}`,
      embedding: await generateEmbedding(metadata.title)
    });
  } else if (mimeType.includes('text/') || mimeType.includes('pdf')) {
    // Document processing
    extractedText = await extractTextFromDocument(file.filepath, mimeType);
    
    // Split into chunks for knowledge snippets
    const chunks = chunkText(extractedText, 500); // 500 char chunks
    for (const chunk of chunks) {
      snippets.push({
        snippetId: BigInt(0),
        content: chunk,
        embedding: await generateEmbedding(chunk)
      });
    }
  } else {
    // Generic file - just create metadata snippet
    snippets.push({
      snippetId: BigInt(0),
      content: `File: ${metadata.title} - ${metadata.description || 'No description available'}`,
      embedding: await generateEmbedding(`${metadata.title} ${metadata.description || ''}`)
    });
  }

  return {
    documentId: BigInt(0),
    snippets,
    extractedText,
    imageAnalysis
  };
}

async function processImage(filePath: string): Promise<string> { return ''; }

async function extractTextFromDocument(filePath: string, mimeType: string): Promise<string> {
  // Max file size: 20MB
  const MAX_SIZE = 20 * 1024 * 1024;
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_SIZE) return 'File too large to extract text.';
  } catch (e) {
    return 'File not found or unreadable.';
  }

  // Timeout guard: 15s
  const timeout = <T>(ms: number, promise: Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('Extraction timed out')), ms);
      promise.then(
        (res) => { clearTimeout(id); resolve(res); },
        (err) => { clearTimeout(id); reject(err); }
      );
    });
  };

  if (mimeType.includes('pdf')) {
    try {
      // Dynamically import pdf-parse
  const pdfParse: any = (await import('pdf-parse')).default;
  const stream = createReadStream(filePath);
  const data: any = await timeout(15000, pdfParse(stream));
  return data && typeof data.text === 'string' ? data.text : '';
    } catch (e: any) {
      return 'PDF extraction failed: ' + (e?.message || e);
    }
  } else if (mimeType.includes('officedocument.wordprocessingml.document') || filePath.endsWith('.docx')) {
    try {
      // Dynamically import mammoth
  const mammoth: any = await import('mammoth');
  const data: any = await timeout(15000, mammoth.extractRawText({ path: filePath }));
  return data && typeof data.value === 'string' ? data.value : '';
    } catch (e: any) {
      return 'DOCX extraction failed: ' + (e?.message || e);
    }
  } else if (mimeType.includes('text/')) {
    try {
      return await timeout(10000, fs.readFile(filePath, 'utf-8'));
    } catch (e: any) {
      return 'Text extraction failed: ' + (e?.message || e);
    }
  }
  return 'No text extracted';
}

async function processUrl(
  url: string, 
  metadata: DocumentMetadata, 
  userId: number
): Promise<ProcessingResult> {
  const snippets = [];
  let extractedText = '';

  try {
    // Fetch URL content with timeout and size limits
    const extractedContent = await extractContentFromUrl(url);
    extractedText = extractedContent;

    if (extractedText && extractedText.length > 0) {
      // Split into chunks for knowledge snippets
      const chunks = chunkText(extractedText, 500); // 500 char chunks
      for (const chunk of chunks) {
        if (chunk.trim().length > 0) {
          snippets.push({
            snippetId: BigInt(0),
            content: chunk.trim(),
            embedding: await generateEmbedding(chunk.trim())
          });
        }
      }
    }

    // Always add a metadata snippet even if content extraction fails
    if (snippets.length === 0) {
      snippets.push({
        snippetId: BigInt(0),
        content: `Web page: ${metadata.title} - ${metadata.description || 'No content extracted'} (${url})`,
        embedding: await generateEmbedding(`${metadata.title} ${metadata.description || ''} ${url}`)
      });
    }

  } catch (error) {
    // Fallback: create a basic metadata snippet if URL processing fails
    snippets.push({
      snippetId: BigInt(0),
      content: `Web page: ${metadata.title} - Content extraction failed (${url})`,
      embedding: await generateEmbedding(`${metadata.title} ${url}`)
    });
  }

  return {
    documentId: BigInt(0),
    snippets,
    extractedText,
    imageAnalysis: ''
  };
}

async function extractContentFromUrl(url: string): Promise<string> {
  // Set reasonable timeouts and size limits
  const TIMEOUT_MS = 30000; // 30 seconds
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  
  const timeout = <T>(ms: number, promise: Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('URL fetch timed out')), ms);
      promise.then(
        (res) => { clearTimeout(id); resolve(res); },
        (err) => { clearTimeout(id); reject(err); }
      );
    });
  };

  try {
    const response = await timeout(TIMEOUT_MS, fetch(url, {
      headers: {
        'User-Agent': 'OpsGraph-Knowledge-Bot/1.0'
      },
      redirect: 'follow'
    }));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      throw new Error(`Content too large: ${contentLength} bytes`);
    }

    const text = await response.text();
    if (text.length > MAX_SIZE) {
      throw new Error(`Content too large: ${text.length} characters`);
    }

    // Basic HTML content extraction (very simple - could be enhanced with a proper HTML parser)
    return extractTextFromHtml(text);

  } catch (error: any) {
    throw new Error(`Failed to fetch URL content: ${error?.message || error}`);
  }
}

function extractTextFromHtml(html: string): string {
  // Very basic HTML text extraction - removes tags and extracts text content
  // This is a minimal implementation - could be enhanced with libraries like jsdom or cheerio
  
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.trim();
  
  return text;
}

async function generateEmbedding(text: string): Promise<Float32Array> {
  const { vector } = await embedText(text.slice(0, 8000));
  return vector;
}

function bufferToFloat32Array(buf: Buffer): Float32Array {
  const arr = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  return new Float32Array(arr);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) { const av = a[i]; const bv = b[i]; dot += av * bv; na += av * av; nb += bv * bv; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function chunkText(text: string, chunkSize: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

async function createKnowledgeGraphRelationships(
  conn: any, 
  documentId: bigint, 
  metadata: DocumentMetadata, 
  attachmentId: bigint
) {
  // Create relationships in the knowledge graph based on what the document is related to
  const relationType = metadata.relatedTo.type;
  const relationId = metadata.relatedTo.id;

  // This would create edges like DOCUMENT_FOR, RELATES_TO, etc.
  // Implementation depends on your specific knowledge graph edge tables
  
  // Example: Link document to asset/ticket/vendor
  if (relationType === 'asset') {
    await conn.request()
      .input('document_id', documentId)
      .input('asset_id', relationId)
      .query(`
        INSERT INTO kg.DOCUMENT_FOR (document_id, asset_id, created_at)
        VALUES (@document_id, @asset_id, SYSUTCDATETIME())
      `);
  }
  
  // Additional relationship creation logic here...
}
