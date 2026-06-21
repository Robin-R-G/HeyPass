import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface WebhookEndpoint {
  id: string;
  client_id: string;
  url: string;
  description: string | null;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  response_code: number | null;
  response_body: string | null;
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
}

export interface CreateWebhookInput {
  url: string;
  description?: string;
  events: string[];
}

class WebhookServiceImpl {
  private readonly VALID_EVENTS = [
    'registration.created',
    'registration.confirmed',
    'registration.cancelled',
    'payment.completed',
    'payment.failed',
    'checkin.completed',
    'checkout.completed',
    'certificate.issued',
    'certificate.revoked',
    'ticket.issued',
    'ticket.validated',
  ];

  async list(clientId: string): Promise<WebhookEndpoint[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async get(clientId: string, endpointId: string): Promise<WebhookEndpoint | null> {
    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('*')
      .eq('id', endpointId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return data;
  }

  async create(clientId: string, input: CreateWebhookInput): Promise<WebhookEndpoint> {
    // Validate events
    const invalidEvents = input.events.filter(e => !this.VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .insert({
        client_id: clientId,
        url: input.url,
        description: input.description || null,
        events: input.events,
        secret,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async update(clientId: string, endpointId: string, input: Partial<CreateWebhookInput & { is_active: boolean }>): Promise<WebhookEndpoint> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.url !== undefined) updateData.url = input.url;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.events !== undefined) {
      const invalidEvents = input.events.filter(e => !this.VALID_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
      }
      updateData.events = input.events;
    }
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .update(updateData)
      .eq('id', endpointId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async delete(clientId: string, endpointId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_endpoints')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', endpointId)
      .eq('client_id', clientId);

    if (error) throw error;
  }

  async getDeliveries(endpointId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*')
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async trigger(clientId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    // Get all active endpoints for this client that listen to this event
    const { data: endpoints, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('id, url, secret, events')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error || !endpoints) return;

    for (const endpoint of endpoints) {
      if (!endpoint.events.includes(eventType)) continue;

      // Create delivery record
      const { data: delivery } = await supabaseAdmin
        .from('webhook_deliveries')
        .insert({
          endpoint_id: endpoint.id,
          event_type: eventType,
          payload,
          status: 'pending',
        })
        .select('id')
        .single();

      if (!delivery) continue;

      // Send webhook
      try {
        const timestamp = Date.now();
        const signature = crypto
          .createHmac('sha256', endpoint.secret)
          .update(`${timestamp}.${JSON.stringify(payload)}`)
          .digest('hex');

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-HeyPass-Timestamp': timestamp.toString(),
            'X-HeyPass-Signature': signature,
            'X-HeyPass-Event': eventType,
          },
          body: JSON.stringify({
            event: eventType,
            data: payload,
            timestamp,
          }),
          signal: AbortSignal.timeout(10000),
        });

        const responseBody = await response.text();

        await supabaseAdmin
          .from('webhook_deliveries')
          .update({
            status: response.ok ? 'delivered' : 'failed',
            response_code: response.status,
            response_body: responseBody.substring(0, 1000),
            attempts: 1,
          })
          .eq('id', delivery.id);

        // Update endpoint
        await supabaseAdmin
          .from('webhook_endpoints')
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: response.ok ? 0 : (endpoint as any).failure_count + 1,
          })
          .eq('id', endpoint.id);

      } catch (error) {
        await supabaseAdmin
          .from('webhook_deliveries')
          .update({
            status: 'failed',
            response_body: (error as Error).message,
            attempts: 1,
            next_retry_at: new Date(Date.now() + 60000).toISOString(),
          })
          .eq('id', delivery.id);
      }
    }
  }

  async test(clientId: string, endpointId: string): Promise<{ success: boolean; message: string }> {
    const endpoint = await this.get(clientId, endpointId);
    if (!endpoint) throw new Error('Endpoint not found');

    try {
      const testPayload = {
        event: 'test',
        data: { message: 'HeyPass webhook test', timestamp: new Date().toISOString() },
        timestamp: Date.now(),
      };

      const timestamp = Date.now();
      const signature = crypto
        .createHmac('sha256', (endpoint as any).secret)
        .update(`${timestamp}.${JSON.stringify(testPayload.data)}`)
        .digest('signature');

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HeyPass-Timestamp': timestamp.toString(),
          'X-HeyPass-Signature': signature,
          'X-HeyPass-Event': 'test',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      return {
        success: response.ok,
        message: `Response: ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  getValidEvents(): string[] {
    return [...this.VALID_EVENTS];
  }
}

export const webhookService = new WebhookServiceImpl();
