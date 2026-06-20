import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseMiddlewareClient(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, res };
}

export async function getAuthenticatedUser(req: NextRequest) {
  const { supabase } = createSupabaseMiddlewareClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function createErrorResponse(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

export function createSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
