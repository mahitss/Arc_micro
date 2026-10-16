import { NextResponse } from 'next/server';

function getGatewayUrl(): string {
  const url = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL;
  return (url && url.trim() ? url.trim() : 'http://localhost:8080').replace(/\/$/, '');
}

export async function GET() {
  try {
    const res = await fetch(`${getGatewayUrl()}/health`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: 'OFFLINE' }, { status: 503 });
  }
}
