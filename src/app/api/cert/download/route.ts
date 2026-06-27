import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { searchParams }: { searchParams: Promise<{ [key: string]: string }> }
) {
  try {
    const params = await searchParams;
    const certificateNumber = params.get('number');

    if (!certificateNumber) {
      return NextResponse.json({ error: 'Certificate number required' }, { status: 400 });
    }

    // Get certificate
    const { data: cert, error } = await supabaseAdmin
      .from('certificates')
      .select('id, pdf_url, certificate_number, status')
      .eq('certificate_number', certificateNumber)
      .is('deleted_at', null)
      .single();

    if (error || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (!cert.pdf_url) {
      return NextResponse.json({ error: 'PDF not yet generated' }, { status: 404 });
    }

    if (cert.status === 'revoked') {
      return NextResponse.json({ error: 'Certificate has been revoked' }, { status: 403 });
    }

    // Generate signed URL and redirect
    const { data: urlData } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(cert.pdf_url, 900);

    if (!urlData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    // Log download
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    await supabaseAdmin.from('certificate_downloads').insert({
      certificate_id: cert.id,
      ip_address: ip,
      download_type: 'pdf',
      user_agent: req.headers.get('user-agent')?.slice(0, 200) || null,
      downloaded_at: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.redirect(urlData.signedUrl);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
