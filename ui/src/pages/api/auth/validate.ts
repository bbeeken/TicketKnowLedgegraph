import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Mock token validation - in real app, validate JWT or session
    if (token.startsWith('mock_jwt_token_admin_')) {
      const mockUser = {
        id: 'admin-001',
        email: 'admin@heinzcorps.com',
        full_name: 'System Administrator',
        auth_provider: 'local',
        profile: {
          is_admin: true,
          role: 'admin',
          site_ids: [1000, 1001, 1002, 1006, 1009, 1021, 2000],
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      return res.status(200).json({ user: mockUser });
    }

    if (token.startsWith('mock_jwt_token_vermillion_')) {
      const mockUser = {
        id: 'manager-vermillion',
        email: 'manager@vermillion.com',
        full_name: 'Vermillion Site Manager',
        auth_provider: 'local',
        profile: {
          is_admin: false,
          role: 'manager',
          site_ids: [1006], // Only Vermillion (Store ID: 1006)
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      return res.status(200).json({ user: mockUser });
    }

    if (token.startsWith('mock_jwt_token_steele_')) {
      const mockUser = {
        id: 'tech-steele',
        email: 'tech@steele.com',
        full_name: 'Steele Site Technician',
        auth_provider: 'local',
        profile: {
          is_admin: false,
          role: 'technician',
          site_ids: [1002], // Only Steele (Store ID: 1002)
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      return res.status(200).json({ user: mockUser });
    }

    if (token.startsWith('mock_jwt_token_hotsprings_')) {
      const mockUser = {
        id: 'manager-hotsprings',
        email: 'manager@hotsprings.com',
        full_name: 'Hot Springs Site Manager',
        auth_provider: 'local',
        profile: {
          is_admin: false,
          role: 'manager',
          site_ids: [1009], // Only Hot Springs (Store ID: 1009)
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      return res.status(200).json({ user: mockUser });
    }

    if (token.startsWith('mock_jwt_token_summit_')) {
      const mockUser = {
        id: 'tech-summit',
        email: 'tech@summit.com',
        full_name: 'Summit Site Technician',
        auth_provider: 'local',
        profile: {
          is_admin: false,
          role: 'technician',
          site_ids: [1001], // Only Summit (Store ID: 1001)
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      return res.status(200).json({ user: mockUser });
    }

    return res.status(401).json({ error: 'Invalid token' });

  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
}
