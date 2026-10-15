import { NextRequest, NextResponse } from 'next/server';

function getGatewayUrl(): string {
  const url = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL;
  if (url && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }
  return 'http://localhost:8080';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gatewayUrl = getGatewayUrl();

    const response = await fetch(`${gatewayUrl}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const res = NextResponse.json(data, { status: 200 });

    if (data.session && data.session.token) {
      res.cookies.set('agentpay_session', data.session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error connecting to auth gateway';
    return NextResponse.json({ error: { code: 'GATEWAY_ERROR', message: msg } }, { status: 502 });
  }
}
