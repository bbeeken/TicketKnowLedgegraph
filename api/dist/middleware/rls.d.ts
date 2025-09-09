import { FastifyRequest } from 'fastify';
import { RequestWithSql } from '../db/sql';
/**
 * Extract request context for RLS operations
 * This function provides a bridge between Fastify request and SQL context
 */
export declare function getRequestFromContext(request: FastifyRequest): RequestWithSql;
/**
 * Middleware to validate user authentication and extract user ID
 * Used for RLS context setting
 */
export declare function getUserIdFromRequest(request: RequestWithSql): string | null;
/**
 * Validate that user has access to a specific site
 * This should integrate with your RLS predicates
 */
export declare function validateSiteAccess(userId: string, siteId: number): Promise<boolean>;
/**
 * Extract and validate site ID from request
 */
export declare function getSiteIdFromRequest(request: RequestWithSql): number | null;
//# sourceMappingURL=rls.d.ts.map