import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public route prefixes and exact paths that never require authentication.
 */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/arc',
  '/health',
  '/ready',
];

/**
 * Public API routes that do not require authentication.
 */
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/me',
  '/v1/auth/login',
  '/v1/auth/signup',
  '/health',
  '/ready',
];

/**
 * Next.js Middleware enforcing authentication, route protection,
 * and secure session forwarding to backend services.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionToken = request.cookies.get('agentpay_session')?.value;
  const isAuthenticated = Boolean(sessionToken && sessionToken.trim().length > 0);

  // 1. If already authenticated and visiting login or signup, redirect to dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Allow explicitly public paths
  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 3. For protected /v1/* API calls:
  if (pathname.startsWith('/v1/')) {
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');

    // Reject implicit demo key fallback on protected endpoints
    const hasValidDirectKey = Boolean(
      (authHeader && !authHeader.includes('apk_live_demo')) ||
      (apiKeyHeader && !apiKeyHeader.includes('apk_live_demo'))
    );

    if (!isAuthenticated && !hasValidDirectKey) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in or provide a valid API key.',
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Forward session as Bearer token if session cookie is present
    const requestHeaders = new Headers(request.headers);
    if (isAuthenticated && !hasValidDirectKey) {
      requestHeaders.set('authorization', `Bearer ${sessionToken}`);
      requestHeaders.set('x-session-token', sessionToken!);
    }

    // Never allow silent org_default fallback on authenticated requests
    if (requestHeaders.get('x-organization-id') === 'org_default') {
      requestHeaders.delete('x-organization-id');
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. For private page routes: redirect unauthenticated users to /login with returnUrl
  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(pathname + search);
    const loginUrl = new URL(`/login?returnUrl=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
