import { NextRequest } from 'next/server';
import { withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';

// GET /api/events/[id]/registrations/export — Export registrations as CSV
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const { requirePermission } = await import('@/lib/permissions');

    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) {
      return errorResponse('Forbidden', 403);
    }

    const guard = await requirePermission(req, PERMISSIONS.REGISTRATIONS_EXPORT);
    if (!guard.allowed) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const ticketTypeId = searchParams.get('ticket_type_id');

    // Build query
    let query = supabaseAdmin
      .from('registrations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        company,
        job_title,
        status,
        custom_fields,
        source,
        created_at,
        checked_in_at,
        checked_out_at
      `)
      .eq('event_id', id)
      .eq('client_id', auth.clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (ticketTypeId) {
      query = query.eq('ticket_type_id', ticketTypeId);
    }

    const { data: registrations, error } = await query;

    if (error) {
      return errorResponse(error.message, 500);
    }

    if (!registrations || registrations.length === 0) {
      return errorResponse('No registrations found', 404);
    }

    // Get form fields for custom field headers
    const { data: form } = await supabaseAdmin
      .from('registration_forms')
      .select('id')
      .eq('event_id', id)
      .eq('client_id', auth.clientId)
      .is('deleted_at', null)
      .limit(1)
      .single();

    let customFieldHeaders: string[] = [];
    if (form) {
      const { data: fields } = await supabaseAdmin
        .from('form_fields')
        .select('id, label')
        .eq('form_id', form.id)
        .order('sort_order');

      if (fields) {
        customFieldHeaders = fields.map((f) => f.label);
      }
    }

    // Build CSV
    const standardHeaders = [
      'ID',
      'Email',
      'First Name',
      'Last Name',
      'Phone',
      'Company',
      'Job Title',
      'Status',
      'Source',
      'Registered At',
      'Checked In At',
      'Checked Out At',
      ...customFieldHeaders,
    ];

    const rows = registrations.map((reg) => {
      const customValues = customFieldHeaders.map((_, index) => {
        const field = (reg as any).custom_fields;
        if (field && typeof field === 'object') {
          const keys = Object.keys(field);
          return keys[index] ? String(field[keys[index]]) : '';
        }
        return '';
      });

      return [
        reg.id,
        reg.email,
        reg.first_name,
        reg.last_name,
        reg.phone || '',
        reg.company || '',
        reg.job_title || '',
        reg.status,
        reg.source || '',
        reg.created_at,
        reg.checked_in_at || '',
        reg.checked_out_at || '',
        ...customValues,
      ];
    });

    // Escape CSV values
    const escapeCsv = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      standardHeaders.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    // Return CSV as download
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="registrations-${id}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
