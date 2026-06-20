import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { certificateService, VerificationResult } from './certificate-service';

export interface VerificationAttempt {
  id: string;
  certificate_id: string;
  ip_address: string;
  method: 'number' | 'qr_code' | 'url';
  user_agent?: string;
  verified_at: string;
}

export interface VerificationRateLimit {
  ip_address: string;
  request_count: number;
  window_start: string;
  captcha_required: boolean;
}

class VerificationServiceImpl {
  private readonly RATE_LIMIT = 50;
  private readonly RATE_WINDOW_HOURS = 1;
  private readonly CAPTCHA_THRESHOLD = 20;

  async verifyByNumber(certificateNumber: string, ip: string, userAgent?: string): Promise<VerificationResult> {
    // Check IP rate limit
    const rateLimitOk = await this.checkRateLimit(ip);
    if (!rateLimitOk) {
      return { valid: false };
    }

    // Log attempt
    await this.logAttempt(certificateNumber, ip, 'number', userAgent);

    // Verify certificate
    const result = await certificateService.verify(certificateNumber, ip, 'number');

    // Update status to delivered if first verification
    if (result.valid && result.status === 'generated') {
      await supabaseAdmin
        .from('certificates')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('certificate_number', certificateNumber);
    }

    return result;
  }

  async verifyByQR(token: string, ip: string, userAgent?: string): Promise<VerificationResult> {
    const rateLimitOk = await this.checkRateLimit(ip);
    if (!rateLimitOk) {
      return { valid: false };
    }

    // QR token is the access_token
    const cert = await certificateService.getByAccessToken(token);
    if (!cert) {
      return { valid: false };
    }

    await this.logAttempt(cert.certificate_number, ip, 'qr_code', userAgent);

    const result = await certificateService.verify(cert.certificate_number, ip, 'qr_code');

    if (result.valid && result.status === 'generated') {
      await supabaseAdmin
        .from('certificates')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', cert.id);
    }

    return result;
  }

  async verifyByURL(token: string, ip: string, userAgent?: string): Promise<VerificationResult> {
    const rateLimitOk = await this.checkRateLimit(ip);
    if (!rateLimitOk) {
      return { valid: false };
    }

    const cert = await certificateService.getByAccessToken(token);
    if (!cert) {
      return { valid: false };
    }

    await this.logAttempt(cert.certificate_number, ip, 'url', userAgent);

    const result = await certificateService.verify(cert.certificate_number, ip, 'url');

    if (result.valid && result.status === 'generated') {
      await supabaseAdmin
        .from('certificates')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', cert.id);
    }

    return result;
  }

  private async checkRateLimit(ip: string): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    const { data: existing } = await supabaseAdmin
      .from('verification_rate_limits')
      .select('request_count, captcha_required')
      .eq('ip_address', ip)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (existing) {
      if (existing.request_count >= this.RATE_LIMIT) {
        return false;
      }

      if (existing.request_count >= this.CAPTCHA_THRESHOLD && !existing.captcha_required) {
        await supabaseAdmin
          .from('verification_rate_limits')
          .update({ captcha_required: true, request_count: existing.request_count + 1 })
          .eq('ip_address', ip)
          .eq('window_start', windowStart.toISOString());
      } else {
        await supabaseAdmin
          .from('verification_rate_limits')
          .update({ request_count: existing.request_count + 1 })
          .eq('ip_address', ip)
          .eq('window_start', windowStart.toISOString());
      }

      return existing.request_count < this.RATE_LIMIT;
    }

    // First request in window
    await supabaseAdmin.from('verification_rate_limits').insert({
      ip_address: ip,
      window_start: windowStart.toISOString(),
      request_count: 1,
      captcha_required: false,
    });

    return true;
  }

  private async logAttempt(
    certificateNumber: string,
    ip: string,
    method: 'number' | 'qr_code' | 'url',
    userAgent?: string
  ): Promise<void> {
    const cert = await certificateService.getByNumber(certificateNumber);
    if (!cert) return;

    await supabaseAdmin.from('certificate_verifications').insert({
      certificate_id: cert.id,
      ip_address: ip,
      method,
      user_agent: userAgent,
      verified_at: new Date().toISOString(),
    });
  }

  async getVerificationStats(certificateId: string) {
    const { data, error } = await supabaseAdmin
      .from('certificate_verifications')
      .select('method, verified_at')
      .eq('certificate_id', certificateId)
      .order('verified_at', { ascending: false });

    if (error) throw error;

    const attempts = data || [];
    return {
      total: attempts.length,
      by_method: {
        number: attempts.filter(a => a.method === 'number').length,
        qr_code: attempts.filter(a => a.method === 'qr_code').length,
        url: attempts.filter(a => a.method === 'url').length,
      },
      recent: attempts.slice(0, 10),
    };
  }

  async getCaptchaRequired(ip: string): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    const { data } = await supabaseAdmin
      .from('verification_rate_limits')
      .select('captcha_required')
      .eq('ip_address', ip)
      .gte('window_start', windowStart.toISOString())
      .single();

    return data?.captcha_required || false;
  }
}

export const verificationService = new VerificationServiceImpl();
