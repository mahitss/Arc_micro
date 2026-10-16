import { NextRequest, NextResponse } from 'next/server';

function getGatewayUrl(): string {
  const url = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL;
  if (url && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }
  return 'http://localhost:8080';
}

async function proxyRequest(req: NextRequest, params: { path?: string[] }) {
  const path = params.path ? params.path.join('/') : '';
  const search = req.nextUrl.search || '';
  const gatewayUrl = getGatewayUrl();
  const targetUrl = `${gatewayUrl}/v1/${path}${search}`;

  const sessionToken = req.cookies.get('agentpay_session')?.value;
  const incomingAuth = req.headers.get('authorization');
  const incomingApiKey = req.headers.get('x-api-key');

  const isPublic =
    path === 'health' ||
    path === 'ready' ||
    path === 'auth/signup' ||
    path === 'auth/login';

  // Explicitly disallow fallback to demo keys for protected routes
  const hasValidDirectKey = Boolean(
    (incomingAuth && !incomingAuth.includes('apk_live_demo')) ||
    (incomingApiKey && !incomingApiKey.includes('apk_live_demo'))
  );

  if (!isPublic && !sessionToken && !hasValidDirectKey) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in or provide a valid API key.',
        },
      },
      { status: 401 }
    );
  }

  // Build clean request headers for the Go Gateway
  const headers = new Headers();
  headers.set('Accept', req.headers.get('accept') || 'application/json');
  if (req.headers.get('content-type')) {
    headers.set('Content-Type', req.headers.get('content-type')!);
  }
  if (req.headers.get('x-request-id')) {
    headers.set('X-Request-ID', req.headers.get('x-request-id')!);
  }

  // Forward session token as Bearer token
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
    headers.set('X-Session-Token', sessionToken);
  } else if (hasValidDirectKey) {
    if (incomingAuth) headers.set('Authorization', incomingAuth);
    if (incomingApiKey) headers.set('X-API-Key', incomingApiKey);
  }

  // Forward explicit organization header only if custom non-default org is provided
  const clientOrg = req.headers.get('x-organization-id');
  if (clientOrg && clientOrg !== 'org_default') {
    headers.set('X-Organization-Id', clientOrg);
  }

  // Prepare request body if applicable
  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const rawBody = await req.arrayBuffer();
    if (rawBody.byteLength > 0) {
      body = rawBody;
    }
  }

  try {
    const gwRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const resContentType = gwRes.headers.get('content-type') || 'application/json';
    const resBody = await gwRes.arrayBuffer();

    const response = new NextResponse(resBody, {
      status: gwRes.status,
      headers: {
        'Content-Type': resContentType,
      },
    });

    // Clear stale session cookie if gateway rejects authentication
    if (gwRes.status === 401 && sessionToken) {
      response.cookies.delete('agentpay_session');
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gateway communication failure';
    return NextResponse.json(
      {
        error: {
          code: 'GATEWAY_UNAVAILABLE',
          message: `Unable to connect to AgentPay Gateway at ${gatewayUrl}: ${message}`,
        },
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxyRequest(req, params);
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxyRequest(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxyRequest(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxyRequest(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxyRequest(req, params);
}
