import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { reportService } from '@/lib/report-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id, type } = await params;
      const { searchParams } = new URL(req.url);
      const format = (searchParams.get('format') || 'csv') as 'csv' | 'pdf';
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;
      const gateId = searchParams.get('gate_id') || undefined;
      const sessionId = searchParams.get('session_id') || undefined;

      const options = { format, date_from: dateFrom, date_to: dateTo, gate_id: gateId, session_id: sessionId };

      let result: string | Buffer;
      let contentType: string;
      let filename: string;

      switch (type) {
        case 'attendance':
          result = await reportService.attendanceReport(clientId, id, options);
          contentType = format === 'csv' ? 'text/csv' : 'text/html';
          filename = `attendance-report.${format === 'csv' ? 'csv' : 'html'}`;
          break;
        case 'revenue':
          result = await reportService.revenueReport(clientId, id, options);
          contentType = format === 'csv' ? 'text/csv' : 'text/html';
          filename = `revenue-report.${format === 'csv' ? 'csv' : 'html'}`;
          break;
        case 'volunteers':
          result = await reportService.volunteerReport(clientId, id, options);
          contentType = format === 'csv' ? 'text/csv' : 'text/html';
          filename = `volunteer-report.${format === 'csv' ? 'csv' : 'html'}`;
          break;
        case 'certificates':
          result = await reportService.certificateReport(clientId, id, options);
          contentType = format === 'csv' ? 'text/csv' : 'text/html';
          filename = `certificate-report.${format === 'csv' ? 'csv' : 'html'}`;
          break;
        case 'gates':
          result = await reportService.gateReport(clientId, id, options);
          contentType = format === 'csv' ? 'text/csv' : 'text/html';
          filename = `gate-report.${format === 'csv' ? 'csv' : 'html'}`;
          break;
        case 'full':
          result = await reportService.fullReport(clientId, id, options);
          contentType = 'application/zip';
          filename = `full-report.zip`;
          break;
        default:
          return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
      }

      return new NextResponse(result, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
