import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { uploadBrandingAsset } from '@/lib/branding';

// POST /api/branding/college-logo — Upload college logo
export const POST = withPermission(async (req: NextRequest, auth) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return errorResponse('No file provided');
  }

  const result = await uploadBrandingAsset(
    auth.clientId!,
    auth.userId,
    'college-logo',
    file
  );

  return successResponse({ college_logo_url: result.url });
}, PERMISSIONS.SETTINGS_EDIT);
