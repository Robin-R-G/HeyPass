import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { webhookService } from '@/lib/webhook-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const endpointId = searchParams.get('endpoint_id');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!endpointId) {
        return NextResponse.json({ error: 'endpoint_id is required' }, { status: 400 });
      }

      const deliveries = await webhookService.getDeliveries(clientId, endpointId, limit);
      return NextResponse.json({ deliveries });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
