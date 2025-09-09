import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database authentication
    // This would typically:
    // 1. Look up user by email in the database
    // 2. Verify password hash
    // 3. Check if account is active
    // 4. Generate session token
    // 5. Set HTTP-only cookie for session management

    // Mock implementation - in real app, verify against database
    if (email === 'admin@opsgraph.com' && password === 'admin123') {
      const mockUser = {
        id: crypto.randomUUID(),
        email: 'admin@opsgraph.com',
        full_name: 'System Administrator',
        auth_provider: 'local',
        profile: {
          is_admin: true,
          role: 'admin',
          site_ids: [1, 2, 3, 4, 5, 6, 7], // Admin has access to all sites
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      const accessToken = 'mock_jwt_token_' + crypto.randomUUID();

      return NextResponse.json({
        user: mockUser,
        access_token: accessToken,
        message: 'Login successful'
      });
    }

    // Mock for regular user
    if (email === 'manager@hotsprings.com' && password === 'manager123') {
      const mockUser = {
        id: crypto.randomUUID(),
        email: 'manager@hotsprings.com',
        full_name: 'Site Manager',
        auth_provider: 'local',
        profile: {
          is_admin: false,
          role: 'manager',
          site_ids: [1], // Only access to Hot Springs site
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      const accessToken = 'mock_jwt_token_' + crypto.randomUUID();

      return NextResponse.json({
        user: mockUser,
        access_token: accessToken,
        message: 'Login successful'
      });
    }

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Local signin error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
