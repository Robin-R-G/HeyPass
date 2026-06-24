import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const { data: feedbacks, error } = await supabaseAdmin
      .from('event_feedback')
      .select(`
        id, rating, comments, created_at,
        registration:registrations(first_name, last_name, email)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return successResponse({ feedbacks: feedbacks || [] });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const body = await req.json();
    const { email, phone, ticketNumber, rating, comments } = body;

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse('Rating between 1 and 5 is required');
    }

    // 1. Identify registration based on email/phone/ticketNumber
    let query = supabaseAdmin
      .from('registrations')
      .select('id, client_id')
      .eq('event_id', eventId);

    if (ticketNumber) {
      // Find from ticket
      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select('registration_id')
        .eq('ticket_number', ticketNumber)
        .single();
      if (ticket) query = query.eq('id', ticket.registration_id);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    } else {
      return errorResponse('Email, phone, or ticketNumber is required to identify attendee');
    }

    const { data: regs } = await query;
    const reg = regs?.[0];

    if (!reg) return errorResponse('Attendee registration not found for this event');

    // 2. Insert Feedback
    const { data: feedback, error } = await supabaseAdmin
      .from('event_feedback')
      .insert({
        client_id: reg.client_id,
        event_id: eventId,
        registration_id: reg.id,
        rating,
        comments: comments || null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse('Feedback has already been submitted for this registration');
      }
      throw error;
    }

    return successResponse({ feedback }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
