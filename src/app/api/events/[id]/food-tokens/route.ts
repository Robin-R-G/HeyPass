import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { foodTokenService } from '@/lib/food-token-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const tokenTypes = await foodTokenService.getTokenTypes(auth.clientId, params.id);
    return successResponse({ tokenTypes });
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
    const guard = await requirePermission(req, PERMISSIONS.FOOD_TOKEN_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { name, meal_time, description, valid_from, valid_to, max_uses_per_person, total_quantity } = body;

    if (!name || !meal_time) return errorResponse('name and meal_time are required');

    const tokenType = await foodTokenService.createTokenType(auth.clientId, params.id, {
      name,
      meal_time,
      description,
      valid_from,
      valid_to,
      max_uses_per_person,
      total_quantity,
    });

    return successResponse({ tokenType });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
