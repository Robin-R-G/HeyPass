/**
 * Certificate Generation Worker
 * Run with: npx tsx workers/certificate-worker.ts
 * 
 * Processes certificate generation jobs from BullMQ queue.
 * Handles batch generation with concurrency control.
 */

import { Worker, Job } from 'bullmq';
import { supabaseAdmin } from '../src/lib/supabase/client';
import { renderCertificateHTML, renderCertificatePDF, renderCertificatePNG } from '../src/lib/certificate-template';
import { uploadFile } from '../src/lib/storage';
import { sendCertificateEmail } from '../src/lib/email';
import QRCode from 'qrcode';
import type { CertificateTemplateLayout } from '../src/lib/certificate-service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface CertificateJobData {
  client_id: string;
  event_id: string;
  certificate_type: string;
  template_id: string;
  certificate_ids: string[];
  total: number;
}

interface CertificateRecord {
  id: string;
  client_id: string;
  certificate_number: string;
  access_token: string;
  template_snapshot: CertificateTemplateLayout | null;
  metadata: Record<string, unknown>;
  event_title?: string;
  recipient_name?: string;
}

const worker = new Worker<CertificateJobData>(
  'certificate-generation',
  async (job: Job<CertificateJobData>) => {
    const { client_id, event_id, certificate_ids } = job.data;
    
    console.log(`[CertWorker] Processing job ${job.id}: ${certificate_ids.length} certificates`);

    let processed = 0;
    let failed = 0;

    // Process in batches of 5 for Puppeteer concurrency
    const BATCH_SIZE = 5;
    for (let i = 0; i < certificate_ids.length; i += BATCH_SIZE) {
      const batch = certificate_ids.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (certId) => {
          try {
            await processCertificate(certId, client_id);
            processed++;
          } catch (err) {
            console.error(`[CertWorker] Failed cert ${certId}:`, err);
            failed++;
          }
        })
      );

      // Update job progress
      await job.updateProgress(Math.round(((i + batch.length) / certificate_ids.length) * 100));
    }

    console.log(`[CertWorker] Job ${job.id} complete: ${processed} processed, ${failed} failed`);
    return { processed, failed, total: certificate_ids.length };
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

async function processCertificate(certId: string, clientId: string): Promise<void> {
  // Fetch certificate with related data
  const { data: cert, error } = await supabaseAdmin
    .from('certificates')
    .select(`
      id, client_id, certificate_number, access_token,
      template_snapshot, metadata, event_id,
      events!inner(title),
      certificate_types!inner(name),
      clients!inner(name)
    `)
    .eq('id', certId)
    .single();

  if (error || !cert) {
    throw new Error(`Certificate ${certId} not found`);
  }

  // Skip if already rendered
  if (cert.pdf_url) return;

  const typedCert = cert as unknown as CertificateRecord;
  const layout = typedCert.template_snapshot;
  if (!layout) {
    throw new Error(`Certificate ${certId} has no template snapshot`);
  }

  const eventTitle = (cert as any).events?.title || '';
  const typeName = (cert as any).certificate_types?.name || '';
  const orgName = (cert as any).clients?.name || '';
  const recipientName = (typedCert.metadata?.recipient_name as string) || '';

  // Build placeholders
  const placeholders: Record<string, string> = {
    '{{name}}': recipientName,
    '{{event_title}}': eventTitle,
    '{{event_date}}': '',
    '{{certificate_type}}': typeName,
    '{{certificate_number}}': typedCert.certificate_number,
    '{{organization_name}}': orgName,
    ...(typedCert.metadata?.placeholders as Record<string, string> || {}),
  };

  // Generate QR code
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hey-pass.vercel.app';
  const qrDataUrl = await QRCode.toDataURL(
    `${appUrl}/verify/${typedCert.certificate_number}`,
    { width: 120, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' } }
  );

  // Render HTML
  const html = renderCertificateHTML({
    layout,
    placeholders,
    qr_code_url: qrDataUrl,
    output_type: 'pdf',
  });

  // Render PDF and PNG in parallel
  const [pdfBuffer, pngBuffer] = await Promise.all([
    renderCertificatePDF(html),
    renderCertificatePNG(html),
  ]);

  // Upload to storage
  const basePath = `certs/${clientId}/${typedCert.certificate_number}`;
  const [pdfUpload, pngUpload] = await Promise.all([
    uploadFile('certificates', `${basePath}.pdf`, pdfBuffer, 'application/pdf'),
    uploadFile('certificates', `${basePath}.png`, pngBuffer, 'image/png'),
  ]);

  // Update certificate record
  await supabaseAdmin
    .from('certificates')
    .update({
      pdf_url: pdfUpload.path,
      png_url: pngUpload.path,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', certId);

  // Log delivery
  await supabaseAdmin.from('certificate_deliveries').insert({
    certificate_id: certId,
    client_id: clientId,
    method: 'queue',
    status: 'completed',
    delivered_at: new Date().toISOString(),
  }).catch(() => {});

  // Send email if available
  const recipientEmail = typedCert.metadata?.email as string | undefined;
  if (recipientEmail && recipientName) {
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfUrl = `${appUrl}/api/cert/download?number=${typedCert.certificate_number}`;
    await sendCertificateEmail(
      recipientEmail,
      recipientName,
      eventTitle,
      typedCert.certificate_number,
      pdfUrl,
      pdfBase64
    ).catch((err) => {
      console.error(`[CertWorker] Email failed for ${typedCert.certificate_number}:`, err);
    });
  }
}

// Error handlers
worker.on('failed', (job, err) => {
  console.error(`[CertWorker] Job ${job?.id} failed:`, err.message);
});

worker.on('completed', (job) => {
  console.log(`[CertWorker] Job ${job.id} completed`);
});

console.log('[CertWorker] Certificate generation worker started');

export default worker;
