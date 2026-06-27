import {
  WhatsAppProvider,
  WhatsAppConfigInput,
  WhatsAppTemplate,
  WhatsAppWebhookEvent,
} from './provider-interface';

export class MetaWhatsAppProvider implements WhatsAppProvider {
  name = 'meta';

  private getApiBase(config: WhatsAppConfigInput): string {
    return `https://graph.facebook.com/v19.0`;
  }

  async verifyCredentials(config: WhatsAppConfigInput): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!config.access_token || !config.phone_number_id) {
        return { valid: false, error: 'Missing access_token or phone_number_id' };
      }

      const res = await fetch(
        `${this.getApiBase(config)}/${config.phone_number_id}?access_token=${config.access_token}`
      );
      const data = await res.json();

      if (data.error) {
        return { valid: false, error: data.error.message || 'Invalid credentials' };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: `Connection failed: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  }

  async testMessage(config: WhatsAppConfigInput, to: string, templateName: string): Promise<{ sent: boolean; error?: string }> {
    try {
      if (!config.access_token || !config.phone_number_id) {
        return { sent: false, error: 'Missing credentials' };
      }

      const res = await fetch(
        `${this.getApiBase(config)}/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' },
            },
          }),
        }
      );
      const data = await res.json();

      if (data.error) {
        return { sent: false, error: data.error.message };
      }

      return { sent: true };
    } catch (err) {
      return { sent: false, error: `Send failed: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  }

  async syncTemplates(config: WhatsAppConfigInput): Promise<WhatsAppTemplate[]> {
    try {
      if (!config.access_token || !config.business_account_id) {
        return [];
      }

      const res = await fetch(
        `${this.getApiBase(config)}/${config.business_account_id}/message_templates?access_token=${config.access_token}`
      );
      const data = await res.json();

      if (data.error || !data.data) {
        return [];
      }

      return data.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category?.toLowerCase() || 'unknown',
        language: t.language,
        status: t.status?.toLowerCase() || 'pending',
        header_type: t.components?.find((c: any) => c.type === 'HEADER')?.format?.toLowerCase(),
        header_text: t.components?.find((c: any) => c.type === 'HEADER')?.text,
        body_text: t.components?.find((c: any) => c.type === 'BODY')?.text || '',
        footer_text: t.components?.find((c: any) => c.type === 'FOOTER')?.text,
        buttons: (t.components?.filter((c: any) => c.type === 'BUTTONS')?.[0]?.buttons || []).map((b: any) => ({
          type: b.type?.toLowerCase() === 'url' ? 'url' : b.type?.toLowerCase() === 'phone_number' ? 'phone_number' : 'quick_reply',
          text: b.text,
          url: b.url,
          phone_number: b.phone_number,
        })),
        variables: this.extractVariables(t.components?.find((c: any) => c.type === 'BODY')?.text || ''),
      }));
    } catch (err) {
      console.error('Failed to sync Meta templates:', err);
      return [];
    }
  }

  async sendText(config: WhatsAppConfigInput, to: string, text: string): Promise<{ messageId: string; error?: string }> {
    try {
      if (!config.access_token || !config.phone_number_id) {
        return { messageId: '', error: 'Missing credentials' };
      }

      const res = await fetch(
        `${this.getApiBase(config)}/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text },
          }),
        }
      );
      const data = await res.json();

      if (data.error) {
        return { messageId: '', error: data.error.message };
      }

      return { messageId: data.messages?.[0]?.id || '' };
    } catch (err) {
      return { messageId: '', error: `Send failed: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  }

  async sendTemplate(config: WhatsAppConfigInput, to: string, templateName: string, variables?: Record<string, string>): Promise<{ messageId: string; error?: string }> {
    try {
      if (!config.access_token || !config.phone_number_id) {
        return { messageId: '', error: 'Missing credentials' };
      }

      const components: any[] = [];

      if (variables && Object.keys(variables).length > 0) {
        const bodyParams = Object.entries(variables).map(([key, value]) => ({
          type: 'text',
          text: value,
        }));

        components.push({
          type: 'body',
          parameters: bodyParams,
        });
      }

      const payload: any = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
        },
      };

      if (components.length > 0) {
        payload.template.components = components;
      }

      const res = await fetch(
        `${this.getApiBase(config)}/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (data.error) {
        return { messageId: '', error: data.error.message };
      }

      return { messageId: data.messages?.[0]?.id || '' };
    } catch (err) {
      return { messageId: '', error: `Send failed: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  }

  verifyWebhook(config: WhatsAppConfigInput, mode: string, token: string, challenge: string): Promise<string | null> {
    if (mode === 'subscribe' && token === config.webhook_verify_token) {
      return Promise.resolve(challenge);
    }
    return Promise.resolve(null);
  }

  verifySignature(_config: WhatsAppConfigInput, body: string, signature: string | null): boolean {
    // Meta sends X-Hub-Signature-256 header
    if (!signature || !_config.webhook_secret) return false;

    try {
      const crypto = require('crypto');
      const expected = 'sha256=' + crypto
        .createHmac('sha256', _config.webhook_secret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  parseWebhookPayload(body: string): WhatsAppWebhookEvent[] {
    try {
      const data = JSON.parse(body);
      const events: WhatsAppWebhookEvent[] = [];

      if (data.entry) {
        for (const entry of data.entry) {
          for (const change of entry.changes || []) {
            const value = change.value;

            // Status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                events.push({
                  type: 'status',
                  phone_number: status.recipient_id,
                  message_id: status.id,
                  status: status.status?.toLowerCase(),
                  timestamp: status.timestamp,
                  error: status.errors?.[0]?.message,
                });
              }
            }

            // Incoming messages
            if (value.messages) {
              for (const msg of value.messages) {
                events.push({
                  type: 'message',
                  phone_number: msg.from,
                  message_id: msg.id,
                  text: msg.text?.body,
                  timestamp: msg.timestamp,
                });
              }
            }
          }
        }
      }

      return events;
    } catch {
      return [];
    }
  }

  private extractVariables(text: string): string[] {
    const regex = /\{\{(\d+)\}\}/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      vars.push(match[1]);
    }
    return vars;
  }
}

export function createWhatsAppProvider(provider: string): WhatsAppProvider {
  switch (provider) {
    case 'meta':
    default:
      return new MetaWhatsAppProvider();
  }
}
