import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('event_id');
      const status = searchParams.get('status');
      const methodType = searchParams.get('method_type');
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      let query = supabaseAdmin
        .from('payments')
        .select(`
          id,
          amount,
          currency,
          status,
          transaction_ref,
          paid_at,
          created_at,
          notes,
          events!inner(id, title),
          payment_methods!left(id, method_type, bank_name, upi_id, account_holder_name),
          registrations!left(id, registrant_name, registrant_email)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (from) {
        query = query.gte('created_at', from);
      }
      if (to) {
        query = query.lte('created_at', to);
      }

      const { data: payments, error } = await query;

      if (error) throw error;

      // Filter by payment method type in JS (since it's a left join)
      let filtered = payments || [];
      if (methodType) {
        filtered = filtered.filter((p: any) =>
          p.payment_methods?.method_type === methodType
        );
      }

      // Build CSV
      const headers = [
        'Transaction ID',
        'Event',
        'Registrant Name',
        'Registrant Email',
        'Amount',
        'Currency',
        'Payment Method Type',
        'Bank Name / UPI ID',
        'Account Holder',
        'Status',
        'Transaction Ref',
        'Paid At',
        'Created At',
        'Notes',
      ];

      const rows = filtered.map((p: any) => [
        p.id,
        p.events?.title || '',
        p.registrations?.registrant_name || '',
        p.registrations?.registrant_email || '',
        p.amount,
        p.currency,
        p.payment_methods?.method_type || '',
        p.payment_methods?.method_type === 'bank_account'
          ? p.payment_methods?.bank_name || ''
          : p.payment_methods?.upi_id || '',
        p.payment_methods?.account_holder_name || '',
        p.status,
        p.transaction_ref || '',
        p.paid_at || '',
        p.created_at,
        (p.notes || '').replace(/"/g, '""'),
      ]);

      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map((row: unknown[]) =>
          row.map((cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
