import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { listDomains, addDomain, removeDomain, verifyDomain, getDnsInstructions } from '@/lib/domain-verification';

// GET /api/branding/domain — List custom domains
export const GET = withPermission(async (_req: NextRequest, auth) => {
  const domains = await listDomains(auth.clientId!);
  return successResponse({ domains });
}, PERMISSIONS.SETTINGS_EDIT);

// POST /api/branding/domain — Add custom domain
export const POST = withPermission(async (req: NextRequest, auth) => {
  const { domain } = await req.json();

  if (!domain) {
    return errorResponse('Domain is required');
  }

  const result = await addDomain(auth.clientId!, auth.userId, domain);

  // Get DNS instructions
  const instructions = await getDnsInstructions(auth.clientId!, result.id);

  return successResponse({ domain: result, dns_instructions: instructions }, 201);
}, PERMISSIONS.SETTINGS_EDIT);

// DELETE /api/branding/domain — Remove custom domain
export const DELETE = withPermission(async (req: NextRequest, auth) => {
  const { id } = await req.json();

  if (!id) {
    return errorResponse('Domain ID is required');
  }

  await removeDomain(auth.clientId!, auth.userId, id);
  return successResponse({ deleted: true });
}, PERMISSIONS.SETTINGS_EDIT);

// POST /api/branding/domain/verify — Verify domain
export const VERIFY = withPermission(async (req: NextRequest, auth) => {
  const { id } = await req.json();

  if (!id) {
    return errorResponse('Domain ID is required');
  }

  const result = await verifyDomain(auth.clientId!, auth.userId, id);
  return successResponse({ verification: result });
}, PERMISSIONS.SETTINGS_EDIT);
