import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { foodTokenService } from '@/lib/food-token-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.FOOD_TOKEN_GENERATE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { token_type_id, registration_ids } = body;

    if (!token_type_id || !registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
      return errorResponse('token_type_id and registration_ids[] are required');
    }

    const result = await foodTokenService.generateTokens(
      auth.clientId, params.id, token_type_id, registration_ids
    );

    return successResponse(result);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
