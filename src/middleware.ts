import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/session',
  '/api/auth/refresh',
  '/api/auth/my-clients',
  '/api/auth/reset-password',
  '/api/auth/reset-password/confirm',
  '/api/health',
  '/api/verify',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/select-client',
  '/superadmin',
  '/verify',
  '/login',
  '/register',
  '/',
];

const STATIC_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/images/',
  '/css/',
  '/js/',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  if (STATIC_PATHS.some(p => pathname.startsWith(p))) return true;
  if (PUBLIC_PATHS.some(p => pathname === p)) return true;
  return false;
}

async function handleMiddleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isApiPath = pathname.startsWith('/api/');

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  if (isApiPath) {
    if (isPublicPath(pathname)) {
      return response;
    }

    // Parse JWT for permission checks at middleware level
    const authHeader = request.headers.get('authorization');
    const jwtPayload = authHeader ? verifyAccessToken(authHeader.replace('Bearer ', '')) : null;

    if (!jwtPayload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Superadmins bypass client context requirement
    if (!jwtPayload.is_superadmin && !jwtPayload.client_id && !pathname.startsWith('/api/auth/')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No client context. Select a client first.' },
        { status: 403 }
      );
    }

    return response;
  }

  // Page routes — let client-side code handle auth via localStorage JWT tokens
  // Middleware only redirects for pure page routes if user is not authenticated
  // Client components check localStorage and handle auth display

  return response;
}

export default handleMiddleware;
export const middleware = handleMiddleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
