import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withAuth } from '@/lib/route-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req, _userId, clientId) => {
    try {
      const { id: ticketId } = await params;

      // Get ticket
      const { data: ticket, error } = await supabaseAdmin
        .from('tickets')
        .select('id, ticket_number, pdf_url, qr_code_url, client_id')
        .eq('id', ticketId)
        .eq('client_id', clientId)
        .single();

      if (error || !ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Try PDF first, then QR image
      const filePath = ticket.pdf_url || ticket.qr_code_url;
      if (!filePath) {
        return NextResponse.json({ error: 'Ticket file not yet generated' }, { status: 404 });
      }

      // Generate signed URL
      const { data: urlData } = await supabaseAdmin.storage
        .from('tickets')
        .createSignedUrl(filePath, 900);

      if (!urlData?.signedUrl) {
        return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
      }

      return NextResponse.redirect(urlData.signedUrl);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 }
      );
    }
  });
}
