import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function generateAccessToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateTicketNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `TICKET-${year}-${String(sequence).padStart(6, '0')}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateDurationMinutes(start: string | Date, end: string | Date): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
}

export function calculateAttendancePercentage(
  durationMinutes: number,
  eventDurationMinutes: number
): number {
  if (eventDurationMinutes <= 0) return 0;
  return Math.min(
    Math.round((durationMinutes / eventDurationMinutes) * 100 * 100) / 100,
    100
  );
}

export function isEligibleForCertificate(percentage: number, threshold = 50): boolean {
  return percentage >= threshold;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
