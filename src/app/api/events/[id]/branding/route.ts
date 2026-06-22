import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { getEventBranding, upsertEventBranding, uploadEventBrandingAsset } from '@/lib/branding';
import { supabaseAdmin } from '@/lib/supabase/client';

// GET /api/events/[id]/branding — Get event branding
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    // Verify event belongs to client
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('client_id', auth.clientId)
      .single();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const branding = await getEventBranding(id);
    return successResponse({ branding });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}

// PUT /api/events/[id]/branding — Update event branding
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const { requirePermission } = await import('@/lib/permissions');
    const { PERMISSIONS } = await import('@/lib/permissions');

    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) {
      return errorResponse('Forbidden', 403);
    }

    // Verify event belongs to client
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('client_id', auth.clientId)
      .single();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const body = await req.json();

    const allowedFields = [
      'banner_url', 'logo_url',
      'primary_color', 'secondary_color', 'accent_color',
      'background_color', 'text_color',
      'custom_css', 'custom_head_html',
    ];

    const filteredInput: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        filteredInput[field] = body[field];
      }
    }

    if (Object.keys(filteredInput).length === 0) {
      return errorResponse('No valid fields provided');
    }

    const branding = await upsertEventBranding(
      id,
      auth.clientId!,
      auth.userId,
      filteredInput
    );

    return successResponse({ branding });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}

// POST /api/events/[id]/branding — Upload event branding asset
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const { requirePermission } = await import('@/lib/permissions');
    const { PERMISSIONS } = await import('@/lib/permissions');

    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const guard = await requirePermission(req, PERMISSIONS.EVENTS_EDIT);
    if (!guard.allowed) {
      return errorResponse('Forbidden', 403);
    }

    // Verify event belongs to client
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('client_id', auth.clientId)
      .single();

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const assetType = formData.get('type') as 'banner' | 'logo' | null;

    if (!file || !assetType) {
      return errorResponse('File and type are required');
    }

    if (!['banner', 'logo'].includes(assetType)) {
      return errorResponse('Invalid asset type');
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('Invalid file type. Allowed: JPEG, PNG, WebP, SVG');
    }
    if (file.size > maxSize) {
      return errorResponse('File too large. Maximum 10MB');
    }

    const result = await uploadEventBrandingAsset(
      id,
      auth.clientId!,
      auth.userId,
      assetType,
      file
    );

    return successResponse({ url: result.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
