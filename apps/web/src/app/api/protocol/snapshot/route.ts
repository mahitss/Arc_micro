import { NextResponse } from 'next/server';
import { getBaseApiUrl } from '../../../../lib/api/client';

export async function GET() {
  try {
    const baseUrl = getBaseApiUrl();
    const res = await fetch(`${baseUrl}/protocol/v1/snapshot`, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gateway returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reach protocol gateway' },
      { status: 503 }
    );
  }
}
