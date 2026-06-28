import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { withPermission } from '@/lib/route-guard';
import { createSuccessResponse, createErrorResponse } from '@/lib/supabase/middleware';
import { createAuditLog } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import crypto from 'crypto';

function generateCode(orgName: string): string {
  const prefix = orgName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${random}-${year}`;
}

export const POST = withPermission(async (req: NextRequest, auth) => {
  try {
    if (!auth.clientId) {
      return createErrorResponse(400, 'No organization context');
    }

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, invitation_code')
      .eq('id', auth.clientId)
      .is('deleted_at', null)
      .single();

    if (!client) {
      return createErrorResponse(404, 'Organization not found');
    }

    let newCode: string;
    let attempts = 0;
    do {
      newCode = generateCode(client.name);
      const { data: existing } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('invitation_code', newCode)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return createErrorResponse(500, 'Failed to generate unique code');
    }

    const oldCode = client.invitation_code;

    const { error } = await supabaseAdmin
      .from('clients')
      .update({ invitation_code: newCode })
      .eq('id', auth.clientId);

    if (error) {
      return createErrorResponse(500, 'Failed to update invitation code');
    }

    await createAuditLog({
      user_id: auth.userId,
      client_id: auth.clientId,
      action: 'settings.update',
      resource_type: 'client',
      resource_id: auth.clientId,
      old_value: { invitation_code: oldCode },
      new_value: { invitation_code: newCode },
    });

    return createSuccessResponse({
      invitation_code: newCode,
      old_code: oldCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(500, message);
  }
}, PERMISSIONS.SETTINGS_EDIT);
