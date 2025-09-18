import { NextRequest, NextResponse } from 'next/server';

// Stateless JWT signout: client should delete its stored access/refresh tokens.
// We clear any legacy cookie but do not fabricate session invalidation.
export async function POST(_: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set('opsgraph_session', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  return response;
}
