import { NextRequest } from 'next/server';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { getClientBranding, upsertClientBranding, type ClientBranding } from '@/lib/branding';

// GET /api/branding — Get current client branding
export const GET = withAuth(async (_req: NextRequest, auth) => {
  const branding = await getClientBranding(auth.clientId!);
  return successResponse({ branding });
});

// PUT /api/branding — Update client branding
export const PUT = withPermission(async (req: NextRequest, auth) => {
  const body = await req.json();

  const allowedFields: (keyof Omit<ClientBranding, 'id' | 'client_id' | 'created_at' | 'updated_at'>)[] = [
    'brand_name', 'tagline',
    'primary_color', 'secondary_color', 'accent_color',
    'background_color', 'text_color', 'success_color', 'warning_color', 'error_color',
    'font_family', 'font_heading_family', 'border_radius',
    'white_label_enabled', 'footer_text',
    'support_email', 'support_phone',
    'social_links',
    'email_from_name', 'email_from_address', 'email_reply_to',
    'footer_company_name', 'footer_website_url', 'footer_copyright',
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

  const branding = await upsertClientBranding(
    auth.clientId!,
    auth.userId,
    filteredInput
  );

  return successResponse({ branding });
}, PERMISSIONS.SETTINGS_EDIT);
