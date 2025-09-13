import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { withRls } from '../sql';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { cfg } from '../config';

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
        const snippetIds = [];
        for (const snippet of processingResult.snippets) {
          const snippetResult = await conn.request()
            .input('source', `document:${documentId}`)
            .input('label', `${metadata.title} - Snippet`)
            .input('content', snippet.content)
            .input('embedding', snippet.embedding ? Buffer.from(snippet.embedding.buffer) : null)
            .query(`
              INSERT INTO kg.KnowledgeSnippet (source, label, content, embedding, created_at)
              OUTPUT INSERTED.snippet_id
              VALUES (@source, @label, @content, @embedding, SYSUTCDATETIME())
            `);
          
          snippetIds.push(snippetResult.recordset[0].snippet_id);
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
          limit: { type: 'string', default: '10' }
        },
        required: ['q']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { q, type = 'all', related_to, limit = '10' } = (request.query as any);

    try {
      // Generate embedding for search query (placeholder - would use actual embedding service)
      const queryEmbedding = await generateEmbedding(q);

      const results = await withRls(String(userId), async (conn) => {
        let query = '';
        const request = conn.request().input('query', q).input('limit', parseInt(limit));

        if (type === 'documents' || type === 'all') {
          // Search documents by title and summary
          query += `
            SELECT 'document' as result_type, d.document_id as id, d.title, d.summary as content, 
                   d.mime_type, d.created_at, NULL as similarity_score
            FROM kg.Document d
            WHERE d.title LIKE '%' + @query + '%' OR d.summary LIKE '%' + @query + '%'
          `;
        }

        if (type === 'all') {
          query += ' UNION ALL ';
        }

        if (type === 'snippets' || type === 'all') {
          // Search knowledge snippets with vector similarity (simplified without actual vector search)
          query += `
            SELECT 'snippet' as result_type, ks.snippet_id as id, ks.label as title, ks.content, 
                   'text/plain' as mime_type, ks.created_at, 0.0 as similarity_score
            FROM kg.KnowledgeSnippet ks
            WHERE ks.content LIKE '%' + @query + '%' OR ks.label LIKE '%' + @query + '%'
          `;
        }

        query += ` ORDER BY created_at DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;

        const result = await request.query(query);
        return result.recordset;
      });

      return reply.send({
        query: q,
        results: results,
        total: results.length
      });

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
    // Image processing
    imageAnalysis = await processImage(file.filepath);
    snippets.push({
      snippetId: BigInt(0), // Will be set in database
      content: `Image Analysis: ${imageAnalysis}`,
      embedding: await generateEmbedding(`Image: ${metadata.title} - ${imageAnalysis}`)
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

async function processImage(filePath: string): Promise<string> {
  // Placeholder for image analysis using Azure Computer Vision, AWS Rekognition, or local OCR
  // This would extract text, identify objects, read signs, etc.
  return "Placeholder: Image contains equipment, text visible, industrial setting detected";
}

async function extractTextFromDocument(filePath: string, mimeType: string): Promise<string> {
  // Placeholder for document text extraction using libraries like pdf-parse, mammoth, etc.
  if (mimeType.includes('pdf')) {
    return "Placeholder: PDF text extraction would happen here";
  } else if (mimeType.includes('text/')) {
    return await fs.readFile(filePath, 'utf-8');
  }
  return "No text extracted";
}

async function generateEmbedding(text: string): Promise<Float32Array> {
  // Placeholder for embedding generation using OpenAI, Azure OpenAI, or local models
  // This would call embedding API and return vector representation
  const mockEmbedding = new Float32Array(1536); // OpenAI ada-002 size
  for (let i = 0; i < mockEmbedding.length; i++) {
    mockEmbedding[i] = Math.random() - 0.5; // Random embedding for demo
  }
  return mockEmbedding;
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
