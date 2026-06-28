import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, extractAuthPayload, type AuthPayload, type PermissionName } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';
import { cacheGet, cacheSet } from '@/lib/cache';
export { extractAuthPayload } from '@/lib/permissions';
export { requirePermission } from '@/lib/permissions';

type RouteHandler = (
  req: NextRequest,
  auth: AuthPayload
) => Promise<NextResponse>;

type LegacyRouteHandler = (
  req: NextRequest,
  userId: string,
  clientId: string
) => Promise<Response>;

interface WithPermissionOptions {
  permission: PermissionName;
  audit?: boolean;
}

async function isOrganizationSuspended(clientId: string): Promise<boolean> {
  const cacheKey = `org_status:${clientId}`;
  const cached = await cacheGet<string>(cacheKey);
  
  if (cached !== null) {
    return cached === 'suspended';
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('status')
    .eq('id', clientId)
    .is('deleted_at', null)
    .single();

  const status = client?.status || 'active';
  await cacheSet(cacheKey, status, 60);
  
  return status === 'suspended';
}

export function withPermission(
  handler: RouteHandler,
  options?: WithPermissionOptions | PermissionName
): (req: NextRequest) => Promise<NextResponse> {
  const config: WithPermissionOptions | undefined = options
    ? (typeof options === 'string' ? { permission: options } : options)
    : undefined;

  return async (req: NextRequest): Promise<NextResponse> => {
    const auth = extractAuthPayload(req);

    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!auth.clientId && !auth.is_superadmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No client context. Select a client first.' },
        { status: 403 }
      );
    }

    if (auth.clientId && !auth.is_superadmin) {
      const suspended = await isOrganizationSuspended(auth.clientId);
      if (suspended) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Organization is suspended. Contact support for assistance.' },
          { status: 403 }
        );
      }
    }

    if (config) {
      const guard = await requirePermission(req, config.permission, { audit: config.audit });

      if (!guard.allowed) {
        return NextResponse.json(
          { error: guard.error, message: 'You do not have permission to perform this action' },
          { status: guard.status }
        );
      }
    }

    return handler(req, auth);
  };
}

export function withAuth(
  request: NextRequest,
  handler: LegacyRouteHandler
): Promise<Response>;
export function withAuth(
  handler: RouteHandler
): (req: NextRequest) => Promise<NextResponse>;
export function withAuth(
  requestOrHandler: NextRequest | RouteHandler,
  handler?: LegacyRouteHandler
): Promise<Response> | ((req: NextRequest) => Promise<NextResponse>) {
  if (requestOrHandler instanceof NextRequest && handler) {
    const req = requestOrHandler;
    return (async (): Promise<Response> => {
      const auth = extractAuthPayload(req);
      if (!auth) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (!auth.clientId) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'No client context' },
          { status: 403 }
        );
      }

      if (!auth.is_superadmin) {
        const suspended = await isOrganizationSuspended(auth.clientId);
        if (suspended) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Organization is suspended. Contact support for assistance.' },
            { status: 403 }
          );
        }
      }

      return handler(req, auth.userId, auth.clientId);
    })();
  }

  const routeHandler = requestOrHandler as RouteHandler;
  return async (req: NextRequest): Promise<NextResponse> => {
    const auth = extractAuthPayload(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (auth.clientId && !auth.is_superadmin) {
      const suspended = await isOrganizationSuspended(auth.clientId);
      if (suspended) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Organization is suspended. Contact support for assistance.' },
          { status: 403 }
        );
      }
    }

    return routeHandler(req, auth);
  };
}

export function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: string, status = 400): NextResponse {
  return NextResponse.json({ error, message: error }, { status });
}
