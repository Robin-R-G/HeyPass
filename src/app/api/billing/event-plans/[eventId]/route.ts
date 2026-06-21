import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { subscriptionService } from '@/lib/subscription-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { eventId } = await params;
      const limits = await subscriptionService.checkEventLimits(clientId, eventId);
      return NextResponse.json(limits);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
