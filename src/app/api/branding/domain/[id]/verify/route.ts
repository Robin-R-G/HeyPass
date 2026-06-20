import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { verifyDomain } from '@/lib/domain-verification';

// POST /api/branding/domain/[id]/verify — Verify domain
export const POST = withPermission(async (req: NextRequest, auth) => {
  const { id } = await req.json();

  if (!id) {
    return errorResponse('Domain ID is required');
  }

  const result = await verifyDomain(auth.clientId!, auth.userId, id);
  return successResponse({ verification: result });
}, PERMISSIONS.SETTINGS_EDIT);
