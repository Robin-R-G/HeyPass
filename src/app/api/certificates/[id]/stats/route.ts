import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { certificateService } from '@/lib/certificate-service';
import { verificationService } from '@/lib/verification-service';
import { downloadService } from '@/lib/download-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;

      const stats = await certificateService.getStats(clientId, id);
      const verificationStats = await verificationService.getVerificationStats(id);
      const downloadStats = await downloadService.getDownloadStats(id);

      return NextResponse.json({
        stats,
        verification: verificationStats,
        downloads: downloadStats,
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
