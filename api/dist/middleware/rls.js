"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestFromContext = getRequestFromContext;
exports.getUserIdFromRequest = getUserIdFromRequest;
exports.validateSiteAccess = validateSiteAccess;
exports.getSiteIdFromRequest = getSiteIdFromRequest;
/**
 * Extract request context for RLS operations
 * This function provides a bridge between Fastify request and SQL context
 */
function getRequestFromContext(request) {
    return request;
}
/**
 * Middleware to validate user authentication and extract user ID
 * Used for RLS context setting
 */
function getUserIdFromRequest(request) {
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
async function validateSiteAccess(userId, siteId) {
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
function getSiteIdFromRequest(request) {
    // Check query parameters
    const siteIdQuery = request.query;
    if (siteIdQuery?.siteId) {
        const siteId = parseInt(siteIdQuery.siteId);
        return isNaN(siteId) ? null : siteId;
    }
    // Check route parameters
    const siteIdParam = request.params?.siteId;
    if (siteIdParam) {
        const siteId = parseInt(siteIdParam);
        return isNaN(siteId) ? null : siteId;
    }
    return null;
}
//# sourceMappingURL=rls.js.map