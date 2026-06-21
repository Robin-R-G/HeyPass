import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { foodTokenService } from '@/lib/food-token-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const { searchParams } = new URL(req.url);
    const tokenTypeId = searchParams.get('token_type_id') || undefined;

    const stats = await foodTokenService.getTokenStats(auth.clientId, params.id, tokenTypeId);
    return successResponse({ stats });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
