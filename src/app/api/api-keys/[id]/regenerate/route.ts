import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { apiKeyService } from '@/lib/api-key-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 403 });
      const { id } = await params;
      const result = await apiKeyService.regenerate(clientId, id);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
