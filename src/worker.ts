// src/worker.ts
import { Worker } from 'bullmq';
import {
  certificateQueue,
  emailQueue,
  attendanceQueue,
  exportQueue,
} from '@/lib/queue';
import { supabaseAdmin } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email'; // assumes an exported sendEmail function

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
const log = (name: string, msg: string) => console.log(`[${name}] ${msg}`);
const logError = (name: string, err: unknown) =>
  console.error(`[${name} ERROR]`, err);

/* ---------- Certificate generation ---------- */
new Worker(
  certificateQueue.name,
  async job => {
    const {
      client_id,
      event_id,
      certificate_type,
      template_id,
      certificate_ids,
    } = job.data;
    // TODO: integrate your PDF/PNG generation (puppeteer) here.
    // Stub: just mark certificates as generated.
    await Promise.all(
      certificate_ids.map(id =>
        supabaseAdmin
          .from('certificates')
          .update({ status: 'generated', updated_at: new Date().toISOString() })
          .eq('id', id)
      )
    );
    log('Certificate', `Generated ${certificate_ids.length} cert(s)`);
  },
  { connection }
).on('failed', err => logError('Certificate', err));

/* ---------- Email sending ---------- */
new Worker(
  emailQueue.name,
  async job => {
    const { to, subject, html, attachments } = job.data;
    await sendEmail({ to, subject, html, attachments });
    log('Email', `Sent to ${to}`);
  },
  { connection }
).on('failed', err => logError('Email', err));

/* ---------- Attendance processing ---------- */
new Worker(
  attendanceQueue.name,
  async job => {
    const { event_id, client_id } = job.data;
    // Stub – replace with real attendance logic if needed.
    log('Attendance', `Processed event ${event_id}`);
  },
  { connection }
).on('failed', err => logError('Attendance', err));

/* ---------- Export processing ---------- */
new Worker(
  exportQueue.name,
  async job => {
    // TODO: implement PDF/ZIP export logic.
    log('Export', `Job ${job.id} received`);
  },
  { connection }
).on('failed', err => logError('Export', err));

log('⚙️ Workers started');
