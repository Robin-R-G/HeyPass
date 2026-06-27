'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, Settings, Send, Users, Radio, 
  CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  Shield, Phone, Globe, Clock, Zap
} from 'lucide-react';

interface WhatsAppConfig {
  id?: string;
  connection_status: string;
  business_name?: string;
  business_phone?: string;
  phone_number_id?: string;
  business_account_id?: string;
  meta_app_id?: string;
  default_sender_name?: string;
  default_country_code?: string;
  timezone?: string;
  messaging_limit_tier?: string;
  daily_limit?: number;
  messages_sent_today?: number;
  webhook_url?: string;
  webhook_verify_token?: string;
}

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    business_phone: '',
    phone_number_id: '',
    business_account_id: '',
    meta_app_id: '',
    access_token: '',
    meta_app_secret: '',
    webhook_secret: '',
    default_sender_name: '',
    default_country_code: '+91',
    timezone: 'Asia/Kolkata',
    template_language: 'en',
  });

  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setFormData({
          business_name: data.data.business_name || '',
          business_phone: data.data.business_phone || '',
          phone_number_id: data.data.phone_number_id || '',
          business_account_id: data.data.business_account_id || '',
          meta_app_id: data.data.meta_app_id || '',
          access_token: '',
          meta_app_secret: '',
          webhook_secret: '',
          default_sender_name: data.data.default_sender_name || '',
          default_country_code: data.data.default_country_code || '+91',
          timezone: data.data.timezone || 'Asia/Kolkata',
          template_language: data.data.template_language || 'en',
        });
      }
    } catch (err) {
      setError('Failed to load WhatsApp config');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Only send non-empty fields
      const payload: any = { ...formData };
      if (!payload.access_token) delete payload.access_token;
      if (!payload.meta_app_secret) delete payload.meta_app_secret;
      if (!payload.webhook_secret) delete payload.webhook_secret;

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Configuration saved successfully');
        setConfig(data.data);
      } else {
        setError(data.error || 'Failed to save config');
      }
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/whatsapp/verify', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSuccess('Connection verified successfully!');
        setConfig(prev => prev ? { ...prev, connection_status: 'connected' } : null);
      } else {
        setError(data.error || 'Connection verification failed');
        setConfig(prev => prev ? { ...prev, connection_status: 'error' } : null);
      }
    } catch (err) {
      setError('Failed to verify connection');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSyncTemplates() {
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/whatsapp/templates', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSuccess(`Synced ${data.data?.length || 0} templates`);
      } else {
        setError(data.error || 'Failed to sync templates');
      }
    } catch (err) {
      setError('Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FCA311' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#000' }}>WhatsApp Integration</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>
              Connect your WhatsApp Business account to send messages and broadcasts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {config?.connection_status === 'connected' ? (
              <Badge style={{ background: '#10B981', color: 'white' }}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge style={{ background: '#EF4444', color: 'white' }}>
                <AlertTriangle className="w-3 h-3 mr-1" /> Disconnected
              </Badge>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Messages Today</p>
                  <p className="text-2xl font-bold" style={{ color: '#000' }}>
                    {config?.messages_sent_today || 0}
                  </p>
                </div>
                <MessageCircle className="w-8 h-8" style={{ color: '#FCA311' }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Daily Limit</p>
                  <p className="text-2xl font-bold" style={{ color: '#000' }}>
                    {config?.daily_limit || 250}
                  </p>
                </div>
                <Zap className="w-8 h-8" style={{ color: '#FCA311' }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Limit Tier</p>
                  <p className="text-lg font-bold capitalize" style={{ color: '#000' }}>
                    {config?.messaging_limit_tier || 'restricted'}
                  </p>
                </div>
                <Shield className="w-8 h-8" style={{ color: '#FCA311' }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#666' }}>Status</p>
                  <p className="text-lg font-bold capitalize" style={{ color: '#000' }}>
                    {config?.connection_status || 'disconnected'}
                  </p>
                </div>
                <Globe className="w-8 h-8" style={{ color: '#FCA311' }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error/Success */}
        {error && (
          <Card style={{ borderColor: '#EF4444' }}>
            <CardContent className="pt-4">
              <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card style={{ borderColor: '#10B981' }}>
            <CardContent className="pt-4">
              <p className="text-sm" style={{ color: '#10B981' }}>{success}</p>
            </CardContent>
          </Card>
        )}

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" style={{ color: '#FCA311' }} />
              Business Configuration
            </CardTitle>
            <CardDescription>
              Enter your WhatsApp Business credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Business Name</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <Label>Business Phone</Label>
                <Input
                  value={formData.business_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_phone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Meta Credentials */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#000' }}>
                Meta Developer Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number ID</Label>
                  <Input
                    value={formData.phone_number_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number_id: e.target.value }))}
                    placeholder="from Meta Developer Console"
                  />
                </div>
                <div>
                  <Label>Business Account ID (WABA)</Label>
                  <Input
                    value={formData.business_account_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_account_id: e.target.value }))}
                    placeholder="from Meta Business Manager"
                  />
                </div>
                <div>
                  <Label>Meta App ID</Label>
                  <Input
                    value={formData.meta_app_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_app_id: e.target.value }))}
                    placeholder="from Meta Developer Console"
                  />
                </div>
                <div>
                  <Label>Meta App Secret</Label>
                  <Input
                    type={showTokens ? 'text' : 'password'}
                    value={formData.meta_app_secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_app_secret: e.target.value }))}
                    placeholder={config?.meta_app_secret ? '••••••••' : 'Enter App Secret'}
                  />
                </div>
              </div>
            </div>

            {/* Access Token */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#000' }}>
                Access Token
              </h3>
              <Input
                type={showTokens ? 'text' : 'password'}
                value={formData.access_token}
                onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder={config?.access_token_encrypted === '***' ? '•••••••• (saved)' : 'Paste your access token'}
              />
              <p className="text-xs mt-1" style={{ color: '#666' }}>
                From Meta Developer Console → WhatsApp → API Setup
              </p>
            </div>

            {/* Webhook */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#000' }}>
                Webhook Configuration
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config?.webhook_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/whatsapp`}
                      readOnly
                      style={{ background: '#f5f5f5' }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#666' }}>
                    Paste this URL in Meta Developer Console → Webhook
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Verify Token (auto-generated)</Label>
                    <Input
                      value={config?.webhook_verify_token || 'Auto-generated on save'}
                      readOnly
                      style={{ background: '#f5f5f5' }}
                    />
                  </div>
                  <div>
                    <Label>Webhook Secret (for signature verification)</Label>
                    <Input
                      type={showTokens ? 'text' : 'password'}
                      value={formData.webhook_secret}
                      onChange={(e) => setFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      placeholder={config?.webhook_secret_encrypted === '***' ? '••••••••' : 'Enter App Secret again'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#000' }}>
                Default Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Default Sender Name</Label>
                  <Input
                    value={formData.default_sender_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_sender_name: e.target.value }))}
                    placeholder="Your Business"
                  />
                </div>
                <div>
                  <Label>Default Country Code</Label>
                  <Input
                    value={formData.default_country_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_country_code: e.target.value }))}
                    placeholder="+91"
                  />
                </div>
                <div>
                  <Label>Template Language</Label>
                  <Input
                    value={formData.template_language}
                    onChange={(e) => setFormData(prev => ({ ...prev, template_language: e.target.value }))}
                    placeholder="en"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                style={{ background: '#FCA311', color: '#000' }}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                Save Configuration
              </Button>

              <Button
                onClick={handleVerify}
                disabled={verifying || !config?.phone_number_id}
                variant="outline"
              >
                {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Verify Connection
              </Button>

              <Button
                onClick={handleSyncTemplates}
                disabled={syncing || config?.connection_status !== 'connected'}
                variant="outline"
              >
                {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Templates
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: '#FCA311' }} />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => router.push('/dashboard/whatsapp/contacts')}
                variant="outline"
                className="justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Contacts
              </Button>
              <Button
                onClick={() => router.push('/dashboard/whatsapp/broadcasts')}
                variant="outline"
                className="justify-start"
              >
                <Radio className="w-4 h-4 mr-2" />
                Broadcast Center
              </Button>
              <Button
                onClick={() => router.push('/dashboard/whatsapp/templates')}
                variant="outline"
                className="justify-start"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Templates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
