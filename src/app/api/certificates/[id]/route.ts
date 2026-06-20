import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { certificateService } from '@/lib/certificate-service';
import { downloadService } from '@/lib/download-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;

      const cert = await certificateService.list(clientId, '');
      const certificate = cert.find(c => c.id === id);

      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      // Get existing share link
      const shareLink = await certificateService.getShareLink(id);

      return NextResponse.json({
        certificate,
        share_link: shareLink ? {
          url: `https://heypass.app/cert/${shareLink.token}`,
          expires_at: shareLink.expires_at,
          access_count: shareLink.access_count,
          max_access: shareLink.max_access,
        } : null,
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const body = await req.json();

      const { token, expiresAt, url } = await certificateService.createShareLink(
        clientId,
        id,
        body.expires_in_hours || 72
      );

      return NextResponse.json({
        share_link: { url, expires_at: expiresAt, token },
      }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;

      await certificateService.invalidateShareLinks(id);

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
