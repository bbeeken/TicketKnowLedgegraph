import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createVectorSearchService } from '../services/vectorSearch';

export default async function vectorSearchRoutes(fastify: FastifyInstance) {
  
  // Simple vector search endpoint
  fastify.post('/vector/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const { query, limit = 20, threshold = 0.1, includeContent = false, filters } = body;
      
      if (!query) {
        return reply.status(400).send({
          success: false,
          message: 'Query is required'
        });
      }

      const searchOptions = {
        query,
        limit,
        threshold,
        includeContent,
        filters: filters ? {
          ...filters,
          dateRange: filters.dateRange ? {
            start: new Date(filters.dateRange.start),
            end: new Date(filters.dateRange.end)
          } : undefined
        } : undefined
      };

      const vectorService = await createVectorSearchService(request);
      const { results, stats } = await vectorService.search(searchOptions);

      return reply.send({
        success: true,
        results,
        stats,
        message: 'Search completed successfully'
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Vector search failed');
      return reply.status(500).send({
        success: false,
        message: 'Search failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });

  // Similar content finder
  fastify.get('/vector/similar/:type/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as any;
      const query = request.query as any;
      const { type, id } = params;
      const { limit = 10, threshold = 0.3 } = query;
      
      if (!type || !id) {
        return reply.status(400).send({
          success: false,
          message: 'Type and ID are required'
        });
      }

      const vectorService = await createVectorSearchService(request);
      
      // Search for similar content based on entity
      const { results, stats } = await vectorService.search({
        query: `${type}:${id}`,
        limit,
        threshold,
        includeContent: true,
        filters: {
          entityType: type
        }
      });

      return reply.send({
        success: true,
        results,
        stats,
        message: `Found ${results.length} similar items`
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Similar content search failed');
      return reply.status(500).send({
        success: false,
        message: 'Similar content search failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });

  // Content indexing endpoint
  fastify.post('/vector/index', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const { type, id, title, content, metadata } = body;
      
      if (!type || !id || !title || !content) {
        return reply.status(400).send({
          success: false,
          message: 'Type, ID, title, and content are required'
        });
      }

      const vectorService = await createVectorSearchService(request);
      const result = await vectorService.indexContent({
        id,
        type,
        title,
        text: content,
        metadata
      });

      if (result.success) {
        return reply.send({
          success: true,
          snippetId: result.snippetId,
          message: 'Content indexed successfully'
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Indexing failed'
        });
      }

    } catch (error: any) {
      fastify.log.error({ error }, 'Content indexing failed');
      return reply.status(500).send({
        success: false,
        message: 'Content indexing failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });

  // Batch search endpoint
  fastify.post('/vector/batch-search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const { queries, limit = 10, threshold = 0.1 } = body;
      
      if (!queries || !Array.isArray(queries)) {
        return reply.status(400).send({
          success: false,
          message: 'Queries array is required'
        });
      }

      const vectorService = await createVectorSearchService(request);
      const results = [];

      for (const query of queries) {
        try {
          const { results: searchResults, stats } = await vectorService.search({
            query,
            limit,
            threshold,
            includeContent: false
          });
          
          results.push({
            query,
            success: true,
            results: searchResults,
            stats
          });
        } catch (error: any) {
          results.push({
            query,
            success: false,
            error: error?.message || 'Search failed'
          });
        }
      }

      return reply.send({
        success: true,
        results,
        message: `Processed ${queries.length} queries`
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Batch search failed');
      return reply.status(500).send({
        success: false,
        message: 'Batch search failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });
}