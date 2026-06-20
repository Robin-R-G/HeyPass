import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { uploadBrandingAsset, deleteBrandingAsset } from '@/lib/branding';

// POST /api/branding/banner — Upload default banner
export const POST = withPermission(async (req: NextRequest, auth) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return errorResponse('No file provided');
  }

  const result = await uploadBrandingAsset(
    auth.clientId!,
    auth.userId,
    'banner',
    file
  );

  return successResponse({ banner_url: result.url });
}, PERMISSIONS.SETTINGS_EDIT);

// DELETE /api/branding/banner — Delete default banner
export const DELETE = withPermission(async (_req: NextRequest, auth) => {
  await deleteBrandingAsset(auth.clientId!, auth.userId, 'banner');
  return successResponse({ deleted: true });
}, PERMISSIONS.SETTINGS_EDIT);
