import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

export interface CertificateTemplateLayout {
  page_size: string;
  orientation: 'landscape' | 'portrait';
  background: { url: string; position?: string };
  elements: TemplateElement[];
}

export interface TemplateElement {
  type: 'text' | 'image' | 'qr';
  placeholder?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  font_size?: number;
  font_family?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  url?: string;
  size?: number;
  position?: string;
}

export interface CertificateData {
  id: string;
  client_id: string;
  certificate_number: string;
  access_token: string;
  token_expires_at: string | null;
  template_snapshot: CertificateTemplateLayout | null;
  content_hash: string | null;
  pdf_url: string | null;
  png_url: string | null;
  status: string;
  issued_at: string;
  metadata: Record<string, unknown>;
  event_title: string;
  recipient_name: string;
  certificate_type: string;
  organization_name: string;
}

export interface GenerateCertificateInput {
  event_id: string;
  template_id: string;
  type_id: string;
  registration_id?: string;
  name: string;
  email?: string;
  event_title?: string;
  event_date?: string;
  custom_fields?: Record<string, string>;
}

export interface VerificationResult {
  valid: boolean;
  certificate_number?: string;
  recipient_name?: string;
  event_title?: string;
  certificate_type?: string;
  issued_at?: string;
  organization?: string;
  status?: string;
  verification_count?: number;
  pdf_url?: string;
}

class CertificateServiceImpl {
  private generateCertificateNumber(clientId: string): string {
    const year = new Date().getFullYear();
    const seq = crypto.randomBytes(4).readUInt32BE(0) % 1000000;
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CERT-${year}-${String(seq).padStart(6, '0')}-${rand}`;
  }

  private generateAccessToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private computeContentHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async getTemplate(clientId: string, templateId: string) {
    const { data: template, error } = await supabaseAdmin
      .from('certificate_templates')
      .select('*')
      .eq('client_id', clientId)
      .eq('id', templateId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !template) throw new Error('Certificate template not found or inactive');
    return template;
  }

  private async getClientBranding(clientId: string) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name, settings')
      .eq('id', clientId)
      .single();

    return client;
  }

  async list(clientId: string, eventId: string): Promise<CertificateData[]> {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(`
        id, client_id, certificate_number, access_token, token_expires_at,
        template_snapshot, content_hash,
        pdf_url, png_url, status, issued_at, metadata,
        events!inner(title),
        certificate_types!inner(name),
        clients!inner(name)
      `)
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('issued_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((cert: any) => ({
      id: cert.id,
      client_id: cert.client_id,
      certificate_number: cert.certificate_number,
      access_token: cert.access_token,
      token_expires_at: cert.token_expires_at,
      template_snapshot: cert.template_snapshot,
      content_hash: cert.content_hash,
      pdf_url: cert.pdf_url,
      png_url: cert.png_url,
      status: cert.status,
      issued_at: cert.issued_at,
      metadata: cert.metadata || {},
      event_title: cert.events?.title || '',
      recipient_name: cert.metadata?.recipient_name || '',
      certificate_type: cert.certificate_types?.name || '',
      organization_name: cert.clients?.name || '',
    }));
  }

  async generate(clientId: string, input: GenerateCertificateInput): Promise<CertificateData> {
    // Check generation rate limit
    const { data: rateLimitOk } = await supabaseAdmin
      .rpc('check_cert_generation_limit', {
        p_client_id: clientId,
        p_event_id: input.event_id,
        p_limit: 500,
        p_window_minutes: 60,
      });

    if (rateLimitOk === false) {
      throw new Error('Certificate generation rate limit exceeded. Max 500 per event per hour.');
    }

    // Get template and snapshot it
    const template = await this.getTemplate(clientId, input.template_id);
    const templateSnapshot = template.layout as CertificateTemplateLayout;

    // Get client branding
    const client = await this.getClientBranding(clientId);

    // Generate secure identifiers
    const certificateNumber = this.generateCertificateNumber(clientId);
    const accessToken = this.generateAccessToken();
    const tokenExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

    // Build certificate data for hashing
    const certData = JSON.stringify({
      number: certificateNumber,
      name: input.name,
      event: input.event_title,
      type: input.type_id,
      ts: Date.now(),
    });
    const contentHash = this.computeContentHash(certData);

    // Build placeholder values
    const placeholders: Record<string, string> = {
      '{{name}}': input.name || '',
      '{{event_title}}': input.event_title || '',
      '{{event_date}}': input.event_date || '',
      '{{certificate_type}}': template.name || '',
      '{{certificate_number}}': certificateNumber,
      '{{organization_name}}': client?.name || '',
      ...Object.fromEntries(
        Object.entries(input.custom_fields || {}).map(([k, v]) => [`{{${k}}}`, v])
      ),
    };

    // Store certificate record
    const { data: cert, error } = await supabaseAdmin
      .from('certificates')
      .insert({
        client_id: clientId,
        event_id: input.event_id,
        registration_id: input.registration_id || null,
        template_id: input.template_id,
        type_id: input.type_id,
        certificate_number: certificateNumber,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        template_version: template.version,
        template_snapshot: templateSnapshot,
        content_hash: contentHash,
        is_manual: !input.registration_id,
        manual_data: input.registration_id ? null : {
          name: input.name,
          email: input.email,
          event_title: input.event_title,
          event_date: input.event_date,
          custom_fields: input.custom_fields,
        },
        metadata: {
          recipient_name: input.name,
          placeholders,
          generated_at: new Date().toISOString(),
        },
        status: 'generated',
      })
      .select('id, client_id, certificate_number, access_token, token_expires_at, template_snapshot, content_hash, pdf_url, png_url, status, issued_at, metadata')
      .single();

    if (error) throw error;

    return {
      id: cert.id,
      client_id: cert.client_id,
      certificate_number: cert.certificate_number,
      access_token: cert.access_token,
      token_expires_at: cert.token_expires_at,
      template_snapshot: cert.template_snapshot,
      content_hash: cert.content_hash,
      pdf_url: cert.pdf_url,
      png_url: cert.png_url,
      status: cert.status,
      issued_at: cert.issued_at,
      metadata: cert.metadata || {},
      event_title: input.event_title || '',
      recipient_name: input.name,
      certificate_type: template.name || '',
      organization_name: client?.name || '',
    };
  }

  async batchGenerate(
    clientId: string,
    eventId: string,
    inputs: GenerateCertificateInput[]
  ): Promise<{ certificates: CertificateData[]; errors: { index: number; error: string }[] }> {
    const certificates: CertificateData[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < inputs.length; i++) {
      try {
        const cert = await this.generate(clientId, { ...inputs[i], event_id: eventId });
        certificates.push(cert);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return { certificates, errors };
  }

  async getByNumber(certificateNumber: string): Promise<CertificateData | null> {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(`
        id, client_id, certificate_number, access_token, token_expires_at,
        template_snapshot, content_hash,
        pdf_url, png_url, status, issued_at, metadata,
        events!inner(title),
        certificate_types!inner(name),
        clients!inner(name)
      `)
      .eq('certificate_number', certificateNumber)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      client_id: data.client_id,
      certificate_number: data.certificate_number,
      access_token: data.access_token,
      token_expires_at: data.token_expires_at,
      template_snapshot: data.template_snapshot,
      content_hash: data.content_hash,
      pdf_url: data.pdf_url,
      png_url: data.png_url,
      status: data.status,
      issued_at: data.issued_at,
      metadata: data.metadata || {},
      event_title: (data as any).events?.title || '',
      recipient_name: (data as any).metadata?.recipient_name || '',
      certificate_type: (data as any).certificate_types?.name || '',
      organization_name: (data as any).clients?.name || '',
    };
  }

  async getByAccessToken(token: string): Promise<CertificateData | null> {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(`
        id, client_id, certificate_number, access_token, token_expires_at,
        template_snapshot, content_hash,
        pdf_url, png_url, status, issued_at, metadata,
        events!inner(title),
        certificate_types!inner(name),
        clients!inner(name)
      `)
      .eq('access_token', token)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    // Check token expiry
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
      return null;
    }

    return {
      id: data.id,
      client_id: data.client_id,
      certificate_number: data.certificate_number,
      access_token: data.access_token,
      token_expires_at: data.token_expires_at,
      template_snapshot: data.template_snapshot,
      content_hash: data.content_hash,
      pdf_url: data.pdf_url,
      png_url: data.png_url,
      status: data.status,
      issued_at: data.issued_at,
      metadata: data.metadata || {},
      event_title: (data as any).events?.title || '',
      recipient_name: (data as any).metadata?.recipient_name || '',
      certificate_type: (data as any).certificate_types?.name || '',
      organization_name: (data as any).clients?.name || '',
    };
  }

  async verify(certificateNumber: string, ip: string, method: 'number' | 'qr_code' | 'url'): Promise<VerificationResult> {
    // Check rate limit
    const { data: rateLimitOk } = await supabaseAdmin
      .rpc('check_cert_download_limit', {
        p_certificate_id: '00000000-0000-0000-0000-000000000000', // placeholder for verify
        p_ip: ip,
        p_limit: 50,
        p_window_minutes: 60,
      });

    const cert = await this.getByNumber(certificateNumber);
    if (!cert) {
      return { valid: false };
    }

    // Log verification attempt
    await supabaseAdmin.from('certificate_verifications').insert({
      client_id: cert.client_id,
      certificate_id: cert.id,
      ip_address: ip,
      method,
      verified_at: new Date().toISOString(),
    });

    // Get verification count
    const { count } = await supabaseAdmin
      .from('certificate_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('certificate_id', cert.id);

    return {
      valid: true,
      certificate_number: cert.certificate_number,
      recipient_name: cert.recipient_name,
      event_title: cert.event_title,
      certificate_type: cert.certificate_type,
      issued_at: cert.issued_at,
      organization: cert.organization_name,
      status: cert.status,
      verification_count: count || 0,
      pdf_url: cert.pdf_url ?? undefined,
    };
  }

  async revoke(clientId: string, certificateId: string, reason: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificateId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  async getStats(clientId: string, eventId: string) {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
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

  async createShareLink(clientId: string, certificateId: string, expiresInHours: number = 72): Promise<{ token: string; expiresAt: string; url: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from('certificate_share_links')
      .insert({
        client_id: clientId,
        certificate_id: certificateId,
        token,
        expires_at: expiresAt,
        max_access: 100,
      });

    if (error) throw error;

    return {
      token,
      expiresAt,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hey-pass.vercel.app'}/cert/${token}`,
    };
  }

  async getShareLink(certificateId: string): Promise<{
    token: string;
    expires_at: string;
    access_count: number;
    max_access: number;
    certificate_id: string;
  } | null> {
    const { data, error } = await supabaseAdmin
      .from('certificate_share_links')
      .select('*')
      .eq('certificate_id', certificateId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  }

  async invalidateShareLinks(certificateId: string): Promise<void> {
    await supabaseAdmin
      .from('certificate_share_links')
      .delete()
      .eq('certificate_id', certificateId);
  }
}

export const certificateService = new CertificateServiceImpl();
