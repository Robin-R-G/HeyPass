import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const { data, error } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('api_token, phone_number_id, waba_id, webhook_verify_token, is_connected, last_verified_at, updated_at')
      .eq('client_id', auth.clientId)
      .single();

    if (error && error.code === 'PGRST116') {
      return successResponse({ credentials: null });
    }
    if (error) throw error;

    return successResponse({ credentials: data });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.SETTINGS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { api_token, phone_number_id, waba_id } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (api_token !== undefined) updateData.api_token = api_token;
    if (phone_number_id !== undefined) updateData.phone_number_id = phone_number_id;
    if (waba_id !== undefined) updateData.waba_id = waba_id;

    const { data: existing } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('id')
      .eq('client_id', auth.clientId)
      .single();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .update(updateData)
        .eq('client_id', auth.clientId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .insert({ client_id: auth.clientId, ...updateData });
      if (error) throw error;
    }

    return successResponse({ success: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.SETTINGS_EDIT);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { action } = body;

    if (action === 'verify') {
      const { data: creds } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('api_token, phone_number_id')
        .eq('client_id', auth.clientId)
        .single();

      if (!creds?.api_token || !creds?.phone_number_id) {
        return errorResponse('Credentials not configured');
      }

      try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${creds.phone_number_id}?access_token=${creds.api_token}`);
        const data = await res.json();
        const connected = res.ok && !data.error;

        await supabaseAdmin
          .from('whatsapp_credentials')
          .update({
            is_connected: connected,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', auth.clientId);

        return successResponse({ connected, data });
      } catch {
        await supabaseAdmin
          .from('whatsapp_credentials')
          .update({
            is_connected: false,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', auth.clientId);

        return errorResponse('Failed to connect to Meta API');
      }
    }

    if (action === 'reset_webhook_token') {
      const newToken = crypto.randomUUID();
      await supabaseAdmin
        .from('whatsapp_credentials')
        .update({
          webhook_verify_token: newToken,
          updated_at: new Date().toISOString(),
        })
        .eq('client_id', auth.clientId);

      return successResponse({ webhook_verify_token: newToken });
    }

    return errorResponse('Invalid action');
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
