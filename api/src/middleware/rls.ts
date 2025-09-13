import { FastifyRequest } from 'fastify';
import { RequestWithSql, SQL_CONN_SYMBOL, RequestSqlConnection } from '../db/sql';
import * as sql from 'mssql';

/**
 * Extract request context for RLS operations
 * This function provides a bridge between Fastify request and SQL context
 */
export function getRequestFromContext(request: FastifyRequest): sql.Request | null {
  const req = request as RequestWithSql;
  const conn = req[SQL_CONN_SYMBOL] as RequestSqlConnection | undefined;
  return conn ? conn.request() : null;
}

/**
 * Middleware to validate user authentication and extract user ID
 * Used for RLS context setting
 */
export function getUserIdFromRequest(request: RequestWithSql): string | null {
  // Extract user ID from JWT token
  if (request.user?.sub) {
    return request.user.sub.toString();
  }
  
  // Fallback: check headers for user ID (for development/testing)
  const userIdHeader = request.headers['x-user-id'];
  if (userIdHeader && typeof userIdHeader === 'string') {
    return userIdHeader;
  }
  
  return null;
}

/**
 * Validate that user has access to a specific site
 * This should integrate with your RLS predicates
 */
export async function validateSiteAccess(userId: string, siteId: number): Promise<boolean> {
  // TODO: Implement actual site access validation
  // This would typically query the database to check if the user
  // has access to the specified site based on their role and assignments
  
  // For now, return true (all users can access all sites)
  // In production, this should check against sec.fn_TicketAccessPredicate
  return true;
}

/**
 * Extract and validate site ID from request
 */
export function getSiteIdFromRequest(request: RequestWithSql): number | null {
  // Check query parameters
  const siteIdQuery = request.query as any;
  if (siteIdQuery?.siteId) {
    const siteId = parseInt(siteIdQuery.siteId);
    return isNaN(siteId) ? null : siteId;
  }
  
  // Check route parameters
  const siteIdParam = (request.params as any)?.siteId;
  if (siteIdParam) {
    const siteId = parseInt(siteIdParam);
    return isNaN(siteId) ? null : siteId;
  }
  
  return null;
}
