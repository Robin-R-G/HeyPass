import { supabase } from '@/lib/supabase/client';
import QRCode from 'qrcode';

export interface TicketPreview {
  ticket_number: string;
  event_title: string;
  event_date: string;
  event_location: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type: string;
  price: number;
  currency: string;
  qr_code_data_url: string;
  qr_code_hash: string;
  access_token: string;
}

export class TicketService {
  async getTicketPreview(clientId: string, ticketId: string): Promise<TicketPreview | null> {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        ticket_number,
        qr_code_hash,
        access_token,
        qr_code_url,
        registration:registrations (
          first_name,
          last_name,
          email,
          event:events (
            title,
            start_date,
            end_date,
            is_virtual,
            virtual_link
          ),
          ticket_type:ticket_types (
            name,
            price,
            currency
          )
        )
      `)
      .eq('id', ticketId)
      .eq('client_id', clientId)
      .single();

    if (error || !ticket) return null;

    const reg = ticket.registration as unknown as {
      first_name: string;
      last_name: string;
      email: string;
      event: { title: string; start_date: string; end_date: string; is_virtual: boolean; virtual_link: string | null };
      ticket_type: { name: string; price: number; currency: string } | null;
    };

    const qrData = JSON.stringify({
      t: ticket.ticket_number,
      h: ticket.qr_code_hash,
      a: ticket.access_token,
    });

    let qrCodeDataUrl = ticket.qr_code_url || '';
    if (!qrCodeDataUrl) {
      qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }

    return {
      ticket_number: ticket.ticket_number,
      event_title: reg.event.title,
      event_date: reg.event.start_date,
      event_location: reg.event.is_virtual ? 'Virtual' : 'In-Person',
      attendee_name: `${reg.first_name} ${reg.last_name}`,
      attendee_email: reg.email,
      ticket_type: reg.ticket_type?.name || 'General',
      price: reg.ticket_type?.price || 0,
      currency: reg.ticket_type?.currency || 'INR',
      qr_code_data_url: qrCodeDataUrl,
      qr_code_hash: ticket.qr_code_hash,
      access_token: ticket.access_token,
    };
  }

  async generateQRCode(ticketId: string): Promise<string> {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('ticket_number, qr_code_hash, access_token')
      .eq('id', ticketId)
      .single();

    if (!ticket) throw new Error('Ticket not found');

    const qrData = JSON.stringify({
      t: ticket.ticket_number,
      h: ticket.qr_code_hash,
      a: ticket.access_token,
    });

    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    await supabase
      .from('tickets')
      .update({ qr_code_url: dataUrl })
      .eq('id', ticketId);

    return dataUrl;
  }

  async getEventTicketStats(clientId: string, eventId: string) {
    const { data: stats, error } = await supabase
      .from('event_ticket_summary')
      .select('*')
      .eq('event_id', eventId)
      .eq('client_id', clientId)
      .single();

    if (error) {
      // Fallback to manual count
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('client_id', clientId);

      const all = tickets || [];
      return {
        total_tickets: all.length,
        active_tickets: all.filter(t => t.status === 'active').length,
        used_tickets: all.filter(t => t.status === 'used').length,
        cancelled_tickets: all.filter(t => t.status === 'cancelled').length,
        total_registrations: all.length,
        checked_in_registrations: all.filter(t => t.status === 'used').length,
        pending_revenue: 0,
        collected_revenue: 0,
      };
    }

    return stats;
  }
}

export const ticketService = new TicketService();
