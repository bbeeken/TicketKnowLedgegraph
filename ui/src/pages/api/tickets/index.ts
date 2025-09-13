import { NextApiRequest, NextApiResponse } from 'next';

// Mock tickets data with Coffee Cup Travel Plaza Store IDs
const mockTickets = [
  {
    id: 1,
    title: 'POS System Down',
    description: 'Main POS terminal not responding at register 1',
    status: 'open',
    priority: 'high',
    site_id: 1006, // Vermillion (Store ID 1006)
    site_name: 'Coffee Cup Travel Plaza - Burbank',
    assigned_to: 'manager-vermillion',
    created_at: '2025-09-10T08:00:00Z',
    updated_at: '2025-09-10T08:00:00Z',
  },
  {
    id: 2,
    title: 'Fuel Dispenser Error',
    description: 'Fuel dispenser showing error code E03 - needs immediate attention',
    status: 'in_progress',
    priority: 'high',
    site_id: 1002, // Steele (Store ID 1002)
    site_name: 'Coffee Cup Travel Plaza - Steele',
    assigned_to: 'tech-steele',
    created_at: '2025-09-10T09:15:00Z',
    updated_at: '2025-09-10T10:30:00Z',
  },
  {
    id: 3,
    title: 'HVAC Temperature Issues',
    description: 'Store too warm, HVAC system not cooling properly',
    status: 'open',
    priority: 'medium',
    site_id: 1001, // Summit (Store ID 1001)
    site_name: 'Coffee Cup Travel Plaza - Summit',
    assigned_to: 'tech-summit',
    created_at: '2025-09-10T07:45:00Z',
    updated_at: '2025-09-10T07:45:00Z',
  },
  {
    id: 4,
    title: 'Truck Service Bay Equipment',
    description: 'Hydraulic lift not functioning in service bay',
    status: 'open',
    priority: 'high',
    site_id: 1021, // SummitShop (Store ID 1021)
    site_name: 'TA Truck Service Center - Summit SD',
    assigned_to: null,
    created_at: '2025-09-10T10:00:00Z',
    updated_at: '2025-09-10T10:00:00Z',
  },
  {
    id: 5,
    title: 'Coffee Machine Malfunction',
    description: 'Main coffee machine not brewing, backup unit operational',
    status: 'closed',
    priority: 'medium',
    site_id: 1009, // Hot Springs (Store ID 1009)
    site_name: 'Coffee Cup Travel Plaza - Hot Springs',
    assigned_to: 'manager-hotsprings',
    created_at: '2025-09-09T14:30:00Z',
    updated_at: '2025-09-10T11:00:00Z',
  },
  {
    id: 6,
    title: 'Network Connectivity Issues',
    description: 'Intermittent internet connectivity affecting card readers',
    status: 'open',
    priority: 'high',
    site_id: 1006, // Vermillion (Store ID 1006)
    site_name: 'Coffee Cup Travel Plaza - Burbank',
    assigned_to: null,
    created_at: '2025-09-10T11:30:00Z',
    updated_at: '2025-09-10T11:30:00Z',
  },
  {
    id: 7,
    title: 'Lighting Issues in Parking Lot',
    description: 'Several LED lights not working in main parking area',
    status: 'open',
    priority: 'low',
    site_id: 1002, // Steele (Store ID 1002)
    site_name: 'Coffee Cup Travel Plaza - Steele',
    assigned_to: 'tech-steele',
    created_at: '2025-09-10T06:00:00Z',
    updated_at: '2025-09-10T06:00:00Z',
  },
  {
    id: 8,
    title: 'Freezer Temperature Alert',
    description: 'Walk-in freezer temperature rising, needs immediate check',
    status: 'in_progress',
    priority: 'critical',
    site_id: 1001, // Summit (Store ID 1001)
    site_name: 'Coffee Cup Travel Plaza - Summit',
    assigned_to: 'tech-summit',
    created_at: '2025-09-10T12:00:00Z',
    updated_at: '2025-09-10T12:15:00Z',
  },
];

function getUserFromToken(token: string): { id: string; site_ids: number[]; is_admin: boolean } | null {
  if (token.startsWith('mock_jwt_token_admin_')) {
    return { id: 'admin-001', site_ids: [1000, 1001, 1002, 1006, 1009, 1021, 2000], is_admin: true };
  }
  if (token.startsWith('mock_jwt_token_vermillion_')) {
    return { id: 'manager-vermillion', site_ids: [1006], is_admin: false }; // Vermillion only
  }
  if (token.startsWith('mock_jwt_token_steele_')) {
    return { id: 'tech-steele', site_ids: [1002], is_admin: false }; // Steele only
  }
  if (token.startsWith('mock_jwt_token_summit_')) {
    return { id: 'tech-summit', site_ids: [1001], is_admin: false }; // Summit only
  }
  if (token.startsWith('mock_jwt_token_hotsprings_')) {
    return { id: 'manager-hotsprings', site_ids: [1009], is_admin: false }; // Hot Springs only
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract user from token for site-based filtering (RLS simulation)
    const authHeader = req.headers.authorization;
    let userSiteIds: number[] = [];
    let isAdmin = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const user = getUserFromToken(token);
      if (user) {
        userSiteIds = user.site_ids;
        isAdmin = user.is_admin;
      }
    }

    if (req.method === 'GET') {
      // Filter tickets based on user's site access (simulating RLS)
      let filteredTickets = mockTickets;
      
      if (!isAdmin && userSiteIds.length > 0) {
        filteredTickets = mockTickets.filter(ticket => 
          userSiteIds.includes(ticket.site_id)
        );
      }

      return res.status(200).json({
        tickets: filteredTickets,
        total: filteredTickets.length,
        user_sites: userSiteIds,
        is_admin: isAdmin,
      });
    }

    if (req.method === 'POST') {
      const { title, description, priority, site_id } = req.body;

      if (!title || !description || !site_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user has access to this site
      if (!isAdmin && !userSiteIds.includes(site_id)) {
        return res.status(403).json({ error: 'Access denied to this site' });
      }

      const newTicket = {
        id: mockTickets.length + 1,
        title,
        description,
        status: 'open',
        priority: priority || 'medium',
        site_id,
        site_name: getSiteName(site_id),
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTickets.push(newTicket);

      return res.status(201).json({
        ticket: newTicket,
        message: 'Ticket created successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Tickets API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getSiteName(siteId: number): string {
  const siteNames: Record<number, string> = {
    1000: 'Coffee Cup Travel Plaza - Corporate Office',
    1001: 'Coffee Cup Travel Plaza - Summit',
    1002: 'Coffee Cup Travel Plaza - Steele',
    1006: 'Coffee Cup Travel Plaza - Burbank',
    1009: 'Coffee Cup Travel Plaza - Hot Springs',
    1021: 'TA Truck Service Center - Summit SD',
    2000: 'Heinz Real Estate',
  };
  return siteNames[siteId] || 'Unknown Site';
}
