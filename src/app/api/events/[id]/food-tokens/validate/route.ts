import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { foodTokenService } from '@/lib/food-token-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.FOOD_TOKEN_VALIDATE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { token_code, station_id } = body;

    if (!token_code) return errorResponse('token_code is required');

    const token = await foodTokenService.validateToken(token_code, auth.userId, station_id);
    return successResponse({ token });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
