import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { fraudPreventionService } from '@/lib/fraud-prevention-service';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') || undefined;
      const severity = searchParams.get('severity') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = await fraudPreventionService.listAlerts(clientId, {
        status,
        severity,
        limit,
        offset,
      });

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
