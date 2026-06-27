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
      from: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@heypass.com',
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
  console.warn('[Email] SendGrid not configured — email not sent');

  return { success: false, skipped: true, error: 'Email provider not configured' };
}

export async function sendTicketEmail(
  to: string,
  attendeeName: string,
  eventTitle: string,
  ticketNumber: string,
  ticketPdfBase64?: string
) {
  const attachments = ticketPdfBase64 ? [{
    filename: `ticket-${ticketNumber}.pdf`,
    content: ticketPdfBase64,
    type: 'application/pdf',
  }] : undefined;

  const downloadLink = ticketPdfBase64
    ? '<p>Your ticket is attached to this email. You can also find it in your event dashboard.</p>'
    : '<p>You can view your ticket in your event dashboard.</p>';

  await sendEmail({
    to,
    subject: `Your Ticket for ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #0f3460); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">🎫 Ticket Confirmed!</h1>
        </div>
        <div style="background: #1e1e2e; padding: 32px; border-radius: 0 0 12px 12px; color: #fff;">
          <p style="color: #ccc; font-size: 16px;">Hi <strong style="color: #fff;">${escapeHtml(attendeeName)}</strong>,</p>
          <p style="color: #ccc; font-size: 15px;">Your ticket for <strong style="color: #e94560;">${escapeHtml(eventTitle)}</strong> is confirmed.</p>
          
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1);">
            <p style="margin: 0 0 8px; color: #888; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Ticket Number</p>
            <p style="margin: 0; color: #fff; font-size: 18px; font-weight: 700; font-family: monospace;">${escapeHtml(ticketNumber)}</p>
          </div>

          ${downloadLink}

          <p style="color: #ccc; font-size: 14px;">📱 <strong>Show the QR code at the entrance</strong> for quick check-in.</p>
          
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #666; font-size: 12px;">Powered by HeyPass</p>
        </div>
      </div>
    `,
    attachments,
  });
}

export async function sendCertificateEmail(
  to: string,
  attendeeName: string,
  eventTitle: string,
  certificateNumber: string,
  certificatePdfUrl: string,
  certificatePdfBase64?: string
) {
  const attachments = certificatePdfBase64 ? [{
    filename: `certificate-${certificateNumber}.pdf`,
    content: certificatePdfBase64,
    type: 'application/pdf',
  }] : undefined;

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hey-pass.vercel.app'}/verify`;

  const result = await sendEmail({
    to,
    subject: `Your Certificate for ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #000; margin: 0; font-size: 24px; font-weight: 700;">🏆 Certificate Ready!</h1>
        </div>
        <div style="background: #1e1e2e; padding: 32px; border-radius: 0 0 12px 12px; color: #fff;">
          <p style="color: #ccc; font-size: 16px;">Hi <strong style="color: #fff;">${escapeHtml(attendeeName)}</strong>,</p>
          <p style="color: #ccc; font-size: 15px;">Your certificate for <strong style="color: #6366F1;">${escapeHtml(eventTitle)}</strong> has been generated.</p>
          
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1);">
            <p style="margin: 0 0 8px; color: #888; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Certificate Number</p>
            <p style="margin: 0; color: #fff; font-size: 18px; font-weight: 700; font-family: monospace;">${escapeHtml(certificateNumber)}</p>
          </div>

          <p style="color: #ccc; font-size: 14px;">Your certificate is attached to this email. You can also verify it online:</p>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #6366F1; color: #000; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Verify Certificate</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #666; font-size: 12px;">Powered by HeyPass</p>
        </div>
      </div>
    `,
    attachments,
  });
}

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  organizationName: string,
  role: string,
  invitationLink: string,
  expiresAt: string,
  message?: string
) {
  return sendEmail({
    to,
    subject: `You're invited to join ${organizationName} on HeyPass`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #000; margin: 0; font-size: 24px; font-weight: 700;">HeyPass</h1>
        </div>
        <div style="background: var(--hp-bg-elevated); padding: 32px; border-radius: 0 0 12px 12px; color: #fff;">
          <h2 style="color: #6366F1; margin-top: 0;">You're Invited!</h2>
          <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organizationName)}</strong> on HeyPass as a <strong>${escapeHtml(role)}</strong>.</p>
          ${message ? `<p style="color: #999; font-style: italic;">"${escapeHtml(message)}"</p>` : ''}
          <div style="text-align: center; margin: 32px 0;">
            <a href="${invitationLink}" style="background: #6366F1; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="color: #999; font-size: 13px;">This invitation expires on <strong>${new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          <p style="color: #666; font-size: 12px;">Powered by HeyPass</p>
        </div>
      </div>
    `,
  });
}

export async function sendOrgCreatedEmail(
  to: string,
  ownerName: string,
  organizationName: string,
  tempPassword: string,
  loginLink: string
) {
  return sendEmail({
    to,
    subject: `Welcome to ${organizationName} on HeyPass`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #000; margin: 0; font-size: 24px; font-weight: 700;">HeyPass</h1>
        </div>
        <div style="background: var(--hp-bg-elevated); padding: 32px; border-radius: 0 0 12px 12px; color: #fff;">
          <h2 style="color: #6366F1; margin-top: 0;">Welcome aboard!</h2>
          <p>Hi ${escapeHtml(ownerName)},</p>
          <p>Your organization <strong>${escapeHtml(organizationName)}</strong> has been created on HeyPass.</p>
          <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #999; font-size: 12px;">LOGIN CREDENTIALS</p>
            <p style="margin: 0; color: #fff; font-size: 14px;">Email: <strong>${escapeHtml(to)}</strong></p>
            <p style="margin: 4px 0 0; color: #fff; font-size: 14px;">Password: <strong style="color: #6366F1;">${escapeHtml(tempPassword)}</strong></p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginLink}" style="background: #6366F1; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Login to HeyPass</a>
          </div>
          <p style="color: #ef4444; font-size: 13px;"><strong>Important:</strong> You will be asked to change your password on first login.</p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #666; font-size: 12px;">If you did not expect this email, please contact support.</p>
          <p style="color: #666; font-size: 12px;">Powered by HeyPass</p>
        </div>
      </div>
    `,
  });
}
