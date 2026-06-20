import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { analyticsService } from '@/lib/analytics-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const section = searchParams.get('section') || 'overview';
      const days = parseInt(searchParams.get('days') || '30');

      let data;

      switch (section) {
        case 'attendance':
          data = await analyticsService.getAttendance(clientId, id, days);
          break;
        case 'revenue':
          data = await analyticsService.getRevenue(clientId, id);
          break;
        case 'volunteers':
          data = await analyticsService.getVolunteers(clientId, id);
          break;
        case 'certificates':
          data = await analyticsService.getCertificates(clientId, id);
          break;
        case 'realtime':
          data = await analyticsService.getRealtime(clientId, id);
          break;
        default:
          data = await analyticsService.getOverview(clientId, id);
      }

      return NextResponse.json({ data });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
