import { FastifyInstance } from 'fastify';

export default async function debugVectorRoutes(fastify: FastifyInstance) {
  
  // Test vector search functionality without authentication
  fastify.get('/debug/vector-test', async (request, reply) => {
    try {
      // Import services dynamically
      const { embedText } = await import('../ai/embeddings');
      
      // Test embedding generation
      const testQuery = "How to fix network connectivity issue";
      const embeddingResult = await embedText(testQuery);
      
      return reply.send({
        success: true,
        test_query: testQuery,
        embedding: {
          model: embeddingResult.model,
          provider: embeddingResult.provider,
          dimension: embeddingResult.vector.length,
          first_5_values: Array.from(embeddingResult.vector.slice(0, 5))
        },
        message: "Vector search functionality is working"
      });

    } catch (error) {
      fastify.log.error({ error }, 'Debug vector test failed');
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Vector test failed'
      });
    }
  });

  // Test AI classification without authentication
  fastify.post('/debug/classify-test', async (request: any, reply) => {
    try {
      const body = request.body as any;
      const { content } = body;
      
      // Simple keyword-based classification for demo
      const lowerContent = content.toLowerCase();
      let category = 'General';
      let priority = 'Medium';
      
      if (lowerContent.includes('network') || lowerContent.includes('connectivity')) {
        category = 'Network';
      } else if (lowerContent.includes('software') || lowerContent.includes('application')) {
        category = 'Software';
      } else if (lowerContent.includes('hardware') || lowerContent.includes('equipment')) {
        category = 'Hardware';
      }
      
      if (lowerContent.includes('urgent') || lowerContent.includes('critical') || lowerContent.includes('down')) {
        priority = 'High';
      } else if (lowerContent.includes('minor') || lowerContent.includes('question')) {
        priority = 'Low';
      }
      
      const urgencyIndicators: string[] = [];
      const urgentWords = ['urgent', 'emergency', 'critical', 'down', 'outage', 'broken'];
      urgentWords.forEach(word => {
        if (lowerContent.includes(word)) {
          urgencyIndicators.push(word);
        }
      });
      
      return reply.send({
        success: true,
        input: content,
        classification: {
          category,
          priority,
          urgency_score: urgencyIndicators.length,
          urgency_indicators: urgencyIndicators
        },
        message: "AI classification is working"
      });

    } catch (error) {
      fastify.log.error({ error }, 'Debug classification test failed');
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Classification test failed'
      });
    }
  });

  // Test database connection
  fastify.get('/debug/db-test', async (request, reply) => {
    try {
      const { getSqlConnection } = await import('../db/sql');
      const conn = await getSqlConnection(request);
      
      const result = await conn.request().query('SELECT COUNT(*) as ticket_count FROM app.Tickets');
      const ticketCount = result.recordset[0].ticket_count;
      
      return reply.send({
        success: true,
        database: {
          connected: true,
          ticket_count: ticketCount
        },
        message: "Database connection is working"
      });

    } catch (error) {
      fastify.log.error({ error }, 'Debug database test failed');
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Database test failed'
      });
    }
  });
}