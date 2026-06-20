import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { certificateService } from './certificate-service';
import JSZip from 'jszip';

export interface DownloadResult {
  url: string;
  expiresAt: string;
  filename: string;
}

export interface ZIPExportResult {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  download_links?: { url: string; expiresAt: string; filename: string }[];
  total?: number;
  zip_count?: number;
}

class DownloadServiceImpl {
  private readonly DOWNLOAD_RATE_LIMIT = 10;
  private readonly DOWNLOAD_WINDOW_MINUTES = 60;
  private readonly SIGNED_URL_EXPIRY = 900; // 15 minutes
  private readonly ZIP_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ZIP_MAX_CERTS = 1000;

  async downloadPDF(certificateId: string, ip: string, userAgent?: string): Promise<DownloadResult> {
    // Check download rate limit
    const rateLimitOk = await this.checkDownloadRateLimit(certificateId, ip);
    if (!rateLimitOk) {
      throw new Error('Download rate limit exceeded. Max 10 downloads per certificate per hour.');
    }

    // Get certificate
    const { data: cert, error } = await supabaseAdmin
      .from('certificates')
      .select('id, pdf_url, certificate_number, status')
      .eq('id', certificateId)
      .is('deleted_at', null)
      .single();

    if (error || !cert) throw new Error('Certificate not found');
    if (!cert.pdf_url) throw new Error('PDF not yet generated');
    if (cert.status === 'revoked') throw new Error('Certificate has been revoked');

    // Log download
    await this.logDownload(certificateId, ip, 'pdf', userAgent);

    // Update status
    if (cert.status !== 'downloaded') {
      await supabaseAdmin
        .from('certificates')
        .update({ status: 'downloaded', updated_at: new Date().toISOString() })
        .eq('id', certificateId);
    }

    // Generate signed URL
    const { data: urlData } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(cert.pdf_url, this.SIGNED_URL_EXPIRY);

    if (!urlData?.signedUrl) throw new Error('Failed to generate download URL');

    return {
      url: urlData.signedUrl,
      expiresAt: new Date(Date.now() + this.SIGNED_URL_EXPIRY * 1000).toISOString(),
      filename: `${cert.certificate_number}.pdf`,
    };
  }

  async downloadPNG(certificateId: string, ip: string, userAgent?: string): Promise<DownloadResult> {
    const rateLimitOk = await this.checkDownloadRateLimit(certificateId, ip);
    if (!rateLimitOk) {
      throw new Error('Download rate limit exceeded. Max 10 downloads per certificate per hour.');
    }

    const { data: cert, error } = await supabaseAdmin
      .from('certificates')
      .select('id, png_url, certificate_number, status')
      .eq('id', certificateId)
      .is('deleted_at', null)
      .single();

    if (error || !cert) throw new Error('Certificate not found');
    if (!cert.png_url) throw new Error('PNG not yet generated');
    if (cert.status === 'revoked') throw new Error('Certificate has been revoked');

    await this.logDownload(certificateId, ip, 'png', userAgent);

    const { data: urlData } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(cert.png_url, this.SIGNED_URL_EXPIRY);

    if (!urlData?.signedUrl) throw new Error('Failed to generate download URL');

    return {
      url: urlData.signedUrl,
      expiresAt: new Date(Date.now() + this.SIGNED_URL_EXPIRY * 1000).toISOString(),
      filename: `${cert.certificate_number}.png`,
    };
  }

  async exportZIP(clientId: string, eventId: string, ip: string, options?: {
    certificate_type_id?: string;
    max_size?: number;
  }): Promise<ZIPExportResult> {
    const maxSize = Math.min(options?.max_size || this.ZIP_MAX_CERTS, this.ZIP_MAX_CERTS);

    // Create job record
    const jobId = `zip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: job, error: jobError } = await supabaseAdmin
      .from('zip_export_jobs')
      .insert({
        client_id: clientId,
        event_id: eventId,
        certificate_type: options?.certificate_type_id || null,
        total_certificates: 0,
        zip_count: 0,
        status: 'queued',
        job_id: jobId,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (jobError) throw jobError;

    // Get certificates for this event
    let query = supabaseAdmin
      .from('certificates')
      .select('id, certificate_number, pdf_url, status')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .neq('status', 'revoked')
      .limit(maxSize);

    if (options?.certificate_type_id) {
      query = query.eq('type_id', options.certificate_type_id);
    }

    const { data: certs, error: certError } = await query;
    if (certError) throw certError;

    if (!certs || certs.length === 0) {
      await supabaseAdmin
        .from('zip_export_jobs')
        .update({ status: 'completed', total_certificates: 0, completed_at: new Date().toISOString() })
        .eq('id', job.id);

      return { job_id: jobId, status: 'completed', total: 0, zip_count: 0, download_links: [] };
    }

    // Update job with count
    await supabaseAdmin
      .from('zip_export_jobs')
      .update({ status: 'processing', total_certificates: certs.length })
      .eq('id', job.id);

    // Create ZIP
    const zip = new JSZip();
    let totalSize = 0;
    let includedCount = 0;

    for (const cert of certs) {
      if (!cert.pdf_url) continue;

      try {
        const { data: urlData } = await supabaseAdmin.storage
          .from('certificates')
          .createSignedUrl(cert.pdf_url, 300);

        if (urlData?.signedUrl) {
          const response = await fetch(urlData.signedUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            if (totalSize + buffer.length <= this.ZIP_MAX_SIZE) {
              zip.file(`${cert.certificate_number}.pdf`, buffer);
              totalSize += buffer.length;
              includedCount++;
            }
          }
        }
      } catch (err) {
        console.error(`Failed to include cert ${cert.certificate_number}:`, err);
      }
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Upload ZIP to storage
    const zipPath = `exports/${clientId}/${eventId}/${jobId}.zip`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('certificates')
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Generate signed URL for ZIP
    const { data: zipUrlData } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(zipPath, 24 * 60 * 60); // 24 hours

    // Update job
    await supabaseAdmin
      .from('zip_export_jobs')
      .update({
        status: 'completed',
        zip_count: 1,
        download_links: zipUrlData?.signedUrl ? [{
          url: zipUrlData.signedUrl,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          filename: `${eventId}-certificates.zip`,
        }] : [],
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Log ZIP download
    await this.logDownload(job.id, ip, 'zip');

    return {
      job_id: jobId,
      status: 'completed',
      total: certs.length,
      zip_count: 1,
      download_links: zipUrlData?.signedUrl ? [{
        url: zipUrlData.signedUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        filename: `${eventId}-certificates.zip`,
      }] : [],
    };
  }

  async getJobStatus(jobId: string): Promise<ZIPExportResult> {
    const { data: job, error } = await supabaseAdmin
      .from('zip_export_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !job) throw new Error('Export job not found');

    return {
      job_id: job.job_id,
      status: job.status,
      total: job.total_certificates,
      zip_count: job.zip_count,
      download_links: job.download_links || [],
    };
  }

  private async checkDownloadRateLimit(certificateId: string, ip: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .rpc('check_cert_download_limit', {
        p_certificate_id: certificateId,
        p_ip: ip,
        p_limit: this.DOWNLOAD_RATE_LIMIT,
        p_window_minutes: this.DOWNLOAD_WINDOW_MINUTES,
      });

    return data !== false;
  }

  private async logDownload(
    certificateId: string,
    ip: string,
    type: 'pdf' | 'png' | 'zip',
    userAgent?: string
  ): Promise<void> {
    await supabaseAdmin.from('certificate_downloads').insert({
      certificate_id: certificateId,
      ip_address: ip,
      download_type: type,
      user_agent: userAgent,
      downloaded_at: new Date().toISOString(),
    });
  }

  async getDownloadStats(certificateId: string) {
    const { data, error } = await supabaseAdmin
      .from('certificate_downloads')
      .select('download_type, downloaded_at, ip_address')
      .eq('certificate_id', certificateId)
      .order('downloaded_at', { ascending: false });

    if (error) throw error;

    const downloads = data || [];
    return {
      total: downloads.length,
      by_type: {
        pdf: downloads.filter(d => d.download_type === 'pdf').length,
        png: downloads.filter(d => d.download_type === 'png').length,
        zip: downloads.filter(d => d.download_type === 'zip').length,
      },
      recent: downloads.slice(0, 10),
    };
  }
}

export const downloadService = new DownloadServiceImpl();
