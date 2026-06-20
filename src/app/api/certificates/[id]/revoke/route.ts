import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { certificateService } from '@/lib/certificate-service';
import { z } from 'zod';

const revokeSchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = revokeSchema.parse(body);

      await certificateService.revoke(clientId, id, parsed.reason);

      // Invalidate any share links
      await certificateService.invalidateShareLinks(id);

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
