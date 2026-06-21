import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { emergencyService } from '@/lib/emergency-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const contacts = await emergencyService.getEmergencyContacts(auth.clientId, params.id);
    return successResponse({ contacts });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.EVENT_MANAGE_STAFF);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    if (!body.name || !body.role || !body.phone) {
      return errorResponse('name, role, and phone are required');
    }

    const contact = await emergencyService.createEmergencyContact(auth.clientId, params.id, {
      name: body.name,
      role: body.role,
      phone: body.phone,
      email: body.email,
      location: body.location,
      is_primary: body.is_primary,
    });
    return successResponse({ contact }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
