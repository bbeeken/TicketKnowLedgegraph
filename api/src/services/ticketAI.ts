import { FastifyRequest } from 'fastify';
import { getSqlConnection } from '../db/sql';
import { createVectorSearchService } from './vectorSearch';
import { embedText } from '../ai/embeddings';
import * as mssql from 'mssql';

export interface TicketAIAnalysis {
  ticket_id: number;
  suggested_category?: string;
  suggested_priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  suggested_assignment?: number; // user_id
  similar_tickets: Array<{
    ticket_id: number;
    title: string;
    similarity_score: number;
    resolution?: string;
  }>;
  knowledge_suggestions: Array<{
    snippet_id: number;
    title: string;
    similarity_score: number;
    content_preview: string;
  }>;
  sentiment_analysis?: {
    score: number; // -1 to 1 (negative to positive)
    confidence: number; // 0 to 1
    urgency_indicators: string[];
  };
  auto_actions?: Array<{
    action: string;
    confidence: number;
    reason: string;
  }>;
}

export interface TicketClassificationResult {
  category: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
}

export interface TicketRoutingResult {
  suggested_assignee?: number;
  suggested_team?: number;
  confidence: number;
  reasoning: string;
}

export class TicketAIService {
  private conn: any;
  private vectorService: any;

  constructor(connection: any, vectorSearchService: any) {
    this.conn = connection;
    this.vectorService = vectorSearchService;
  }

  /**
   * Perform comprehensive AI analysis on a ticket
   */
  async analyzeTicket(ticketId: number): Promise<TicketAIAnalysis> {
    try {
      // Get ticket details
      const ticket = await this.getTicketDetails(ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }

      // Combine ticket content for analysis
      const ticketContent = this.buildTicketContent(ticket);

      // Run parallel AI analyses
      const [
        similarTickets,
        knowledgeSuggestions,
        categoryAnalysis,
        priorityAnalysis,
        routingAnalysis,
        sentimentAnalysis
      ] = await Promise.all([
        this.findSimilarTickets(ticketContent, ticketId),
        this.findKnowledgeSuggestions(ticketContent),
        this.classifyTicket(ticketContent),
        this.analyzePriority(ticketContent, ticket),
        this.suggestRouting(ticketContent, ticket),
        this.analyzeSentiment(ticketContent)
      ]);

      // Generate auto-actions based on analysis
      const autoActions = this.generateAutoActions({
        ticket,
        similarTickets,
        categoryAnalysis,
        priorityAnalysis,
        sentimentAnalysis
      });

      return {
        ticket_id: ticketId,
        suggested_category: categoryAnalysis.category,
        suggested_priority: priorityAnalysis.priority,
        suggested_assignment: routingAnalysis.suggested_assignee,
        similar_tickets: similarTickets,
        knowledge_suggestions: knowledgeSuggestions,
        sentiment_analysis: sentimentAnalysis,
        auto_actions: autoActions
      };

    } catch (error) {
      throw new Error(`Ticket AI analysis failed: ${error}`);
    }
  }

  /**
   * Classify ticket into appropriate category
   */
  async classifyTicket(content: string): Promise<TicketClassificationResult> {
    try {
      // Get all categories with historical ticket data
      const request = this.conn.request();
      const result = await request.query(`
        SELECT 
          c.name as category,
          COUNT(t.ticket_id) as ticket_count,
          AVG(CAST(DATEDIFF(hour, t.created_at, COALESCE(t.closed_at, GETUTCDATE())) AS FLOAT)) as avg_resolution_hours
        FROM app.Categories c
        LEFT JOIN app.Tickets t ON c.category_id = t.category_id AND t.created_at > DATEADD(month, -6, GETUTCDATE())
        GROUP BY c.category_id, c.name
        ORDER BY ticket_count DESC
      `);

      const categories = result.recordset;

      // Use vector search to find similar tickets and their categories
      const searchResult = await this.vectorService.search({
        query: content,
        limit: 10,
        threshold: 0.3,
        filters: {
          entityType: 'ticket'
        }
      });

      // Analyze category patterns from similar tickets
      const categoryScores = new Map<string, number>();
      let totalScore = 0;

      for (const similar of searchResult.results) {
        const category = similar.metadata.category;
        if (category) {
          const weight = similar.similarity_score;
          categoryScores.set(category, (categoryScores.get(category) || 0) + weight);
          totalScore += weight;
        }
      }

      // Normalize scores and create result
      const categoryResults: Array<{ category: string; confidence: number }> = [];
      
      for (const [category, score] of categoryScores.entries()) {
        const confidence = totalScore > 0 ? score / totalScore : 0;
        categoryResults.push({ category, confidence });
      }

      // Sort by confidence
      categoryResults.sort((a, b) => b.confidence - a.confidence);

      // If no similar tickets found, fall back to most common category
      if (categoryResults.length === 0 && categories.length > 0) {
        const fallbackCategory = categories[0].category;
        categoryResults.push({ category: fallbackCategory, confidence: 0.1 });
      }

      return {
        category: categoryResults[0]?.category || 'General',
        confidence: categoryResults[0]?.confidence || 0.1,
        alternatives: categoryResults.slice(1, 4)
      };

    } catch (error) {
      return {
        category: 'General',
        confidence: 0.1,
        alternatives: []
      };
    }
  }

  /**
   * Suggest ticket priority based on content analysis
   */
  async analyzePriority(content: string, ticket: any): Promise<{ priority: 'Low' | 'Medium' | 'High' | 'Critical'; confidence: number }> {
    // Priority indicators
    const criticalKeywords = ['down', 'outage', 'critical', 'emergency', 'urgent', 'broken', 'failed', 'not working'];
    const highKeywords = ['issue', 'problem', 'error', 'bug', 'slow', 'timeout'];
    const mediumKeywords = ['question', 'help', 'support', 'request', 'enhancement'];
    const lowKeywords = ['documentation', 'training', 'information', 'suggestion'];

    const lowerContent = content.toLowerCase();
    
    let criticalScore = 0;
    let highScore = 0;
    let mediumScore = 0;
    let lowScore = 0;

    // Count keyword occurrences
    criticalKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) criticalScore += 2;
    });

    highKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) highScore += 1.5;
    });

    mediumKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) mediumScore += 1;
    });

    lowKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) lowScore += 0.5;
    });

    // Additional factors
    if (ticket.site_id && await this.isCriticalSite(ticket.site_id)) {
      criticalScore += 1;
    }

    if (ticket.asset_id && await this.isCriticalAsset(ticket.asset_id)) {
      criticalScore += 1;
    }

    // Determine priority
    const totalScore = criticalScore + highScore + mediumScore + lowScore;
    const maxScore = Math.max(criticalScore, highScore, mediumScore, lowScore);

    let priority: 'Low' | 'Medium' | 'High' | 'Critical';
    let confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

    if (criticalScore === maxScore && criticalScore > 0) {
      priority = 'Critical';
    } else if (highScore === maxScore && highScore > 0) {
      priority = 'High';
    } else if (mediumScore === maxScore && mediumScore > 0) {
      priority = 'Medium';
    } else {
      priority = 'Low';
    }

    return { priority, confidence };
  }

  /**
   * Suggest ticket routing/assignment
   */
  async suggestRouting(content: string, ticket: any): Promise<TicketRoutingResult> {
    try {
      // Find similar tickets and their assignments
      const searchResult = await this.vectorService.search({
        query: content,
        limit: 15,
        threshold: 0.4,
        filters: {
          entityType: 'ticket'
        }
      });

      // Analyze assignment patterns
      const assigneeScores = new Map<number, { score: number; count: number }>();
      
      for (const similar of searchResult.results) {
        const assigneeId = similar.metadata.assignee_id;
        if (assigneeId) {
          const weight = similar.similarity_score;
          const current = assigneeScores.get(assigneeId) || { score: 0, count: 0 };
          assigneeScores.set(assigneeId, {
            score: current.score + weight,
            count: current.count + 1
          });
        }
      }

      // Find best assignee
      let bestAssignee: number | undefined;
      let bestScore = 0;
      let totalAssignments = 0;

      for (const [assigneeId, data] of assigneeScores.entries()) {
        totalAssignments += data.count;
        if (data.score > bestScore) {
          bestScore = data.score;
          bestAssignee = assigneeId;
        }
      }

      const confidence = totalAssignments > 0 ? bestScore / totalAssignments : 0;

      return {
        suggested_assignee: bestAssignee,
        confidence,
        reasoning: bestAssignee 
          ? `Similar tickets were frequently assigned to this user (${confidence.toFixed(2)} confidence)`
          : 'No clear assignment pattern found in similar tickets'
      };

    } catch (error) {
      return {
        confidence: 0,
        reasoning: 'Routing analysis failed'
      };
    }
  }

  /**
   * Analyze sentiment and urgency
   */
  async analyzeSentiment(content: string): Promise<{
    score: number;
    confidence: number;
    urgency_indicators: string[];
  }> {
    const urgencyIndicators: string[] = [];
    
    // Urgency keywords
    const urgentPhrases = [
      'asap', 'immediately', 'urgent', 'emergency', 'critical',
      'production down', 'customers affected', 'revenue impact',
      'security breach', 'data loss', 'system failure'
    ];

    const lowerContent = content.toLowerCase();
    
    urgentPhrases.forEach(phrase => {
      if (lowerContent.includes(phrase)) {
        urgencyIndicators.push(phrase);
      }
    });

    // Simple sentiment scoring (negative indicators)
    const negativeWords = ['angry', 'frustrated', 'disappointed', 'unacceptable', 'terrible'];
    const positiveWords = ['please', 'thank', 'appreciate', 'great', 'excellent'];
    
    let sentiment = 0;
    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) sentiment -= 0.2;
    });
    
    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) sentiment += 0.1;
    });

    // Urgency affects sentiment
    sentiment -= urgencyIndicators.length * 0.1;

    return {
      score: Math.max(-1, Math.min(1, sentiment)),
      confidence: 0.6, // Simple rule-based confidence
      urgency_indicators: urgencyIndicators
    };
  }

  /**
   * Find similar resolved tickets
   */
  private async findSimilarTickets(content: string, excludeTicketId: number): Promise<Array<{
    ticket_id: number;
    title: string;
    similarity_score: number;
    resolution?: string;
  }>> {
    try {
      const searchResult = await this.vectorService.search({
        query: content,
        limit: 10,
        threshold: 0.4,
        filters: {
          entityType: 'ticket'
        }
      });

      const similarTickets = [];
      
      for (const result of searchResult.results) {
        const ticketId = result.metadata.entity_id;
        if (ticketId && ticketId !== excludeTicketId) {
          // Get ticket details including resolution
          const request = this.conn.request();
          request.input('ticketId', mssql.Int, ticketId);
          
          const ticketQuery = await request.query(`
            SELECT 
              ticket_id,
              summary as title,
              resolution,
              status
            FROM app.Tickets 
            WHERE ticket_id = @ticketId
          `);

          if (ticketQuery.recordset.length > 0) {
            const ticket = ticketQuery.recordset[0];
            similarTickets.push({
              ticket_id: ticket.ticket_id,
              title: ticket.title,
              similarity_score: result.similarity_score,
              resolution: ticket.resolution
            });
          }
        }
      }

      return similarTickets.slice(0, 5); // Top 5 similar tickets

    } catch (error) {
      return [];
    }
  }

  /**
   * Find relevant knowledge base suggestions
   */
  private async findKnowledgeSuggestions(content: string): Promise<Array<{
    snippet_id: number;
    title: string;
    similarity_score: number;
    content_preview: string;
  }>> {
    try {
      const searchResult = await this.vectorService.search({
        query: content,
        limit: 5,
        threshold: 0.3,
        includeContent: true,
        filters: {
          entityType: 'snippet'
        }
      });

      return searchResult.results.map((result: any) => ({
        snippet_id: result.id,
        title: result.title,
        similarity_score: result.similarity_score,
        content_preview: result.summary || result.content?.substring(0, 200) || ''
      }));

    } catch (error) {
      return [];
    }
  }

  /**
   * Generate automated action suggestions
   */
  private generateAutoActions(analysis: {
    ticket: any;
    similarTickets: any[];
    categoryAnalysis: any;
    priorityAnalysis: any;
    sentimentAnalysis: any;
  }): Array<{ action: string; confidence: number; reason: string }> {
    const actions = [];

    // Auto-categorization
    if (analysis.categoryAnalysis.confidence > 0.7) {
      actions.push({
        action: `Set category to "${analysis.categoryAnalysis.category}"`,
        confidence: analysis.categoryAnalysis.confidence,
        reason: 'High confidence category classification based on similar tickets'
      });
    }

    // Auto-priority
    if (analysis.priorityAnalysis.confidence > 0.8) {
      actions.push({
        action: `Set priority to "${analysis.priorityAnalysis.priority}"`,
        confidence: analysis.priorityAnalysis.confidence,
        reason: 'Content analysis indicates clear priority level'
      });
    }

    // Urgency escalation
    if (analysis.sentimentAnalysis.urgency_indicators.length > 2) {
      actions.push({
        action: 'Escalate to management',
        confidence: 0.9,
        reason: `Multiple urgency indicators detected: ${analysis.sentimentAnalysis.urgency_indicators.join(', ')}`
      });
    }

    // Knowledge base suggestions
    if (analysis.ticket.status === 'Open' && analysis.similarTickets.length > 0) {
      const resolvedSimilar = analysis.similarTickets.filter(t => t.resolution);
      if (resolvedSimilar.length > 0) {
        actions.push({
          action: 'Suggest knowledge base articles',
          confidence: 0.7,
          reason: `${resolvedSimilar.length} similar resolved tickets found with documented solutions`
        });
      }
    }

    return actions;
  }

  /**
   * Helper methods
   */
  async getTicketDetails(ticketId: number): Promise<any> {
    const request = this.conn.request();
    request.input('ticketId', mssql.Int, ticketId);
    
    const result = await request.query(`
      SELECT 
        t.*,
        s.name as site_name,
        a.name as asset_name,
        c.name as category_name,
        u.full_name as assignee_name
      FROM app.Tickets t
      LEFT JOIN app.Sites s ON t.site_id = s.site_id
      LEFT JOIN app.Assets a ON t.asset_id = a.asset_id
      LEFT JOIN app.Categories c ON t.category_id = c.category_id
      LEFT JOIN app.Users u ON t.assigned_to = u.user_id
      WHERE t.ticket_id = @ticketId
    `);

    return result.recordset[0] || null;
  }

  buildTicketContent(ticket: any): string {
    const parts = [
      ticket.summary || '',
      ticket.description || '',
      ticket.site_name || '',
      ticket.asset_name || '',
      ticket.category_name || ''
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async isCriticalSite(siteId: number): Promise<boolean> {
    // Implement site criticality check
    return false;
  }

  private async isCriticalAsset(assetId: number): Promise<boolean> {
    // Implement asset criticality check
    return false;
  }
}

/**
 * Helper function to create TicketAIService instance
 */
export async function createTicketAIService(request: FastifyRequest): Promise<TicketAIService> {
  const conn = await getSqlConnection(request);
  const vectorService = await createVectorSearchService(request);
  return new TicketAIService(conn, vectorService);
}