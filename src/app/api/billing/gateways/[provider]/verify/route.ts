import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { gatewayConfigService } from '@/lib/gateway-config-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { provider } = await params;
      const result = await gatewayConfigService.verify(clientId, provider);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
