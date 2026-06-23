import { supabaseAdmin } from '@/lib/supabase/client';

export interface Commission {
  id: string;
  client_id: string;
  event_id: string | null;
  invoice_id: string | null;
  transaction_id: string;
  transaction_amount: number;
  commission_rate: number;
  commission_amount: number;
  gst_amount: number;
  net_payout: number;
  status: string;
  transaction_at: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  subscription_id: string | null;
  invoice_number: string;
  type: string;
  status: string;
  subtotal: number;
  commission_amount: number;
  gst_amount: number;
  total: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  items?: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface CreateInvoiceInput {
  client_id: string;
  type: 'subscription' | 'commission' | 'refund' | 'credit';
  subscription_id?: string;
  period_start?: string;
  period_end?: string;
  notes?: string;
  items: { description: string; quantity: number; unit_price: number }[];
}

class CommissionInvoiceServiceImpl {
  private GST_RATE = 0.18;

  // ===== COMMISSIONS =====

  async createCommission(input: {
    client_id: string;
    event_id?: string;
    transaction_id: string;
    transaction_amount: number;
    transaction_at?: string;
  }): Promise<Commission> {
    // Get commission rate from subscription
    const { data: subData } = await supabaseAdmin
      .from('client_subscriptions')
      .select('subscription_plans(commission_rate)')
      .eq('client_id', input.client_id)
      .eq('status', 'active')
      .limit(1)
      .single();

    const rate = (subData as any)?.subscription_plans?.commission_rate || 2.5;
    const commissionAmount = Math.round(input.transaction_amount * rate / 100 * 100) / 100;
    const gstAmount = Math.round(commissionAmount * this.GST_RATE * 100) / 100;
    const netPayout = Math.round((input.transaction_amount - commissionAmount - gstAmount) * 100) / 100;

    const { data, error } = await supabaseAdmin
      .from('commissions')
      .insert({
        client_id: input.client_id,
        event_id: input.event_id || null,
        transaction_id: input.transaction_id,
        transaction_amount: input.transaction_amount,
        commission_rate: rate,
        commission_amount: commissionAmount,
        gst_amount: gstAmount,
        net_payout: netPayout,
        status: 'pending',
        transaction_at: input.transaction_at || new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async listCommissions(clientId: string, options?: {
    event_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ commissions: Commission[]; total: number }> {
    let query = supabaseAdmin
      .from('commissions')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('transaction_at', { ascending: false });

    if (options?.event_id) query = query.eq('event_id', options.event_id);
    if (options?.status) query = query.eq('status', options.status);
    if (options?.date_from) query = query.gte('transaction_at', options.date_from);
    if (options?.date_to) query = query.lte('transaction_at', options.date_to);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { commissions: data || [], total: count || 0 };
  }

  async getCommissionSummary(clientId: string, dateFrom?: string, dateTo?: string) {
    let query = supabaseAdmin
      .from('commissions')
      .select('transaction_amount, commission_amount, gst_amount, net_payout, status')
      .eq('client_id', clientId);

    if (dateFrom) query = query.gte('transaction_at', dateFrom);
    if (dateTo) query = query.lte('transaction_at', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const commissions = data || [];
    return {
      total_transactions: commissions.length,
      total_amount: commissions.reduce((s, c) => s + c.transaction_amount, 0),
      total_commission: commissions.reduce((s, c) => s + c.commission_amount, 0),
      total_gst: commissions.reduce((s, c) => s + c.gst_amount, 0),
      total_net_payout: commissions.reduce((s, c) => s + c.net_payout, 0),
      pending: {
        count: commissions.filter(c => c.status === 'pending').length,
        amount: commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_amount, 0),
      },
      invoiced: {
        count: commissions.filter(c => c.status === 'invoiced').length,
        amount: commissions.filter(c => c.status === 'invoiced').reduce((s, c) => s + c.commission_amount, 0),
      },
    };
  }

  // ===== INVOICES =====

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber(input.client_id);

    const subtotal = input.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    const gstAmount = Math.round(subtotal * this.GST_RATE * 100) / 100;
    const total = subtotal + gstAmount;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        client_id: input.client_id,
        subscription_id: input.subscription_id || null,
        invoice_number: invoiceNumber,
        type: input.type,
        status: 'sent',
        subtotal,
        gst_amount: gstAmount,
        total,
        currency: 'INR',
        period_start: input.period_start || null,
        period_end: input.period_end || null,
        due_date: dueDate.toISOString().split('T')[0],
        notes: input.notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Insert line items
    for (const item of input.items) {
      await supabaseAdmin.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      });
    }

    return invoice;
  }

  async listInvoices(clientId: string, options?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ invoices: Invoice[]; total: number }> {
    let query = supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (options?.type) query = query.eq('type', options.type);
    if (options?.status) query = query.eq('status', options.status);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { invoices: data || [], total: count || 0 };
  }

  async getInvoice(clientId: string, invoiceId: string): Promise<Invoice | null> {
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('client_id', clientId)
      .single();

    if (error || !invoice) return null;

    const { data: items } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    return { ...invoice, items: items || [] };
  }

  async markInvoicePaid(invoiceId: string, paymentMethod: string, paymentReference: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (error) throw error;
  }

  async generateInvoicePDF(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoice('', invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const html = this.renderInvoiceHTML(invoice);

    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.default.launch({
      executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async generateInvoiceNumber(clientId: string): Promise<string> {
    const year = new Date().getFullYear();

    const { data } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('client_id', clientId)
      .like('invoice_number', `INV-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single();

    let seq = 1;
    if (data?.invoice_number) {
      const match = data.invoice_number.match(/INV-\d{4}-(\d+)/);
      if (match) seq = parseInt(match[1]) + 1;
    }

    return `INV-${year}-${String(seq).padStart(6, '0')}`;
  }

  private renderInvoiceHTML(invoice: Invoice): string {
    const items = invoice.items || [];
    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb">${item.description}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">₹${item.unit_price.toLocaleString()}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">₹${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; color: #1a1a2e; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 28px; font-weight: 700; color: #54ACBF; }
    .invoice-title { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .invoice-number { color: #6b7280; }
    .section { margin-bottom: 32px; }
    .label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
    .value { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .totals { margin-top: 24px; text-align: right; }
    .totals div { display: flex; justify-content: flex-end; gap: 40px; padding: 8px 0; }
    .totals .label { width: 120px; text-align: right; }
    .totals .value { width: 120px; text-align: right; font-weight: 600; }
    .total-final { border-top: 2px solid #1a1a2e; padding-top: 12px; font-size: 18px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">HeyPass</div>
        <div style="color:#6b7280;font-size:12px;margin-top:4px">Event Operations Platform</div>
      </div>
      <div style="text-align:right">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div style="margin-top:8px;color:#6b7280;font-size:12px">
          Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}<br>
          Due: ${invoice.due_date || 'N/A'}
        </div>
      </div>
    </div>

    <div style="display:flex;gap:40px;margin-bottom:40px">
      <div>
        <div class="label">Bill To</div>
        <div class="value">HeyPass Client</div>
      </div>
      <div>
        <div class="label">Invoice Type</div>
        <div class="value" style="text-transform:capitalize">${invoice.type}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="value" style="text-transform:capitalize;color:${invoice.status === 'paid' ? '#10b981' : '#f59e0b'}">${invoice.status}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left">Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <div><span class="label">Subtotal</span><span class="value">₹${invoice.subtotal.toLocaleString()}</span></div>
      <div><span class="label">GST (18%)</span><span class="value">₹${invoice.gst_amount.toLocaleString()}</span></div>
      <div class="total-final"><span class="label">Total</span><span class="value">₹${invoice.total.toLocaleString()}</span></div>
    </div>

    ${invoice.notes ? `<div style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px"><div class="label">Notes</div><div class="value">${invoice.notes}</div></div>` : ''}

    <div class="footer">
      <div>HeyPass | Event Operations Platform</div>
      <div style="margin-top:4px">Payment: Bank Transfer / UPI</div>
      <div style="margin-top:4px">For questions, contact billing@heypass.app</div>
    </div>
  </div>
</body>
</html>`;
  }
}

export const commissionInvoiceService = new CommissionInvoiceServiceImpl();
