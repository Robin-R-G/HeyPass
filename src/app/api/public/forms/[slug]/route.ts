import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { getPublicForm, validateRegistration } from '@/lib/form-builder';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/cache';
import { v4 as uuidv4 } from 'uuid';

// GET /api/public/forms/[slug] — Get public form
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const form = await getPublicForm(slug);

    if (!form) {
      return errorResponse('Event not found or registration is closed', 404);
    }

    // Track form view
    await supabaseAdmin
      .from('form_analytics')
      .upsert(
        {
          form_id: form.form.id,
          event_id: form.event.id,
          client_id: (form.form as any).client_id,
          date: new Date().toISOString().split('T')[0],
          views: 1,
        },
        { onConflict: 'form_id,date', ignoreDuplicates: false }
      );

    return successResponse({
      form: {
        id: form.form.id,
        name: form.form.name,
        is_multi_step: form.form.is_multi_step,
        steps_config: form.form.steps_config,
      },
      fields: form.fields.map((f) => ({
        id: f.id,
        label: f.label,
        field_type: f.field_type,
        placeholder: f.placeholder,
        is_required: f.is_required,
        options: f.options,
        validation: f.validation,
        conditional_logic: f.conditional_logic,
        default_value: f.default_value,
        help_text: f.help_text,
        section_id: f.section_id,
        sort_order: f.sort_order,
      })),
      sections: form.sections,
      event: form.event,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
