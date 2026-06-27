'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, RefreshCw, Loader2, CheckCircle2, 
  XCircle, Clock, Eye, EyeOff
} from 'lucide-react';

interface Template {
  id: string;
  meta_template_id?: string;
  name: string;
  category: string;
  language: string;
  status: string;
  header_type?: string;
  body_text: string;
  footer_text?: string;
  buttons: any[];
  variables: string[];
  last_synced_at?: string;
}

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/whatsapp/templates', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSyncResult({
          success: true,
          message: `Successfully synced ${data.data?.length || 0} templates`,
        });
        fetchTemplates();
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Failed to sync templates',
        });
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: 'Failed to sync templates',
      });
    } finally {
      setSyncing(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      case 'disabled': return '#6B7280';
      default: return '#E5E5E5';
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'marketing': return '📢';
      case 'utility': return '🔧';
      case 'authentication': return '🔐';
      default: return '📝';
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#000' }}>Message Templates</h1>
            <p className="text-sm" style={{ color: '#666' }}>
              Manage your WhatsApp Business message templates
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing} style={{ background: 'var(--hp-primary)', color: '#000' }}>
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : 'Sync from Meta'}
          </Button>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <Card style={{ borderColor: syncResult.success ? '#10B981' : '#EF4444' }}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {syncResult.success ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
                ) : (
                  <XCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
                )}
                <span style={{ color: syncResult.success ? '#10B981' : '#EF4444' }}>
                  {syncResult.message}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--hp-primary)' }} />
              <div className="text-sm" style={{ color: '#666' }}>
                <p className="font-medium" style={{ color: '#000' }}>About Templates</p>
                <p className="mt-1">
                  WhatsApp Business templates must be approved by Meta before they can be used for messaging.
                  Templates with <Badge style={{ background: '#10B981', color: 'white' }} className="text-xs">approved</Badge> status
                  can be used for broadcasts and notifications.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hp-primary)' }} />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#E5E5E5' }} />
              <p style={{ color: '#666' }}>No templates found</p>
              <p className="text-sm mt-1" style={{ color: '#999' }}>
                Click "Sync from Meta" to fetch your approved templates
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(template.category)}</span>
                      <div>
                        <h3 className="font-semibold text-sm" style={{ color: '#000' }}>{template.name}</h3>
                        <p className="text-xs" style={{ color: '#666' }}>{template.category} • {template.language}</p>
                      </div>
                    </div>
                    <Badge style={{ background: getStatusColor(template.status), color: 'white' }} className="text-xs">
                      {template.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {template.header_type && (
                      <div className="text-xs">
                        <span style={{ color: '#666' }}>Header: </span>
                        <span style={{ color: '#000' }}>{template.header_type}</span>
                      </div>
                    )}
                    <div className="text-xs line-clamp-3" style={{ color: '#333' }}>
                      {template.body_text}
                    </div>
                    {template.footer_text && (
                      <div className="text-xs" style={{ color: '#666' }}>
                        {template.footer_text}
                      </div>
                    )}
                  </div>

                  {template.variables.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs mb-1" style={{ color: '#666' }}>Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((v) => (
                          <Badge key={v} style={{ background: '#E5E5E5', color: '#000' }} className="text-xs">
                            {'{{' + v + '}}'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {template.buttons.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs mb-1" style={{ color: '#666' }}>Buttons:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.buttons.map((btn, i) => (
                          <Badge key={i} style={{ background: 'var(--hp-primary)', color: '#000' }} className="text-xs">
                            {btn.text}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreview(template)}
                    className="w-full"
                  >
                    <Eye className="w-3 h-3 mr-2" /> Preview
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {preview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md" style={{ maxHeight: '90vh', overflow: 'auto' }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Template Preview</span>
                  <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Mockup */}
                <div className="mx-auto max-w-[300px] rounded-2xl overflow-hidden shadow-lg" style={{ background: '#ECE5DD' }}>
                  {/* Chat Bubble */}
                  <div className="m-2 p-3 rounded-lg" style={{ background: '#DCF8C6' }}>
                    {preview.header_type && (
                      <div className="mb-2 text-sm" style={{ color: '#333' }}>
                        [{preview.header_type}]
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap" style={{ color: '#303030' }}>
                      {preview.body_text.replace(/\{\{(\d+)\}\}/g, (_, n) => `{{${n}}}`)}
                    </div>
                    {preview.footer_text && (
                      <div className="mt-2 text-xs" style={{ color: '#666' }}>
                        {preview.footer_text}
                      </div>
                    )}
                    {preview.buttons.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        {preview.buttons.map((btn, i) => (
                          <div key={i} className="text-center text-xs font-medium py-1" style={{ color: '#075E54' }}>
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: '#666' }}>Name:</span>
                    <span style={{ color: '#000' }}>{preview.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#666' }}>Category:</span>
                    <span style={{ color: '#000' }}>{preview.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#666' }}>Language:</span>
                    <span style={{ color: '#000' }}>{preview.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#666' }}>Status:</span>
                    <Badge style={{ background: getStatusColor(preview.status), color: 'white' }}>
                      {preview.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
