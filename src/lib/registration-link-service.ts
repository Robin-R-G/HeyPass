import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface RegistrationLink {
  id: string;
  client_id: string;
  event_id: string;
  short_code: string;
  full_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  click_count: number;
  registration_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateLinkInput {
  event_id: string;
  custom_code?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

class RegistrationLinkServiceImpl {
  private generateShortCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://heypass.app';
  }

  async list(clientId: string, eventId?: string): Promise<RegistrationLink[]> {
    let query = supabaseAdmin
      .from('registration_links')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(link => ({
      ...link,
      full_url: `${this.getBaseUrl()}/r/${link.short_code}`,
    }));
  }

  async get(clientId: string, linkId: string): Promise<RegistrationLink | null> {
    const { data, error } = await supabaseAdmin
      .from('registration_links')
      .select('*')
      .eq('id', linkId)
      .eq('client_id', clientId)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      full_url: `${this.getBaseUrl()}/r/${data.short_code}`,
    };
  }

  async create(clientId: string, input: CreateLinkInput): Promise<RegistrationLink> {
    let shortCode = input.custom_code || this.generateShortCode();

    // Check if custom code already exists
    if (input.custom_code) {
      const { data: existing } = await supabaseAdmin
        .from('registration_links')
        .select('id')
        .eq('short_code', shortCode)
        .single();

      if (existing) {
        throw new Error('Short code already exists');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('registration_links')
      .insert({
        client_id: clientId,
        event_id: input.event_id,
        short_code: shortCode,
        utm_source: input.utm_source || null,
        utm_medium: input.utm_medium || null,
        utm_campaign: input.utm_campaign || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      ...data,
      full_url: `${this.getBaseUrl()}/r/${data.short_code}`,
    };
  }

  async update(clientId: string, linkId: string, input: Partial<CreateLinkInput & { is_active: boolean }>): Promise<RegistrationLink> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.utm_source !== undefined) updateData.utm_source = input.utm_source;
    if (input.utm_medium !== undefined) updateData.utm_medium = input.utm_medium;
    if (input.utm_campaign !== undefined) updateData.utm_campaign = input.utm_campaign;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabaseAdmin
      .from('registration_links')
      .update(updateData)
      .eq('id', linkId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      ...data,
      full_url: `${this.getBaseUrl()}/r/${data.short_code}`,
    };
  }

  async delete(clientId: string, linkId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('registration_links')
      .delete()
      .eq('id', linkId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  async resolve(shortCode: string): Promise<{ event_id: string; client_id: string } | null> {
    const { data, error } = await supabaseAdmin
      .from('registration_links')
      .select('event_id, client_id')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Increment click count
    await supabaseAdmin
      .from('registration_links')
      .update({ click_count: supabaseAdmin.rpc ? 0 : 0 }) // Will use raw SQL
      .eq('short_code', shortCode);

    // Use increment
    await supabaseAdmin
      .from('registration_links')
      .update({ click_count: (data as any).click_count + 1 })
      .eq('short_code', shortCode);

    return data;
  }

  async trackRegistration(shortCode: string): Promise<void> {
    const { data } = await supabaseAdmin
      .from('registration_links')
      .select('registration_count')
      .eq('short_code', shortCode)
      .single();

    if (data) {
      await supabaseAdmin
        .from('registration_links')
        .update({ registration_count: data.registration_count + 1 })
        .eq('short_code', shortCode);
    }
  }

  async getStats(clientId: string, eventId?: string) {
    let query = supabaseAdmin
      .from('registration_links')
      .select('id, click_count, registration_count')
      .eq('client_id', clientId);

    if (eventId) query = query.eq('event_id', eventId);

    const { data, error } = await query;
    if (error) throw error;

    const links = data || [];
    return {
      total_links: links.length,
      total_clicks: links.reduce((sum, l) => sum + l.click_count, 0),
      total_registrations: links.reduce((sum, l) => sum + l.registration_count, 0),
      conversion_rate: links.reduce((sum, l) => sum + l.click_count, 0) > 0
        ? (links.reduce((sum, l) => sum + l.registration_count, 0) / links.reduce((sum, l) => sum + l.click_count, 0)) * 100
        : 0,
    };
  }
}

export const registrationLinkService = new RegistrationLinkServiceImpl();
