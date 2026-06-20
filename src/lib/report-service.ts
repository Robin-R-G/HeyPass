import { supabaseAdmin } from '@/lib/supabase/client';
import JSZip from 'jszip';

export interface ReportOptions {
  format: 'csv' | 'pdf';
  date_from?: string;
  date_to?: string;
  gate_id?: string;
  session_id?: string;
}

class ReportServiceImpl {
  async attendanceReport(clientId: string, eventId: string, options: ReportOptions): Promise<string | Buffer> {
    let query = supabaseAdmin
      .from('check_ins')
      .select(`
        id, scanned_at, gate_id, gate_sessions(gate_name),
        registrations(id, first_name, last_name, email, ticket_number)
      `)
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .order('scanned_at', { ascending: true });

    if (options.date_from) query = query.gte('scanned_at', options.date_from);
    if (options.date_to) query = query.lte('scanned_at', options.date_to);
    if (options.gate_id) query = query.eq('gate_id', options.gate_id);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((row: any) => ({
      'Name': `${row.registrations?.first_name || ''} ${row.registrations?.last_name || ''}`.trim(),
      'Email': row.registrations?.email || '',
      'Ticket #': row.registrations?.ticket_number || '',
      'Gate': row.gate_sessions?.gate_name || '',
      'Check-in Time': row.scanned_at,
    }));

    if (options.format === 'csv') {
      return this.toCSV(rows);
    }

    return this.toPDF(rows, 'Attendance Report');
  }

  async revenueReport(clientId: string, eventId: string, options: ReportOptions): Promise<string | Buffer> {
    let query = supabaseAdmin
      .from('payments')
      .select('id, amount, method, status, created_at, registrations(first_name, last_name, email)')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (options.date_from) query = query.gte('created_at', options.date_from);
    if (options.date_to) query = query.lte('created_at', options.date_to);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((row: any) => ({
      'Name': `${row.registrations?.first_name || ''} ${row.registrations?.last_name || ''}`.trim(),
      'Email': row.registrations?.email || '',
      'Amount': row.amount || 0,
      'Method': row.method || '',
      'Status': row.status || '',
      'Date': row.created_at,
    }));

    if (options.format === 'csv') {
      return this.toCSV(rows);
    }

    return this.toPDF(rows, 'Revenue Report');
  }

  async volunteerReport(clientId: string, eventId: string, options: ReportOptions): Promise<string | Buffer> {
    const { data, error } = await supabaseAdmin
      .from('gate_staff')
      .select('id, user_id, users(name, email), gate_sessions(gate_name), status, started_at, ended_at')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .order('started_at', { ascending: true });

    if (error) throw error;

    const rows = (data || []).map((row: any) => {
      const hours = row.started_at && row.ended_at
        ? ((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / (1000 * 60 * 60)).toFixed(1)
        : '-';

      return {
        'Name': row.users?.name || '',
        'Email': row.users?.email || '',
        'Gate': row.gate_sessions?.gate_name || '',
        'Status': row.status || '',
        'Shift Start': row.started_at || '',
        'Shift End': row.ended_at || '',
        'Hours': hours,
      };
    });

    if (options.format === 'csv') {
      return this.toCSV(rows);
    }

    return this.toPDF(rows, 'Volunteer Report');
  }

  async certificateReport(clientId: string, eventId: string, options: ReportOptions): Promise<string | Buffer> {
    let query = supabaseAdmin
      .from('certificates')
      .select('id, certificate_number, status, issued_at, metadata, certificate_types(name), registrations(first_name, last_name, email)')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('issued_at', { ascending: true });

    if (options.date_from) query = query.gte('issued_at', options.date_from);
    if (options.date_to) query = query.lte('issued_at', options.date_to);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((row: any) => ({
      'Certificate #': row.certificate_number,
      'Recipient': row.registrations?.first_name
        ? `${row.registrations.first_name} ${row.registrations.last_name}`.trim()
        : row.metadata?.recipient_name || '',
      'Type': row.certificate_types?.name || '',
      'Status': row.status || '',
      'Issued': row.issued_at,
    }));

    if (options.format === 'csv') {
      return this.toCSV(rows);
    }

    return this.toPDF(rows, 'Certificate Report');
  }

  async gateReport(clientId: string, eventId: string, options: ReportOptions): Promise<string | Buffer> {
    const { data, error } = await supabaseAdmin
      .from('gate_stats')
      .select(`
        gate_id, gate_sessions(gate_name, gate_type),
        scans_total, scans_manual, scans_bulk,
        check_ins_count, check_outs_count, peak_hour
      `)
      .eq('client_id', clientId)
      .eq('event_id', eventId);

    if (error) throw error;

    const rows = (data || []).map((row: any) => ({
      'Gate': row.gate_sessions?.gate_name || '',
      'Type': row.gate_sessions?.gate_type || '',
      'Total Scans': row.scans_total || 0,
      'Manual Scans': row.scans_manual || 0,
      'Check-ins': row.check_ins_count || 0,
      'Check-outs': row.check_outs_count || 0,
      'Peak Hour': row.peak_hour ? `${row.peak_hour}:00` : '-',
    }));

    if (options.format === 'csv') {
      return this.toCSV(rows);
    }

    return this.toPDF(rows, 'Gate Report');
  }

  async fullReport(clientId: string, eventId: string, options: ReportOptions): Promise<Buffer> {
    const [attendance, revenue, volunteers, certificates, gates] = await Promise.all([
      this.attendanceReport(clientId, eventId, options),
      this.revenueReport(clientId, eventId, options),
      this.volunteerReport(clientId, eventId, options),
      this.certificateReport(clientId, eventId, options),
      this.gateReport(clientId, eventId, options),
    ]);

    const zip = new JSZip();
    zip.file('attendance.csv', attendance);
    zip.file('revenue.csv', revenue);
    zip.file('volunteers.csv', volunteers);
    zip.file('certificates.csv', certificates);
    zip.file('gates.csv', gates);

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private toCSV(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] || '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      ),
    ];
    return lines.join('\n');
  }

  private toPDF(rows: Record<string, unknown>[], title: string): string {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const rowsHTML = rows.map(row =>
      `<tr>${headers.map(h => `<td style="border:1px solid #ddd;padding:8px">${row[h] || ''}</td>`).join('')}</tr>`
    ).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { font-size: 20px; color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f5f5f5; text-align: left; padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
</body>
</html>`;
  }
}

export const reportService = new ReportServiceImpl();
