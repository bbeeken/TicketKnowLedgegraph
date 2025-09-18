import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createTicketAIService } from '../services/ticketAI';

export default async function ticketAIRoutes(fastify: FastifyInstance) {

  // Comprehensive ticket AI analysis
  fastify.get('/tickets/:ticketId/ai-analysis', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as any;
      const query = request.query as any;
      const { ticketId } = params;
      const { includeKnowledge = true, includeSimilar = true, includeRouting = true } = query;

      if (!ticketId) {
        return reply.status(400).send({
          success: false,
          message: 'Ticket ID is required'
        });
      }

      const aiService = await createTicketAIService(request);
      const analysis = await aiService.analyzeTicket(parseInt(ticketId));

      return reply.send({
        success: true,
        ticketId: parseInt(ticketId),
        analysis,
        message: 'AI analysis completed successfully'
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Ticket AI analysis failed');
      return reply.status(500).send({
        success: false,
        message: 'AI analysis failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });

  // Ticket classification endpoint
  fastify.post('/tickets/ai-classify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const { title, description, metadata } = body;

      if (!title && !description) {
        return reply.status(400).send({
          success: false,
          message: 'Title or description is required'
        });
      }

      const aiService = await createTicketAIService(request);
      const content = `${title || ''}\n${description || ''}`.trim();
      const classification = await aiService.classifyTicket(content);

      return reply.send({
        success: true,
        classification,
        message: 'Classification completed successfully'
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Ticket classification failed');
      return reply.status(500).send({
        success: false,
        message: 'Classification failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });

  // Bulk ticket analysis
  fastify.post('/tickets/ai-bulk-analysis', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const { ticketIds, options = {} } = body;

      if (!ticketIds || !Array.isArray(ticketIds)) {
        return reply.status(400).send({
          success: false,
          message: 'Ticket IDs array is required'
        });
      }

      const aiService = await createTicketAIService(request);
      const results = [];

      for (const ticketId of ticketIds) {
        try {
          const analysis = await aiService.analyzeTicket(parseInt(ticketId));
          results.push({
            ticketId: parseInt(ticketId),
            success: true,
            analysis
          });
        } catch (error: any) {
          results.push({
            ticketId: parseInt(ticketId),
            success: false,
            error: error?.message || 'Analysis failed'
          });
        }
      }

      return reply.send({
        success: true,
        results,
        message: `Processed ${ticketIds.length} tickets`
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Bulk analysis failed');
      return reply.status(500).send({
        success: false,
        message: 'Bulk analysis failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });

  // Smart search with AI insights
  fastify.post('/search/smart', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const { query, includeAI = true, includeVector = true, limit = 20 } = body;

      if (!query) {
        return reply.status(400).send({
          success: false,
          message: 'Search query is required'
        });
      }

      const aiService = await createTicketAIService(request);
      
      // For now, just perform classification on the query as a simple "smart" search
      const classification = await aiService.classifyTicket(query);
      
      return reply.send({
        success: true,
        query,
        results: {
          classification,
          suggested_categories: [classification.category],
          ai_insights: `Based on your query, this appears to be related to ${classification.category}`
        },
        message: 'Smart search completed successfully'
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Smart search failed');
      return reply.status(500).send({
        success: false,
        message: 'Smart search failed',
        error: process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error'
      });
    }
  });
}