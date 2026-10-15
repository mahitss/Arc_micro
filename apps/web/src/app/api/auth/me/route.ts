import { NextRequest, NextResponse } from 'next/server';

function getGatewayUrl(): string {
  const url = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL;
  if (url && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }
  return 'http://localhost:8080';
}

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('agentpay_session')?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false, user: null, organization: null },
        { status: 401 }
      );
    }

    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/v1/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      const res = NextResponse.json(
        { authenticated: false, user: null, organization: null, error: data },
        { status: response.status }
      );
      // If session is expired or invalid, clear cookie
      if (response.status === 401) {
        res.cookies.delete('agentpay_session');
      }
      return res;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error checking session';
    return NextResponse.json({ authenticated: false, error: msg }, { status: 502 });
  }
}
