import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const middlewarePath = path.resolve(__dirname, '../middleware.ts');
const clientPath = path.resolve(__dirname, '../lib/api/client.ts');
const v1RoutePath = path.resolve(__dirname, '../app/v1/[...path]/route.ts');
const authContextPath = path.resolve(__dirname, '../lib/auth/AuthContext.tsx');
const loginPagePath = path.resolve(__dirname, '../app/login/page.tsx');

const middlewareSource = fs.readFileSync(middlewarePath, 'utf8');
const clientSource = fs.readFileSync(clientPath, 'utf8');
const v1RouteSource = fs.readFileSync(v1RoutePath, 'utf8');
const authContextSource = fs.readFileSync(authContextPath, 'utf8');
const loginPageSource = fs.readFileSync(loginPagePath, 'utf8');

describe('TASK: Session Forwarding & Protected-Route Security', () => {
  // ===========================================================================
  // 1. Next.js Middleware Route Protection & Classification
  // ===========================================================================
  describe('1. Middleware Route Protection & Classification', () => {
    it('middleware.ts exists and declares appropriate matcher', () => {
      assert.ok(fs.existsSync(middlewarePath), 'middleware.ts must exist in src/');
      assert.ok(middlewareSource.includes('export function middleware'), 'Must export middleware function');
      assert.ok(middlewareSource.includes('matcher:'), 'Must export matcher config');
    });

    it('middleware protects private routes and redirects unauthenticated users to /login with returnUrl', () => {
      assert.ok(middlewareSource.includes("const sessionToken = request.cookies.get('agentpay_session')?.value"), 'Must read agentpay_session cookie');
      assert.ok(middlewareSource.includes('/login?returnUrl='), 'Must redirect unauthenticated users to /login with returnUrl parameter');
      assert.ok(middlewareSource.includes('encodeURIComponent(pathname + search)'), 'Must safely encode returnUrl');
    });

    it('middleware permits public routes without session cookie', () => {
      assert.ok(middlewareSource.includes("'/login'"), 'Public routes must include /login');
      assert.ok(middlewareSource.includes("'/signup'"), 'Public routes must include /signup');
      assert.ok(middlewareSource.includes("'/'"), 'Public routes must include /');
      assert.ok(middlewareSource.includes("'/arc'"), 'Public routes must include /arc');
      assert.ok(middlewareSource.includes('/api/auth'), 'Public routes must include /api/auth');
    });

    it('middleware redirects authenticated users away from /login and /signup to /dashboard', () => {
      assert.ok(middlewareSource.includes("pathname === '/login' || pathname === '/signup'"), 'Must check login and signup routes');
      assert.ok(middlewareSource.includes("NextResponse.redirect(new URL('/dashboard'"), 'Must redirect authenticated users to /dashboard');
    });

    it('middleware blocks unauthenticated requests to /v1/* with 401 Unauthorized', () => {
      assert.ok(middlewareSource.includes("pathname.startsWith('/v1/')"), 'Must inspect /v1/* API calls');
      assert.ok(middlewareSource.includes('status: 401'), 'Must return 401 for unauthenticated /v1/ calls');
      assert.ok(middlewareSource.includes('UNAUTHORIZED'), 'Must return code UNAUTHORIZED');
    });

    it('middleware attaches session token and removes org_default fallback on authenticated API requests', () => {
      assert.ok(middlewareSource.includes("requestHeaders.set('authorization', `Bearer ${sessionToken}`)"), 'Must attach session token');
      assert.ok(middlewareSource.includes("requestHeaders.get('x-organization-id') === 'org_default'"), 'Must check for org_default header');
      assert.ok(middlewareSource.includes("requestHeaders.delete('x-organization-id')"), 'Must delete org_default header to prevent tenant contamination');
    });
  });

  // ===========================================================================
  // 2. Next.js App Router /v1 Server-Side Proxy
  // ===========================================================================
  describe('2. Next.js App Router /v1 Server-Side Proxy', () => {
    it('/v1/[...path]/route.ts exists and implements HTTP methods', () => {
      assert.ok(fs.existsSync(v1RoutePath), '/v1/[...path]/route.ts must exist');
      assert.ok(v1RouteSource.includes('export async function GET'), 'Must support GET');
      assert.ok(v1RouteSource.includes('export async function POST'), 'Must support POST');
      assert.ok(v1RouteSource.includes('export async function PUT'), 'Must support PUT');
      assert.ok(v1RouteSource.includes('export async function DELETE'), 'Must support DELETE');
    });

    it('proxy extracts HttpOnly agentpay_session cookie securely server-side', () => {
      assert.ok(v1RouteSource.includes("req.cookies.get('agentpay_session')?.value"), 'Must extract agentpay_session from cookies');
      assert.ok(v1RouteSource.includes("headers.set('Authorization', `Bearer ${sessionToken}`)"), 'Must forward as Bearer token to gateway');
    });

    it('proxy rejects unauthenticated requests with explicit 401 and code UNAUTHORIZED', () => {
      assert.ok(v1RouteSource.includes('status: 401'), 'Must return 401 status');
      assert.ok(v1RouteSource.includes("code: 'UNAUTHORIZED'"), 'Must return code UNAUTHORIZED');
      assert.ok(v1RouteSource.includes('Authentication required'), 'Must provide clear message');
    });

    it('proxy invalidates cookie if gateway rejects expired or revoked session token', () => {
      assert.ok(v1RouteSource.includes("gwRes.status === 401 && sessionToken"), 'Must check for 401 response from gateway');
      assert.ok(v1RouteSource.includes("response.cookies.delete('agentpay_session')"), 'Must delete agentpay_session cookie on 401');
    });

    it('proxy explicitly disallows implicit fallback to demo API key or org_default', () => {
      assert.ok(v1RouteSource.includes('apk_live_demo'), 'Must explicitly guard against demo API key fallback');
      assert.ok(v1RouteSource.includes("clientOrg !== 'org_default'"), 'Must only forward organization header if non-default');
    });
  });

  // ===========================================================================
  // 3. Browser API Client Session & Same-Origin Routing
  // ===========================================================================
  describe('3. Browser API Client Session & Same-Origin Routing', () => {
    it('getBaseApiUrl routes browser requests through same-origin relative URL', () => {
      assert.ok(clientSource.includes("if (typeof window !== 'undefined')"), 'Must check for browser window context');
      assert.ok(clientSource.includes("return '';"), 'Must return empty string in browser for same-origin proxy routing');
    });

    it('client does not attach DEFAULT_DEMO_API_KEY for browser user requests', () => {
      assert.ok(clientSource.includes('NOTE: In the browser, we intentionally do NOT attach DEFAULT_DEMO_API_KEY'), 'Must document intentional absence of demo key');
      assert.ok(clientSource.includes("credentials: 'include'"), 'Must ensure HttpOnly cookie transmission');
    });
  });

  // ===========================================================================
  // 4. Safe Return URL & Authentication Lifecycle
  // ===========================================================================
  describe('4. Safe Return URL & Authentication Lifecycle', () => {
    it('LoginPage handles returnUrl parameter safely and uses Suspense', () => {
      assert.ok(loginPageSource.includes("searchParams.get('returnUrl')"), 'Must read returnUrl from search params');
      assert.ok(loginPageSource.includes('Suspense'), 'Must wrap in Suspense boundary for Next.js build compatibility');
      assert.ok(loginPageSource.includes("destination = returnUrl && returnUrl.startsWith('/')"), 'Must validate returnUrl is relative path to prevent open redirect');
    });

    it('AuthContext login supports returnUrl parameter', () => {
      assert.ok(authContextSource.includes('returnUrl?: string'), 'Must accept returnUrl in login signature');
      assert.ok(authContextSource.includes('router.push(destination)'), 'Must navigate to validated returnUrl or /dashboard');
    });
  });
});
