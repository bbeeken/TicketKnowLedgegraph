import { NextApiRequest, NextApiResponse } from 'next';

// This endpoint is deprecated. The Fastify backend sets SESSION_CONTEXT('user_id')
// automatically for each authenticated request (see api/src/middleware/rls.ts).
// Keeping this here (returning 410) to surface any lingering UI calls so they can be removed.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(410).json({
    error: 'session-context endpoint removed',
    action: 'Remove client call; rely on bearer token for RLS context.'
  });
}
