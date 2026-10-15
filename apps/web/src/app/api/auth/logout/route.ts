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
    const sessionToken = req.cookies.get('agentpay_session')?.value;
    const gatewayUrl = getGatewayUrl();

    if (sessionToken) {
      await fetch(`${gatewayUrl}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      }).catch(() => null);
    }

    const res = NextResponse.json({ status: 'success', message: 'Logged out successfully' });
    res.cookies.delete('agentpay_session');
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error logging out';
    return NextResponse.json({ error: { code: 'LOGOUT_ERROR', message: msg } }, { status: 500 });
  }
}
