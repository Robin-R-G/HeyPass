import { supabase } from '@/lib/supabase/client';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

export interface ManualCertificateInput {
  event_id: string;
  template_id: string;
  type_id: string;
  name: string;
  email?: string;
  event_title?: string;
  event_date?: string;
  custom_fields?: Record<string, string>;
}

export interface ManualCertificate {
  id: string;
  certificate_number: string;
  access_token: string;
  is_manual: boolean;
  manual_data: Record<string, unknown>;
  pdf_url: string | null;
  created_at: string;
}

function generateCertificateNumber(clientId: string): string {
  const year = new Date().getFullYear();
  const short = clientId.slice(0, 4).toUpperCase();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `HP-${year}-${short}-${rand}`;
}

function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export class ManualCertificateService {
  async list(clientId: string, eventId: string): Promise<ManualCertificate[]> {
    const { data, error } = await supabase
      .from('certificates')
      .select('id, certificate_number, access_token, is_manual, manual_data, pdf_url, created_at, status')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('is_manual', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(clientId: string, input: ManualCertificateInput): Promise<ManualCertificate> {
    const certificate_number = generateCertificateNumber(clientId);
    const access_token = generateAccessToken();

    const { data: template } = await supabase
      .from('certificate_templates')
      .select('id')
      .eq('client_id', clientId)
      .eq('id', input.template_id)
      .single();

    if (!template) throw new Error('Certificate template not found');

    const manualData = {
      name: input.name,
      email: input.email || null,
      event_title: input.event_title || null,
      event_date: input.event_date || null,
      ...input.custom_fields,
    };

    const { data: cert, error } = await supabase
      .from('certificates')
      .insert({
        client_id: clientId,
        event_id: input.event_id,
        registration_id: '00000000-0000-0000-0000-000000000000',
        template_id: input.template_id,
        type_id: input.type_id,
        certificate_number,
        access_token,
        template_version: 1,
        is_manual: true,
        manual_data: manualData,
        status: 'generated',
      })
      .select('id, certificate_number, access_token, is_manual, manual_data, pdf_url, created_at')
      .single();

    if (error) throw error;
    return cert;
  }

  async batchCreate(clientId: string, eventId: string, entries: ManualCertificateInput[]): Promise<ManualCertificate[]> {
    const results: ManualCertificate[] = [];

    for (const entry of entries) {
      const cert = await this.create(clientId, { ...entry, event_id: eventId });
      results.push(cert);
    }

    return results;
  }

  async revoke(clientId: string, certificateId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificateId)
      .eq('client_id', clientId)
      .eq('is_manual', true);

    if (error) throw error;
  }

  async getStats(clientId: string, eventId: string) {
    const { data, error } = await supabase
      .from('certificates')
      .select('id, status, created_at')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('is_manual', true)
      .is('deleted_at', null);

    if (error) throw error;

    const certs = data || [];
    return {
      total: certs.length,
      generated: certs.filter(c => c.status === 'generated').length,
      delivered: certs.filter(c => c.status === 'delivered').length,
      downloaded: certs.filter(c => c.status === 'downloaded').length,
      revoked: certs.filter(c => c.status === 'revoked').length,
    };
  }
}

export const manualCertificateService = new ManualCertificateService();
