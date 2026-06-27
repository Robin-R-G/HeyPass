export interface WhatsAppProvider {
  name: string;
  
  // Connection
  verifyCredentials(config: WhatsAppConfigInput): Promise<{ valid: boolean; error?: string }>;
  testMessage(config: WhatsAppConfigInput, to: string, templateName: string): Promise<{ sent: boolean; error?: string }>;
  
  // Templates
  syncTemplates(config: WhatsAppConfigInput): Promise<WhatsAppTemplate[]>;
  
  // Messages
  sendText(config: WhatsAppConfigInput, to: string, text: string): Promise<{ messageId: string; error?: string }>;
  sendTemplate(config: WhatsAppConfigInput, to: string, templateName: string, variables?: Record<string, string>): Promise<{ messageId: string; error?: string }>;
  
  // Webhook
  verifyWebhook(config: WhatsAppConfigInput, mode: string, token: string, challenge: string): Promise<string | null>;
  verifySignature(config: WhatsAppConfigInput, body: string, signature: string | null): boolean;
  parseWebhookPayload(body: string): WhatsAppWebhookEvent[];
}

export interface WhatsAppConfigInput {
  business_account_id?: string;
  phone_number_id?: string;
  meta_app_id?: string;
  meta_app_secret?: string;
  access_token?: string;
  webhook_verify_token?: string;
  webhook_secret?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected' | 'disabled';
  header_type?: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  buttons: WhatsAppTemplateButton[];
  variables: string[];
}

export interface WhatsAppTemplateButton {
  type: 'url' | 'quick_reply' | 'phone_number';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface WhatsAppWebhookEvent {
  type: 'message' | 'status' | 'template_status';
  phone_number?: string;
  message_id?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: string;
  text?: string;
  template_name?: string;
  error?: string;
}
