import { supabaseAdmin } from '@/lib/supabase/client';
import { randomUUID } from 'crypto';

export interface PaymentMethod {
  id: string;
  client_id: string;
  method_type: 'bank_account' | 'upi';
  bank_name: string | null;
  account_holder_name: string;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  upi_id: string | null;
  upi_qr_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface CreatePaymentMethodInput {
  method_type: 'bank_account' | 'upi';
  bank_name?: string;
  account_holder_name: string;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  upi_id?: string;
}

export class PaymentMethodService {
  private supabase = createClient();

  async list(clientId: string): Promise<PaymentMethod[]> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async get(clientId: string, id: string): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('client_id', clientId)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data;
  }

  async create(clientId: string, input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    // Validate based on type
    if (input.method_type === 'bank_account') {
      if (!input.account_number || !input.ifsc_code) {
        throw new Error('Bank account requires account_number and ifsc_code');
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(input.ifsc_code)) {
        throw new Error('Invalid IFSC code format');
      }
    }

    if (input.method_type === 'upi') {
      if (!input.upi_id) {
        throw new Error('UPI requires upi_id');
      }
      if (!/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+$/.test(input.upi_id)) {
        throw new Error('Invalid UPI ID format (expected user@bank)');
      }
    }

    // Limit: max 2 bank accounts + 1 UPI
    const existing = await this.list(clientId);
    const bankCount = existing.filter(m => m.method_type === 'bank_account').length;
    const upiCount = existing.filter(m => m.method_type === 'upi').length;

    if (input.method_type === 'bank_account' && bankCount >= 2) {
      throw new Error('Maximum 2 bank accounts allowed');
    }
    if (input.method_type === 'upi' && upiCount >= 1) {
      throw new Error('Maximum 1 UPI method allowed');
    }

    const maxOrder = existing.reduce((max, m) => Math.max(max, m.display_order), 0);

    const { data, error } = await this.supabase
      .from('payment_methods')
      .insert({
        client_id: clientId,
        method_type: input.method_type,
        bank_name: input.bank_name || null,
        account_holder_name: input.account_holder_name,
        account_number: input.account_number || null,
        ifsc_code: input.ifsc_code?.toUpperCase() || null,
        branch_name: input.branch_name || null,
        upi_id: input.upi_id || null,
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(clientId: string, id: string, input: Partial<CreatePaymentMethodInput>): Promise<PaymentMethod> {
    const existing = await this.get(clientId, id);
    if (!existing) throw new Error('Payment method not found');

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.method_type && input.method_type !== existing.method_type) {
      throw new Error('Cannot change method type. Delete and create a new one.');
    }

    if (input.bank_name !== undefined) updates.bank_name = input.bank_name;
    if (input.account_holder_name !== undefined) updates.account_holder_name = input.account_holder_name;
    if (input.account_number !== undefined) updates.account_number = input.account_number;
    if (input.ifsc_code !== undefined) updates.ifsc_code = input.ifsc_code?.toUpperCase();
    if (input.branch_name !== undefined) updates.branch_name = input.branch_name;
    if (input.upi_id !== undefined) updates.upi_id = input.upi_id;

    const { data, error } = await this.supabase
      .from('payment_methods')
      .update(updates)
      .eq('client_id', clientId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(clientId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_methods')
      .update({ deleted_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('id', id);

    if (error) throw error;
  }

  async reorder(clientId: string, orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) =>
      this.supabase
        .from('payment_methods')
        .update({ display_order: index + 1 })
        .eq('client_id', clientId)
        .eq('id', id)
    );

    await Promise.all(updates);
  }

  async toggleActive(clientId: string, id: string): Promise<PaymentMethod> {
    const existing = await this.get(clientId, id);
    if (!existing) throw new Error('Payment method not found');

    const { data, error } = await this.supabase
      .from('payment_methods')
      .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const paymentMethodService = new PaymentMethodService();
