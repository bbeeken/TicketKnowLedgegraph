import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role, site_ids } = await request.json();

    // Validate required fields
    if (!email || !password || !full_name || !site_ids?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database call
    // This would typically:
    // 1. Verify the requesting user is an admin
    // 2. Hash the password
    // 3. Insert the new user into the database
    // 4. Return the created user data

    // Mock implementation
    const newUser = {
      id: crypto.randomUUID(),
      email,
      full_name,
      role,
      auth_provider: 'local',
      site_ids,
      created_at: new Date().toISOString(),
      is_active: true,
    };

    return NextResponse.json({
      user: newUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
