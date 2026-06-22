import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
  }>;
}

export async function sendEmail(params: SendEmailParams) {
  const { to, subject, html, from, attachments } = params;

  if (process.env.SENDGRID_API_KEY) {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    return sgMail.send({
      to,
      from: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@entrypass.com',
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        type: a.type || 'application/pdf',
        disposition: 'attachment',
      })),
    });
  }

  // Fallback: log to console (no PII)
  console.log('Email sent (SendGrid not configured): attachmentCount=%d', attachments?.length || 0);

  return { success: true };
}

export async function sendTicketEmail(
  to: string,
  attendeeName: string,
  eventTitle: string,
  ticketNumber: string,
  ticketPdfUrl: string
) {
  await sendEmail({
    to,
    subject: `Your Ticket for ${eventTitle}`,
    html: `
      <h1>Ticket Confirmed!</h1>
      <p>Hi ${escapeHtml(attendeeName)},</p>
      <p>Your ticket for <strong>${escapeHtml(eventTitle)}</strong> is ready.</p>
      <p>Ticket Number: <strong>${escapeHtml(ticketNumber)}</strong></p>
      <p>Please find your ticket attached.</p>
      <p>Show the QR code at the entrance for check-in.</p>
      <hr />
      <p>Powered by EntryPass</p>
    `,
  });
}

export async function sendCertificateEmail(
  to: string,
  attendeeName: string,
  eventTitle: string,
  certificateNumber: string,
  certificatePdfUrl: string
) {
  const result = await sendEmail({
    to,
    subject: `Your Certificate for ${eventTitle}`,
    html: `
      <h1>Certificate Ready!</h1>
      <p>Hi ${escapeHtml(attendeeName)},</p>
      <p>Your certificate for <strong>${escapeHtml(eventTitle)}</strong> has been generated.</p>
      <p>Certificate Number: <strong>${escapeHtml(certificateNumber)}</strong></p>
      <p><a href="${certificatePdfUrl}">Download Certificate</a></p>
      <p>Verify your certificate: ${process.env.NEXT_PUBLIC_APP_URL}/verify/${certificateNumber}</p>
      <hr />
      <p>Powered by EntryPass</p>
    `,
  });
}
