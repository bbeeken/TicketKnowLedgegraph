import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { withRls } from '../sql';

export async function registerVendorRoutes(fastify: FastifyInstance) {
  // GET /vendors - list all vendors
  fastify.get('/vendors', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const vendors = await withRls(userId, async (conn) => {
        const res = await conn.request().query(`
          SELECT vendor_id, name, category, created_at, updated_at 
          FROM kg.Vendor 
          ORDER BY name
        `);
        return res.recordset;
      });
      return vendors;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch vendors');
      return reply.code(500).send({ error: 'Failed to fetch vendors' });
    }
  });

  // GET /vendors/:id - get vendor with assets
  fastify.get('/vendors/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string() });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid vendor ID' });

    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const vendorId = Number(params.data.id);
      
      // Get vendor details
      const vendor = await withRls(userId, async (conn) => {
        const res = await conn.request()
          .input('vendor_id', vendorId)
          .query(`
            SELECT vendor_id, name, category, created_at, updated_at 
            FROM kg.Vendor 
            WHERE vendor_id = @vendor_id
          `);
        return res.recordset[0];
      });

      if (!vendor) {
        return reply.code(404).send({ error: 'Vendor not found' });
      }

      // Get assets for this vendor
      const assets = await withRls(userId, async (conn) => {
        const res = await conn.request()
          .input('vendor_id', vendorId)
          .query(`
            SELECT 
              a.asset_id, 
              a.site_id,
              a.type, 
              a.model, 
              a.serial, 
              a.location,
              a.purchase_date,
              a.warranty_until,
              s.name as site_name
            FROM app.Assets a
            LEFT JOIN app.Sites s ON a.site_id = s.site_id
            WHERE a.vendor_id = @vendor_id
            ORDER BY a.asset_id
          `);
        return res.recordset;
      });

      return {
        ...vendor,
        assets
      };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch vendor details');
      return reply.code(500).send({ error: 'Failed to fetch vendor details' });
    }
  });

  // GET /vendors/:id/assets - get assets for a vendor
  fastify.get('/vendors/:id/assets', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string() });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid vendor ID' });

    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const vendorId = Number(params.data.id);
      
      const assets = await withRls(userId, async (conn) => {
        const res = await conn.request()
          .input('vendor_id', vendorId)
          .query(`
            SELECT 
              a.asset_id, 
              a.site_id,
              a.zone_id,
              a.type, 
              a.model, 
              a.serial, 
              a.location,
              a.purchase_date,
              a.warranty_until,
              a.created_at,
              a.updated_at,
              s.name as site_name
            FROM app.Assets a
            LEFT JOIN app.Sites s ON a.site_id = s.site_id
            WHERE a.vendor_id = @vendor_id
            ORDER BY s.name, a.type, a.model
          `);
        return res.recordset;
      });

      return assets;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch vendor assets');
      return reply.code(500).send({ error: 'Failed to fetch vendor assets' });
    }
  });
}
