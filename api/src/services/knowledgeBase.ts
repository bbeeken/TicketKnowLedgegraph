import { FastifyRequest } from 'fastify';
import { getSqlConnection, RequestSqlConnection } from '../db/sql';
import * as mssql from 'mssql';

export interface KnowledgeArticle {
  id: number;
  title: string;
  category: string;
  subcategory?: string;
  content: string;
  summary: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  helpful: number;
  notHelpful: number;
  views: number;
  featured: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedReadTime: number;
  relatedArticles: number[];
  attachments?: {
    type: 'image' | 'video' | 'document';
    url: string;
    filename: string;
  }[];
}

export interface TroubleshootingGuide {
  id: number;
  title: string;
  problem: string;
  solution: string;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tools: string[];
  steps: string[];
  prerequisites: string[];
  warnings: string[];
  successRate: number;
  timeSaved: number;
  categories: string[];
  tags: string[];
  videoUrl?: string;
  images: string[];
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  views: number;
  featured: boolean;
}

export interface VideoTutorial {
  id: number;
  title: string;
  description: string;
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  category: string;
  tags: string[];
  instructor: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  views: number;
  rating: number;
  transcript?: string;
  chapters: {
    title: string;
    timestamp: number;
  }[];
}

export interface SearchFilters {
  query?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export class KnowledgeBaseService {
  private conn: RequestSqlConnection;

  constructor(conn: RequestSqlConnection) {
    this.conn = conn;
  }

  // Articles
  async getArticles(filters: SearchFilters = {}): Promise<KnowledgeArticle[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.query) {
      whereClause += ` AND (
        title LIKE @query OR
        content LIKE @query OR
        summary LIKE @query OR
        @query IN (SELECT value FROM OPENJSON(tags))
      )`;
  params.push({ name: 'query', type: mssql.NVarChar, value: `%${filters.query}%` });
    }

    if (filters.category) {
      whereClause += ' AND category = @category';
  params.push({ name: 'category', type: mssql.NVarChar, value: filters.category });
    }

    if (filters.difficulty) {
      whereClause += ' AND difficulty = @difficulty';
  params.push({ name: 'difficulty', type: mssql.NVarChar, value: filters.difficulty });
    }

    if (filters.featured !== undefined) {
      whereClause += ' AND featured = @featured';
  params.push({ name: 'featured', type: mssql.Bit, value: filters.featured });
    }

    let limitClause = '';
    if (filters.limit) {
      limitClause = 'TOP (@limit)';
  params.push({ name: 'limit', type: mssql.Int, value: filters.limit });
    }

    const query = `
      SELECT ${limitClause}
        id,
        title,
        category,
        subcategory,
        content,
        summary,
        tags,
        author,
        created_at as createdAt,
        updated_at as updatedAt,
        helpful,
        not_helpful as notHelpful,
        views,
        featured,
        difficulty,
        estimated_read_time as estimatedReadTime,
        related_articles as relatedArticles,
        attachments
      FROM knowledge_articles
      ${whereClause}
      ORDER BY featured DESC, views DESC, created_at DESC
    `;

    const request = this.conn.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      relatedArticles: JSON.parse(row.relatedArticles || '[]'),
      attachments: JSON.parse(row.attachments || '[]'),
    }));
  }

  async getArticleById(id: number): Promise<KnowledgeArticle | null> {
    // First update view count
    await this.conn.request()
      .input('id', mssql.Int, id)
      .query('UPDATE knowledge_articles SET views = views + 1 WHERE id = @id');

    const request = this.conn.request()
      .input('id', mssql.Int, id);

    const result = await request.query(`
      SELECT
        id,
        title,
        category,
        subcategory,
        content,
        summary,
        tags,
        author,
        created_at as createdAt,
        updated_at as updatedAt,
        helpful,
        not_helpful as notHelpful,
        views,
        featured,
        difficulty,
        estimated_read_time as estimatedReadTime,
        related_articles as relatedArticles,
        attachments
      FROM knowledge_articles
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      relatedArticles: JSON.parse(row.relatedArticles || '[]'),
      attachments: JSON.parse(row.attachments || '[]'),
    };
  }

  async voteArticle(id: number, helpful: boolean): Promise<boolean> {
    const column = helpful ? 'helpful' : 'not_helpful';
    const result = await this.conn.request()
      .input('id', mssql.Int, id)
      .query(`UPDATE knowledge_articles SET ${column} = ${column} + 1 WHERE id = @id`);

    return result.rowsAffected[0] > 0;
  }

  // Troubleshooting Guides
  async getGuides(filters: SearchFilters = {}): Promise<TroubleshootingGuide[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.query) {
      whereClause += ` AND (
        title LIKE @query OR
        problem LIKE @query OR
        solution LIKE @query OR
        @query IN (SELECT value FROM OPENJSON(tags))
      )`;
  params.push({ name: 'query', type: mssql.NVarChar, value: `%${filters.query}%` });
    }

    if (filters.category) {
      whereClause += ` AND @category IN (SELECT value FROM OPENJSON(categories))`;
  params.push({ name: 'category', type: mssql.NVarChar, value: filters.category });
    }

    const query = `
      SELECT
        id,
        title,
        problem,
        solution,
        estimated_time as estimatedTime,
        difficulty,
        tools,
        steps,
        prerequisites,
        warnings,
        success_rate as successRate,
        time_saved as timeSaved,
        categories,
        tags,
        video_url as videoUrl,
        images
      FROM troubleshooting_guides
      ${whereClause}
      ORDER BY success_rate DESC, time_saved DESC
    `;

  const request = this.conn.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      tools: JSON.parse(row.tools || '[]'),
      steps: JSON.parse(row.steps || '[]'),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      warnings: JSON.parse(row.warnings || '[]'),
      categories: JSON.parse(row.categories || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      images: JSON.parse(row.images || '[]'),
    }));
  }

  async getGuideById(id: number): Promise<TroubleshootingGuide | null> {
    const request = this.conn.request()
      .input('id', mssql.Int, id);

    const result = await request.query(`
      SELECT
        id,
        title,
        problem,
        solution,
        estimated_time as estimatedTime,
        difficulty,
        tools,
        steps,
        prerequisites,
        warnings,
        success_rate as successRate,
        time_saved as timeSaved,
        categories,
        tags,
        video_url as videoUrl,
        images
      FROM troubleshooting_guides
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...row,
      tools: JSON.parse(row.tools || '[]'),
      steps: JSON.parse(row.steps || '[]'),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      warnings: JSON.parse(row.warnings || '[]'),
      categories: JSON.parse(row.categories || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      images: JSON.parse(row.images || '[]'),
    };
  }

  // FAQs
  async getFAQs(filters: SearchFilters = {}): Promise<FAQ[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.query) {
      whereClause += ` AND (
        question LIKE @query OR
        answer LIKE @query OR
        @query IN (SELECT value FROM OPENJSON(tags))
      )`;
  params.push({ name: 'query', type: mssql.NVarChar, value: `%${filters.query}%` });
    }

    if (filters.category) {
      whereClause += ' AND category = @category';
  params.push({ name: 'category', type: mssql.NVarChar, value: filters.category });
    }

    if (filters.featured !== undefined) {
      whereClause += ' AND featured = @featured';
      params.push({ name: 'featured', type: 'Bit', value: filters.featured });
    }

    const query = `
      SELECT
        id,
        question,
        answer,
        category,
        tags,
        helpful,
        views,
        featured
      FROM faqs
      ${whereClause}
      ORDER BY featured DESC, helpful DESC, views DESC
    `;

  const request = this.conn.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
    }));
  }

  async getFAQById(id: number): Promise<FAQ | null> {
    // First update view count
      await this.conn.request()
        .input('id', mssql.Int, id)
      .query('UPDATE faqs SET views = views + 1 WHERE id = @id');

    const request = this.conn.request()
      .input('id', mssql.Int, id);

    const result = await request.query(`
      SELECT
        id,
        question,
        answer,
        category,
        tags,
        helpful,
        views,
        featured
      FROM faqs
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  async voteFAQ(id: number, helpful: boolean): Promise<boolean> {
    const result = await this.conn.request()
      .input('id', mssql.Int, id)
      .query('UPDATE faqs SET helpful = helpful + 1 WHERE id = @id');

    return result.rowsAffected[0] > 0;
  }

  // Video Tutorials
  async getVideos(filters: SearchFilters = {}): Promise<VideoTutorial[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.query) {
      whereClause += ` AND (
        title LIKE @query OR
        description LIKE @query OR
        @query IN (SELECT value FROM OPENJSON(tags))
      )`;
  params.push({ name: 'query', type: mssql.NVarChar, value: `%${filters.query}%` });
    }

    if (filters.category) {
      whereClause += ' AND category = @category';
  params.push({ name: 'category', type: mssql.NVarChar, value: filters.category });
    }

    if (filters.difficulty) {
      whereClause += ' AND difficulty = @difficulty';
  params.push({ name: 'difficulty', type: mssql.NVarChar, value: filters.difficulty });
    }

    const query = `
      SELECT
        id,
        title,
        description,
        duration,
        thumbnail_url as thumbnailUrl,
        video_url as videoUrl,
        category,
        tags,
        instructor,
        difficulty,
        views,
        rating,
        transcript,
        chapters
      FROM video_tutorials
      ${whereClause}
      ORDER BY rating DESC, views DESC
    `;

    const request = this.conn.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      chapters: JSON.parse(row.chapters || '[]'),
    }));
  }

  async getVideoById(id: number): Promise<VideoTutorial | null> {
    // First update view count
    await this.conn.request()
      .input('id', mssql.Int, id)
      .query('UPDATE video_tutorials SET views = views + 1 WHERE id = @id');

    const request = this.conn.request()
      .input('id', mssql.Int, id);

    const result = await request.query(`
      SELECT
        id,
        title,
        description,
        duration,
        thumbnail_url as thumbnailUrl,
        video_url as videoUrl,
        category,
        tags,
        instructor,
        difficulty,
        views,
        rating,
        transcript,
        chapters
      FROM video_tutorials
      WHERE id = @id
    `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      chapters: JSON.parse(row.chapters || '[]'),
    };
  }

  // Analytics
  async getKnowledgeBaseStats() {
    const queries = [
      'SELECT COUNT(*) as count FROM knowledge_articles',
      'SELECT COUNT(*) as count FROM troubleshooting_guides',
      'SELECT COUNT(*) as count FROM faqs',
      'SELECT COUNT(*) as count FROM video_tutorials',
      'SELECT COALESCE(SUM(views), 0) as total FROM knowledge_articles',
      'SELECT COALESCE(SUM(views), 0) as total FROM faqs',
      'SELECT COALESCE(SUM(views), 0) as total FROM video_tutorials',
      'SELECT COALESCE(SUM(helpful), 0) as total FROM knowledge_articles',
      'SELECT COALESCE(SUM(helpful), 0) as total FROM faqs',
    ];

    const results = await Promise.all(
      queries.map(query => this.conn.request().query(query))
    );

    const articles = parseInt(results[0].recordset[0].count);
    const guides = parseInt(results[1].recordset[0].count);
    const faqs = parseInt(results[2].recordset[0].count);
    const videos = parseInt(results[3].recordset[0].count);
    const articleViews = parseInt(results[4].recordset[0].total);
    const faqViews = parseInt(results[5].recordset[0].total);
    const videoViews = parseInt(results[6].recordset[0].total);
    const articleHelpful = parseInt(results[7].recordset[0].total);
    const faqHelpful = parseInt(results[8].recordset[0].total);

    return {
      articles,
      guides,
      faqs,
      videos,
      totalViews: articleViews + faqViews + videoViews,
      totalHelpful: articleHelpful + faqHelpful,
    };
  }

  async getPopularTags(): Promise<{ tag: string; count: number }[]> {
    const result = await this.conn.request().query(`
      SELECT
        tag,
        COUNT(*) as count
      FROM (
        SELECT value as tag FROM knowledge_articles CROSS APPLY OPENJSON(tags)
        UNION ALL
        SELECT value as tag FROM troubleshooting_guides CROSS APPLY OPENJSON(tags)
        UNION ALL
        SELECT value as tag FROM faqs CROSS APPLY OPENJSON(tags)
        UNION ALL
        SELECT value as tag FROM video_tutorials CROSS APPLY OPENJSON(tags)
      ) as all_tags
      GROUP BY tag
      ORDER BY count DESC
    `);

    return result.recordset.map((row: any) => ({
      tag: row.tag,
      count: parseInt(row.count),
    }));
  }

  async getCategories(): Promise<string[]> {
    const result = await this.conn.request().query(`
      SELECT DISTINCT category
      FROM (
        SELECT category FROM knowledge_articles
        UNION
        SELECT value as category FROM troubleshooting_guides CROSS APPLY OPENJSON(categories)
        UNION
        SELECT category FROM faqs
        UNION
        SELECT category FROM video_tutorials
      ) as all_categories
      ORDER BY category
    `);

    return result.recordset.map((row: any) => row.category);
  }
}
