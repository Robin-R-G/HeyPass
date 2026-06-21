import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';

interface TokenTypeInput {
  name: string;
  description?: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  valid_from?: string;
  valid_to?: string;
  max_uses_per_person?: number;
  total_quantity?: number;
}

function generateTokenCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FT-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createTokenType(clientId: string, eventId: string, input: TokenTypeInput) {
  const { data, error } = await supabaseAdmin
    .from('food_token_types')
    .insert({
      client_id: clientId,
      event_id: eventId,
      name: input.name,
      description: input.description || null,
      meal_time: input.meal_time,
      valid_from: input.valid_from || null,
      valid_to: input.valid_to || null,
      max_uses_per_person: input.max_uses_per_person || 1,
      total_quantity: input.total_quantity || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create token type: ${error.message}`);
  return data;
}

async function getTokenTypes(clientId: string, eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('food_token_types')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list token types: ${error.message}`);
  return data || [];
}

async function generateTokens(
  clientId: string,
  eventId: string,
  tokenTypeId: string,
  registrationIds: string[]
) {
  const { data: tokenType, error: typeError } = await supabaseAdmin
    .from('food_token_types')
    .select('*')
    .eq('id', tokenTypeId)
    .eq('client_id', clientId)
    .single();

  if (typeError || !tokenType) throw new Error('Token type not found');

  const existingTokens = await supabaseAdmin
    .from('food_tokens')
    .select('registration_id')
    .eq('token_type_id', tokenTypeId)
    .eq('client_id', clientId)
    .in('registration_id', registrationIds)
    .in('status', ['active', 'used']);

  const existingMap = new Set((existingTokens.data || []).map(t => t.registration_id));

  const tokensToInsert = registrationIds
    .filter(rid => !existingMap.has(rid))
    .map(rid => ({
      client_id: clientId,
      event_id: eventId,
      token_type_id: tokenTypeId,
      registration_id: rid,
      token_code: generateTokenCode(),
      status: 'active' as const,
    }));

  if (tokensToInsert.length === 0) {
    throw new Error('All selected registrations already have tokens for this type');
  }

  if (tokenType.total_quantity != null) {
    const remaining = tokenType.total_quantity - tokenType.used_quantity;
    if (tokensToInsert.length > remaining) {
      throw new Error(`Only ${remaining} tokens remaining (requested ${tokensToInsert.length})`);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('food_tokens')
    .insert(tokensToInsert)
    .select();

  if (error) throw new Error(`Failed to generate tokens: ${error.message}`);

  await supabaseAdmin
    .from('food_token_types')
    .update({ used_quantity: tokenType.used_quantity + tokensToInsert.length, updated_at: new Date().toISOString() })
    .eq('id', tokenTypeId);

  return { tokens: data, generated: tokensToInsert.length, skipped: registrationIds.length - tokensToInsert.length };
}

async function validateToken(tokenCode: string, userId?: string, stationId?: string) {
  const { data: token, error: tokenError } = await supabaseAdmin
    .from('food_tokens')
    .select('*, token_type:food_token_types(*)')
    .eq('token_code', tokenCode)
    .single();

  if (tokenError || !token) throw new Error('Token not found');

  if (token.status === 'used') {
    throw new Error(`Token already used at ${token.scanned_at}`);
  }

  if (token.status === 'cancelled') {
    throw new Error('Token has been cancelled');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: 'used',
    scanned_at: now,
    updated_at: now,
  };
  if (userId) updates.scanned_by = userId;
  if (stationId) updates.station_id = stationId;

  const { data, error } = await supabaseAdmin
    .from('food_tokens')
    .update(updates)
    .eq('id', token.id)
    .select('*, token_type:food_token_types(*)')
    .single();

  if (error) throw new Error(`Failed to validate token: ${error.message}`);
  return data;
}

async function getTokenStats(clientId: string, eventId: string, tokenTypeId?: string) {
  let query = supabaseAdmin
    .from('food_tokens')
    .select('token_type_id, status')
    .eq('client_id', clientId)
    .eq('event_id', eventId);

  if (tokenTypeId) {
    query = query.eq('token_type_id', tokenTypeId);
  }

  const { data: tokens, error } = await query;
  if (error) throw new Error(`Failed to get stats: ${error.message}`);

  const { data: types } = await supabaseAdmin
    .from('food_token_types')
    .select('id, name, meal_time, total_quantity, used_quantity, is_active')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null);

  const tokenList = tokens || [];
  const typeList = types || [];

  const byType = typeList.map(t => {
    const typeTokens = tokenList.filter(tok => tok.token_type_id === t.id);
    return {
      type_id: t.id,
      name: t.name,
      meal_time: t.meal_time,
      total_issued: typeTokens.length,
      used: typeTokens.filter(tok => tok.status === 'used').length,
      active: typeTokens.filter(tok => tok.status === 'active').length,
      cancelled: typeTokens.filter(tok => tok.status === 'cancelled').length,
      remaining: (t.total_quantity || typeTokens.length) - typeTokens.filter(tok => tok.status === 'used').length,
    };
  });

  return {
    total_issued: tokenList.length,
    total_used: tokenList.filter(t => t.status === 'used').length,
    total_active: tokenList.filter(t => t.status === 'active').length,
    total_cancelled: tokenList.filter(t => t.status === 'cancelled').length,
    by_type: byType,
  };
}

async function getRegistrationsTokens(clientId: string, eventId: string, registrationId: string) {
  const { data, error } = await supabaseAdmin
    .from('food_tokens')
    .select('*, token_type:food_token_types(id, name, meal_time, valid_from, valid_to)')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get registration tokens: ${error.message}`);
  return data || [];
}

export const foodTokenService = {
  createTokenType,
  getTokenTypes,
  generateTokens,
  validateToken,
  getTokenStats,
  getRegistrationsTokens,
};

export type { TokenTypeInput };
