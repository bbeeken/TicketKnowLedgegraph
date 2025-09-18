import { FastifyRequest } from 'fastify';
import { getSqlConnection } from '../db/sql';
import { embedText, EmbeddingResult } from '../ai/embeddings';
import { search as qdrantSearch, isEnabled as qdrantEnabled, upsertPoints, QdrantFilter } from '../ai/vector/qdrant';
import * as mssql from 'mssql';

export interface VectorSearchOptions {
  query: string;
  limit?: number;
  threshold?: number;
  includeContent?: boolean;
  filters?: {
    entityType?: 'ticket' | 'asset' | 'document' | 'snippet';
    entityId?: number;
    siteId?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    categories?: string[];
    tags?: string[];
  };
}

export interface VectorSearchResult {
  id: number;
  type: 'ticket' | 'asset' | 'document' | 'snippet';
  title: string;
  content?: string;
  summary?: string;
  similarity_score: number;
  metadata: {
    entity_id?: number;
    site_id?: number;
    category?: string;
    tags?: string[];
    created_at: Date;
    updated_at?: Date;
    mime_type?: string;
    author?: string;
  };
}

export interface VectorSearchStats {
  total_results: number;
  search_time_ms: number;
  embedding_model: string;
  provider: string;
  vector_dimension: number;
  used_fallback: boolean;
}

export class VectorSearchService {
  private conn: any; // RequestSqlConnection from getSqlConnection

  constructor(connection: any) {
    this.conn = connection;
  }

  /**
   * Perform semantic vector search across all indexed content
   */
  async search(options: VectorSearchOptions): Promise<{
    results: VectorSearchResult[];
    stats: VectorSearchStats;
  }> {
    const startTime = Date.now();
    const limit = Math.min(options.limit || 20, 100); // Cap at 100 results
    const threshold = options.threshold || 0.1; // Minimum similarity threshold

    try {
      // Generate embedding for the query
      const embeddingResult = await embedText(options.query);
      
      let results: VectorSearchResult[] = [];

      if (qdrantEnabled()) {
        // Use Qdrant for fast vector search
        results = await this.searchWithQdrant(options, embeddingResult, limit, threshold);
      } else {
        // Fallback to database-based vector search
        results = await this.searchWithDatabase(options, embeddingResult, limit, threshold);
      }

      const searchTime = Date.now() - startTime;

      return {
        results,
        stats: {
          total_results: results.length,
          search_time_ms: searchTime,
          embedding_model: embeddingResult.model,
          provider: embeddingResult.provider,
          vector_dimension: embeddingResult.vector.length,
          used_fallback: !qdrantEnabled()
        }
      };

    } catch (error) {
      throw new Error(`Vector search failed: ${error}`);
    }
  }

  /**
   * Search using Qdrant vector database
   */
  private async searchWithQdrant(
    options: VectorSearchOptions,
    embeddingResult: EmbeddingResult,
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    const filter = this.buildQdrantFilter(options.filters);
    const hits = await qdrantSearch(embeddingResult.vector, limit, filter);
    
    // Filter by similarity threshold
    const filteredHits = hits.filter(hit => hit.score >= threshold);
    
    if (filteredHits.length === 0) {
      return [];
    }

    // Fetch detailed information from database
    const snippetIds = filteredHits.map(hit => hit.id).filter(id => typeof id === 'number');
    
    if (snippetIds.length === 0) {
      return [];
    }

    const results = await this.fetchSnippetDetails(snippetIds, options.includeContent);
    
    // Merge with similarity scores
    const scoreMap = new Map(filteredHits.map(hit => [hit.id, hit.score]));
    
    return results.map(result => ({
      ...result,
      similarity_score: scoreMap.get(result.id) || 0
    })).sort((a, b) => b.similarity_score - a.similarity_score);
  }

  /**
   * Search using database-based vector similarity
   */
  private async searchWithDatabase(
    options: VectorSearchOptions,
    embeddingResult: EmbeddingResult,
    limit: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    // Build WHERE clause for filtering
    const { whereClause, params } = this.buildDatabaseFilter(options.filters);
    
    const request = this.conn.request();
    
    // Add filter parameters
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    request.input('limit', mssql.Int, limit);
    request.input('threshold', mssql.Float, threshold);

    const query = `
      SELECT TOP (@limit)
        ks.snippet_id as id,
        'snippet' as type,
        ks.label as title,
        ${options.includeContent ? 'ks.content,' : 'NULL as content,'}
        SUBSTRING(ks.content, 1, 200) as summary,
        ks.embedding,
        ks.created_at,
        ks.source,
        d.title as document_title,
        d.mime_type,
        a.attachment_id,
        t.ticket_id,
        ast.asset_id,
        s.site_id,
        s.name as site_name
      FROM kg.KnowledgeSnippet ks
      LEFT JOIN kg.Document d ON ks.source LIKE 'document:' + CAST(d.document_id AS NVARCHAR)
      LEFT JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR) AND d.source_system = 'attachment'
      LEFT JOIN app.Tickets t ON a.ticket_id = t.ticket_id
      LEFT JOIN app.Assets ast ON a.asset_id = ast.asset_id
      LEFT JOIN app.Sites s ON COALESCE(t.site_id, ast.site_id) = s.site_id
      ${whereClause}
      AND ks.embedding IS NOT NULL
      ORDER BY ks.created_at DESC
    `;

    const result = await request.query(query);
    
    // Calculate cosine similarity for each result
    const resultsWithSimilarity = result.recordset.map((row: any) => {
      let similarityScore = 0;
      
      if (row.embedding) {
        try {
          const rowEmbedding = this.bufferToFloat32Array(row.embedding);
          similarityScore = this.cosineSimilarity(embeddingResult.vector, rowEmbedding);
        } catch (error) {
          // Skip if embedding can't be processed
          similarityScore = 0;
        }
      }

      return {
        id: row.id,
        type: 'snippet' as const,
        title: row.title || row.document_title || 'Untitled',
        content: options.includeContent ? row.content : undefined,
        summary: row.summary,
        similarity_score: similarityScore,
        metadata: {
          entity_id: row.attachment_id || row.ticket_id || row.asset_id,
          site_id: row.site_id,
          created_at: row.created_at,
          mime_type: row.mime_type,
          source: row.source
        }
      };
    });

    // Filter by threshold and sort by similarity
    return resultsWithSimilarity
      .filter((result: any) => result.similarity_score >= threshold)
      .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
      .slice(0, limit);
  }

  /**
   * Build Qdrant filter from search options
   */
  private buildQdrantFilter(filters?: VectorSearchOptions['filters']): QdrantFilter | undefined {
    if (!filters) return undefined;

    const must: any[] = [];

    if (filters.siteId) {
      must.push({ key: 'site_id', match: { value: filters.siteId } });
    }

    if (filters.entityType) {
      // Add logic to filter by entity type in payload
    }

    if (filters.dateRange) {
      const startTimestamp = filters.dateRange.start.getTime();
      const endTimestamp = filters.dateRange.end.getTime();
      must.push({ 
        key: 'created_at_timestamp', 
        range: { gte: startTimestamp, lte: endTimestamp } 
      });
    }

    return must.length > 0 ? { must } : undefined;
  }

  /**
   * Build database WHERE clause from search options
   */
  private buildDatabaseFilter(filters?: VectorSearchOptions['filters']): {
    whereClause: string;
    params: Array<{ name: string; type: any; value: any }>;
  } {
    const conditions: string[] = ['1=1'];
    const params: Array<{ name: string; type: any; value: any }> = [];

    if (filters?.siteId) {
      conditions.push('s.site_id = @siteId');
      params.push({ name: 'siteId', type: mssql.Int, value: filters.siteId });
    }

    if (filters?.entityId) {
      conditions.push('(a.attachment_id = @entityId OR t.ticket_id = @entityId OR ast.asset_id = @entityId)');
      params.push({ name: 'entityId', type: mssql.Int, value: filters.entityId });
    }

    if (filters?.dateRange) {
      conditions.push('ks.created_at >= @startDate AND ks.created_at <= @endDate');
      params.push({ name: 'startDate', type: mssql.DateTime2, value: filters.dateRange.start });
      params.push({ name: 'endDate', type: mssql.DateTime2, value: filters.dateRange.end });
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  /**
   * Fetch detailed snippet information
   */
  private async fetchSnippetDetails(snippetIds: number[], includeContent?: boolean): Promise<VectorSearchResult[]> {
    const request = this.conn.request();
    const idList = snippetIds.join(',');

    const query = `
      SELECT 
        ks.snippet_id as id,
        'snippet' as type,
        ks.label as title,
        ${includeContent ? 'ks.content,' : 'NULL as content,'}
        SUBSTRING(ks.content, 1, 200) as summary,
        ks.created_at,
        ks.source,
        d.title as document_title,
        d.mime_type,
        a.attachment_id,
        t.ticket_id,
        ast.asset_id,
        s.site_id,
        s.name as site_name
      FROM kg.KnowledgeSnippet ks
      LEFT JOIN kg.Document d ON ks.source LIKE 'document:' + CAST(d.document_id AS NVARCHAR)
      LEFT JOIN app.Attachments a ON d.external_key = CAST(a.attachment_id AS NVARCHAR) AND d.source_system = 'attachment'
      LEFT JOIN app.Tickets t ON a.ticket_id = t.ticket_id
      LEFT JOIN app.Assets ast ON a.asset_id = ast.asset_id
      LEFT JOIN app.Sites s ON COALESCE(t.site_id, ast.site_id) = s.site_id
      WHERE ks.snippet_id IN (${idList})
    `;

    const result = await request.query(query);
    
    return result.recordset.map((row: any) => ({
      id: row.id,
      type: 'snippet' as const,
      title: row.title || row.document_title || 'Untitled',
      content: includeContent ? row.content : undefined,
      summary: row.summary,
      similarity_score: 0, // Will be set by caller
      metadata: {
        entity_id: row.attachment_id || row.ticket_id || row.asset_id,
        site_id: row.site_id,
        created_at: row.created_at,
        mime_type: row.mime_type,
        source: row.source
      }
    }));
  }

  /**
   * Convert buffer to Float32Array for embedding comparison
   */
  private bufferToFloat32Array(buffer: Buffer): Float32Array {
    return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Index content for vector search
   */
  async indexContent(content: {
    id: number;
    type: 'ticket' | 'asset' | 'document';
    title: string;
    text: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; snippetId?: number; error?: string }> {
    try {
      // Generate embedding
      const embeddingResult = await embedText(content.text);
      
      // Store in database
      const request = this.conn.request();
      request.input('source', mssql.NVarChar, `${content.type}:${content.id}`);
      request.input('label', mssql.NVarChar, content.title);
      request.input('content', mssql.NVarChar, content.text);
      request.input('embedding', mssql.VarBinary, Buffer.from(embeddingResult.vector.buffer));
      request.input('embedding_model', mssql.NVarChar, embeddingResult.model);
      request.input('embedding_dim', mssql.Int, embeddingResult.vector.length);

      const result = await request.query(`
        INSERT INTO kg.KnowledgeSnippet (source, label, content, embedding, embedding_model, embedding_dim, created_at)
        OUTPUT INSERTED.snippet_id
        VALUES (@source, @label, @content, @embedding, @embedding_model, @embedding_dim, GETUTCDATE())
      `);

      const snippetId = result.recordset[0].snippet_id;

      // Also index in Qdrant if available
      if (qdrantEnabled()) {
        try {
          await upsertPoints([{
            id: snippetId,
            vector: embeddingResult.vector,
            payload: {
              snippet_id: snippetId,
              entity_id: content.id,
              title: content.title,
              embedding_model: embeddingResult.model,
              created_at: new Date().toISOString(),
              ...content.metadata
            } as any // Qdrant payload is flexible
          }]);
        } catch (error) {
          // Log but don't fail if Qdrant indexing fails
          console.warn('Qdrant indexing failed:', error);
        }
      }

      return { success: true, snippetId };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

/**
 * Helper function to create VectorSearchService instance
 */
export async function createVectorSearchService(request: FastifyRequest): Promise<VectorSearchService> {
  const conn = await getSqlConnection(request);
  return new VectorSearchService(conn);
}