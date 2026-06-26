import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/cache';
import { extractClientIP } from '@/lib/auth-service';
import { v4 as uuidv4 } from 'uuid';

// POST /api/public/register — Submit registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { form_id, email, first_name, last_name, phone, company, job_title, ticket_type_id, custom_fields } = body;

    if (!form_id || !email || !first_name || !last_name) {
      return errorResponse('form_id, email, first_name, and last_name are required');
    }

    // Rate limit: 5 registrations per email per hour
    const rateLimitKey = `register:${email}`;
    const { allowed } = await checkRateLimit(rateLimitKey, 5, 3600);
    if (!allowed) {
      return errorResponse('Too many registration attempts. Please try again later.', 429);
    }

    // Get form and event
    const { data: form } = await supabaseAdmin
      .from('registration_forms')
      .select('*, event:events(*)')
      .eq('id', form_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (!form) {
      return errorResponse('Form not found or inactive', 404);
    }

    const event = form.event as any;

    // Check event status
    if (event.status !== 'published') {
      return errorResponse('Registration is closed', 400);
    }

    // Check registration dates
    const now = new Date();
    if (event.registration_start && new Date(event.registration_start) > now) {
      return errorResponse('Registration has not started yet', 400);
    }
    if (event.registration_end && new Date(event.registration_end) < now) {
      return errorResponse('Registration has ended', 400);
    }

    // Check capacity
    if (event.max_capacity) {
      const { count } = await supabaseAdmin
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .not('status', 'eq', 'cancelled');

      if (count && count >= event.max_capacity) {
        // Check if waitlist is enabled
        if (!event.allow_waitlist) {
          return errorResponse('Event is full', 400);
        }
      }
    }

    // Check for duplicate registration
    const { data: existing } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('event_id', event.id)
      .eq('email', email)
      .not('status', 'eq', 'cancelled')
      .single();

    if (existing) {
      return errorResponse('You are already registered for this event', 400);
    }

    // Create registration
    const registrationId = uuidv4();
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .insert({
        id: registrationId,
        event_id: event.id,
        client_id: form.client_id,
        ticket_type_id: ticket_type_id || null,
        status: 'confirmed',
        email,
        first_name,
        last_name,
        phone: phone || null,
        company: company || null,
        job_title: job_title || null,
        custom_fields: custom_fields || {},
        source: 'public_form',
        ip_address: extractClientIP(req.headers.get('x-forwarded-for')),
        user_agent: req.headers.get('user-agent')?.slice(0, 200) || null,
      })
      .select()
      .single();

    if (regError) {
      console.error('Registration error:', regError);
      return errorResponse('Failed to create registration', 500);
    }

    // Create ticket
    const { error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        registration_id: registrationId,
        event_id: event.id,
        client_id: form.client_id,
        ticket_number: ticketNumber,
        qr_code_hash: uuidv4(),
        qr_code_url: null,
        access_token: uuidv4(),
        status: 'active',
      });

    if (ticketError) {
      console.error('Ticket error:', ticketError);
    }

    // Store custom field responses
    if (custom_fields && typeof custom_fields === 'object') {
      for (const [fieldId, value] of Object.entries(custom_fields)) {
        if (value !== undefined && value !== null && value !== '') {
          await supabaseAdmin
            .from('registration_responses')
            .insert({
              registration_id: registrationId,
              field_id: fieldId,
              value: String(value),
            })
            .catch((err) => console.error('Failed to save registration response:', err));
        }
      }
    }

    // Update ticket type sold count
    if (ticket_type_id) {
      await supabaseAdmin.rpc('increment_ticket_type_sold', {
        p_ticket_type_id: ticket_type_id,
      }).catch((err) => console.error('Failed to increment ticket type sold count:', err));
    }

    // Audit log
    await createAuditLog({
      client_id: form.client_id,
      action: 'ticket.validate',
      resource_type: 'registration',
      resource_id: registrationId,
      new_value: { email, first_name, last_name, event_id: event.id },
      ip_address: extractClientIP(req.headers.get('x-forwarded-for')),
      user_agent: req.headers.get('user-agent')?.slice(0, 200) || undefined,
    });

    return successResponse({
      registration_id: registrationId,
      ticket_number: ticketNumber,
      status: 'confirmed',
      event: {
        name: event.name,
        start_date: event.start_date,
      },
    }, 201);
  } catch (err) {
    console.error('Registration error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
