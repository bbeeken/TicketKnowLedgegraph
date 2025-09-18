import { NextRequest, NextResponse } from 'next/server';

// This endpoint previously returned a fabricated Microsoft user. All mock logic has been removed.
// Proper Microsoft OAuth integration should be implemented in the backend API (Fastify) to:
//  1. Exchange the authorization code for tokens (Azure AD v2.0 /oauth2/v2.0/token)
//  2. Retrieve the user profile (Microsoft Graph /me)
//  3. Upsert the user and site/team access in the OpsGraph database
//  4. Issue a signed JWT (same issuer/audience as local auth) and return it to the UI
// Until that flow exists, we make the absence explicit with 501.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }
    return NextResponse.json({
      error: 'Microsoft SSO not implemented',
      details: 'Backend SSO flow must exchange code -> token, fetch Graph profile, map to user, then issue OpsGraph JWT.'
    }, { status: 501 });
  } catch (err) {
    console.error('Microsoft callback handler error:', err);
    return NextResponse.json({ error: 'Failed to process Microsoft callback' }, { status: 500 });
  }
}
