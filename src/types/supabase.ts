export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      attendance_rules: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      attendance_summary: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      audit_logs: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      billing_webhook_events: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      certificate_downloads: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      certificate_share_links: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      certificate_templates: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      certificate_types: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      certificate_verifications: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      certificates: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      check_in_stations: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      check_ins: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      check_outs: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      client_branding: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      client_domains: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      client_memberships: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      client_subscriptions: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      clients: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      commissions: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      coupons: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      emergency_contacts: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      emergency_incidents: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      event_branding: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      event_co_hosts: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      event_subscriptions: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      event_tags: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      event_ticket_summary: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      event_venues: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      events: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      food_token_types: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      food_tokens: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      form_analytics: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      form_fields: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      form_sections: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      form_templates: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      fraud_alerts: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      fraud_rules: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      gate_performance: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      gate_sessions: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      gate_staff: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      gate_stats: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      incident_timeline: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      invoice_items: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      invoices: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      lost_found_items: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      memberships: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      notification_preferences: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      notification_queue: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      notification_templates: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      notifications: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      offline_scans: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      payment_gateway_config: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      payment_methods: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      payments: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      qr_nonces: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      qr_scan_attempts: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      registration_forms: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      registration_links: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      registration_responses: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      registrations: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      role_permissions: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      roles: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      session_attendance: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      session_speakers: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      sessions: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      sponsor_branding: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      sponsor_scans: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      sponsors: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      staff_performance: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      staff_shifts: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      subscription_plans: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      ticket_types: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      tickets: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      users: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      verification_rate_limits: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      volunteer_applications: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      volunteer_assignments: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      volunteer_availability: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      volunteer_tasks: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      webhook_deliveries: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      webhook_endpoints: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
      zip_export_jobs: {
        Row: { [key: string]: Json };
        Insert: { [key: string]: Json };
        Update: { [key: string]: Json };
      };
    };
    Views: Record<string, { Row: Record<string, Json> }>;
    Functions: {
      check_cert_generation_limit: {
        Args: { [key: string]: Json };
        Returns: Json;
      };
      check_cert_download_limit: {
        Args: { [key: string]: Json };
        Returns: Json;
      };
      increment_form_analytics: {
        Args: { [key: string]: Json };
        Returns: Json;
      };
      increment_ticket_type_sold: {
        Args: { [key: string]: Json };
        Returns: Json;
      };
      set_rls_context: {
        Args: { [key: string]: Json };
        Returns: Json;
      };
    };
  };
}
