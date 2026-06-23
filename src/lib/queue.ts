import { Queue, Worker, Job } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  connection: { url: REDIS_URL },
};

export const certificateQueue = new Queue('certificate-generation', connection);
export const emailQueue = new Queue('email-sending', connection);
export const attendanceQueue = new Queue('attendance-processing', connection);
export const exportQueue = new Queue('export-processing', connection);

export async function addCertificateJob(data: {
  client_id: string;
  event_id: string;
  certificate_type: string;
  template_id: string;
  certificate_ids: string[];
  total: number;
}) {
  return certificateQueue.add('generate-certificates', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function addAttendanceJob(data: {
  event_id: string;
  client_id: string;
}) {
  return attendanceQueue.add('calculate-attendance', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  });
}

export async function addEmailJob(data: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  return emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function addExportJob(data: {
  client_id: string;
  event_id: string;
  certificate_type: string;
  format: 'pdf' | 'png' | 'zip';
}) {
  return exportQueue.add('export-certificates', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    timeout: 600000,
  });
}

export { Worker, Job };
