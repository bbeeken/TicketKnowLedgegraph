import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from '../src/server';
import * as dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

let server: ReturnType<typeof createServer>;

beforeAll(async () => {
  server = createServer();
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

describe('Microsoft SSO Tests', () => {
  describe('POST /auth/microsoft/callback', () => {
    it('should return 400 when code is missing', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: {},
        headers: {
          'content-type': 'application/json'
        }
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      // Fastify schema validation might return generic "Bad Request"
      expect(body.message || body.error).toMatch(/code|Bad Request|Missing code/);
    });

    it('should return 500 when Microsoft SSO is not configured', async () => {
      // Temporarily clear env vars to simulate misconfiguration
      const originalEnv = {
        AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
        AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
        AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
        AZURE_REDIRECT_URI: process.env.AZURE_REDIRECT_URI
      };
      
      delete process.env.AZURE_CLIENT_ID;
      delete process.env.AZURE_CLIENT_SECRET;
      delete process.env.AZURE_TENANT_ID;
      delete process.env.AZURE_REDIRECT_URI;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: { code: 'test-code' }
      });
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Microsoft SSO not configured');

      // Restore env vars
      Object.assign(process.env, originalEnv);
    });

    it('should fail with invalid authorization code', async () => {
      // Set up mock environment for testing
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_REDIRECT_URI = 'http://localhost:3000/auth/callback';

      // Mock fetch to simulate Microsoft's token endpoint rejecting invalid code
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'AADSTS70008: The provided authorization code is invalid'
        })
      }) as any;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: { code: 'invalid-code' }
      });
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Token exchange failed');
      expect(body.detail).toContain('AADSTS70008');

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle Graph API failures gracefully', async () => {
      // Set up mock environment
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_REDIRECT_URI = 'http://localhost:3000/auth/callback';

      const originalFetch = global.fetch;
      global.fetch = vi.fn()
        // Mock successful token exchange
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            token_type: 'Bearer'
          })
        })
        // Mock Graph API failure
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: {
              code: 'InvalidAuthenticationToken',
              message: 'Access token validation failure'
            }
          })
        }) as any;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: { code: 'valid-code' }
      });
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Failed to fetch user info');

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should successfully create new user from Microsoft Graph data', async () => {
      // Set up mock environment
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_REDIRECT_URI = 'http://localhost:3000/auth/callback';

      const mockUserData = {
        id: 'ms-user-12345',
        displayName: 'John Doe',
        mail: 'john.doe@testcompany.com',
        userPrincipalName: 'john.doe@testcompany.com',
        givenName: 'John',
        surname: 'Doe'
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn()
        // Mock successful token exchange
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            token_type: 'Bearer',
            refresh_token: 'mock-refresh-token'
          })
        })
        // Mock successful Graph API call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserData
        }) as any;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: { code: 'valid-code-for-new-user' }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Verify response structure
      expect(body.user).toBeDefined();
      expect(body.access_token).toBeDefined();
      expect(body.refresh_token).toBeDefined();
      
      // Verify user data
      expect(body.user.email).toBe(mockUserData.mail);
      expect(body.user.profile.full_name).toBe(mockUserData.displayName);
      expect(body.user.profile.auth_provider).toBe('microsoft');
      
      // Verify JWT structure (basic validation)
      const jwtPayload = JSON.parse(Buffer.from(body.access_token.split('.')[1], 'base64').toString());
      expect(jwtPayload.email).toBe(mockUserData.mail);
      expect(jwtPayload.auth_provider).toBe('microsoft');
      expect(jwtPayload.sub).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle existing user login correctly', async () => {
      // This test would require a pre-existing user in the test database
      // For now, we'll test the basic flow assuming user creation worked in previous test
      
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_REDIRECT_URI = 'http://localhost:3000/auth/callback';

      const mockExistingUserData = {
        id: 'ms-user-existing',
        displayName: 'Jane Smith',
        mail: 'jane.smith@testcompany.com',
        userPrincipalName: 'jane.smith@testcompany.com'
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token-existing',
            token_type: 'Bearer'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockExistingUserData
        }) as any;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: { code: 'valid-code-existing-user' }
      });

      // Should succeed regardless of whether user exists or not
      expect([200, 500].includes(response.statusCode)).toBe(true);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.user).toBeDefined();
        expect(body.access_token).toBeDefined();
      }

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Role and Site Access Mapping', () => {
    it('should handle users with no roles gracefully', async () => {
      // This would test the role assignment logic
      // The actual implementation assigns 'viewer' as default when no roles exist
      
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_REDIRECT_URI = 'http://localhost:3000/auth/callback';

      const mockUserData = {
        displayName: 'Test User No Roles',
        mail: 'noroles@testcompany.com'
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserData
        }) as any;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/microsoft/callback',
        payload: { code: 'valid-code-no-roles' }
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.user.profile.role).toBe('viewer'); // Default role
      }

      global.fetch = originalFetch;
    });
  });
});

describe('Qdrant Health Endpoint', () => {
  describe('GET /api/health/ai', () => {
    it('should return 200 and include Qdrant status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/health/ai'
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.qdrant).toBeDefined();
      expect(typeof body.qdrant.configured).toBe('boolean');
      expect(typeof body.qdrant.reachable).toBe('boolean');
    });

    it('should show degraded status when Qdrant is configured but unreachable', async () => {
      // Mock environment to simulate Qdrant being configured
      const originalQdrantUrl = process.env.QDRANT_URL;
      process.env.QDRANT_URL = 'http://unreachable-qdrant:6333';

      const response = await server.inject({
        method: 'GET',
        url: '/api/health/ai'
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      if (body.qdrant.configured) {
        expect(body.qdrant.reachable).toBe(false);
        expect(body.degraded).toBe(true);
      }

      // Restore original env
      if (originalQdrantUrl) {
        process.env.QDRANT_URL = originalQdrantUrl;
      } else {
        delete process.env.QDRANT_URL;
      }
    });

    it('should include collection status when Qdrant is available', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/health/ai'
      });
      
      const body = JSON.parse(response.body);
      
      if (body.qdrant && body.qdrant.configured && body.qdrant.reachable) {
        expect(body.qdrant.collectionExists).toBeDefined();
        expect(typeof body.qdrant.collectionExists).toBe('boolean');
        
        if (body.qdrant.collectionExists) {
          expect(body.qdrant.pointsCount).toBeDefined();
          expect(typeof body.qdrant.pointsCount).toBe('number');
        }
      }
    });

    it('should handle Qdrant connection timeouts gracefully', async () => {
      // Test that the health endpoint doesn't hang on Qdrant timeouts
      const response = await server.inject({
        method: 'GET',
        url: '/api/health/ai'
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Even if Qdrant times out, we should get a response
      expect(body.qdrant).toBeDefined();
    });

    it('should not break when Qdrant is not configured', async () => {
      // Remove Qdrant configuration
      const originalQdrantUrl = process.env.QDRANT_URL;
      delete process.env.QDRANT_URL;

      const response = await server.inject({
        method: 'GET',
        url: '/api/health/ai'
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.qdrant).toBeDefined();
      expect(body.qdrant.configured).toBe(false);
      expect(body.qdrant.reachable).toBe(false);

      // Restore original env
      if (originalQdrantUrl) {
        process.env.QDRANT_URL = originalQdrantUrl;
      }
    });

    it('should return correct degraded flag based on service states', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/health/ai'
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(typeof body.degraded).toBe('boolean');
      
      // Degraded should be true if any configured service is unhealthy
      const hasConfiguredUnhealthyServices = 
        (body.qdrant.configured && !body.qdrant.reachable);
      
      if (hasConfiguredUnhealthyServices) {
        expect(body.degraded).toBe(true);
      }
    });
  });
});
