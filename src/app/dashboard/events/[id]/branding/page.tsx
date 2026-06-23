'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EventBrandingData {
  banner_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  custom_css: string;
  custom_head_html: string;
}

interface EventBrandingPageProps {
  params: { id: string };
}

export default function EventBrandingPage({ params }: EventBrandingPageProps) {
  const eventId = params.id;
  const router = useRouter();

  const [branding, setBranding] = useState<EventBrandingData>({
    banner_url: null,
    logo_url: null,
    primary_color: null,
    secondary_color: null,
    accent_color: null,
    background_color: null,
    text_color: null,
    custom_css: '',
    custom_head_html: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBranding = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/branding`);
      const data = await response.json();
      if (data.data?.branding) {
        setBranding(data.data.branding);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load branding' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/events/${eventId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Branding saved successfully' });
        if (data.data?.branding) {
          setBranding(data.data.branding);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save branding' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save branding' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (type: 'banner' | 'logo', file: File) => {
    setUploading(type);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`/api/events/${eventId}/branding`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setBranding((prev) => ({
          ...prev,
          [type === 'banner' ? 'banner_url' : 'logo_url']: data.data.url,
        }));
        setMessage({ type: 'success', text: `${type} uploaded successfully` });
      } else {
        setMessage({ type: 'error', text: data.error || `Failed to upload ${type}` });
      }
    } catch {
      setMessage({ type: 'error', text: `Failed to upload ${type}` });
    } finally {
      setUploading(null);
    }
  };

  const handleResetColor = (field: string) => {
    setBranding((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
    <div className="max-w-4xl mx-auto p-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Branding</span>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Event Branding</h1>
      <p className="text-[#888888] mb-6">
        Customize the look and feel of this event. Overrides client branding.
      </p>

      {message && (
        <div
          className={`p-4 mb-6 rounded ${
            message.type === 'success'
              ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]'
              : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Images */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Images</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Banner */}
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
                Event Banner
              </label>
              {branding.banner_url && (
                <div className="mb-2">
                  <img
                    src={branding.banner_url}
                    alt="Event Banner"
                    className="h-32 object-cover rounded"
                  />
                </div>
              )}
              <label className="cursor-pointer bg-[rgba(252,163,17,0.08)] text-[#E5E5E5] px-3 py-1 rounded text-sm hover:bg-[rgba(252,163,17,0.15)]">
                {uploading === 'banner' ? 'Uploading...' : 'Upload Banner'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('banner', file);
                  }}
                  disabled={uploading !== null}
                />
              </label>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
                Event Logo
              </label>
              {branding.logo_url && (
                <div className="mb-2">
                  <img
                    src={branding.logo_url}
                    alt="Event Logo"
                    className="h-32 object-contain"
                  />
                </div>
              )}
              <label className="cursor-pointer bg-[rgba(252,163,17,0.08)] text-[#E5E5E5] px-3 py-1 rounded text-sm hover:bg-[rgba(252,163,17,0.15)]">
                {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('logo', file);
                  }}
                  disabled={uploading !== null}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Color Overrides */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Color Overrides</h2>
          <p className="text-sm text-[#888888] mb-4">
            Leave empty to use client branding colors.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'primary_color', label: 'Primary' },
              { key: 'secondary_color', label: 'Secondary' },
              { key: 'accent_color', label: 'Accent' },
              { key: 'background_color', label: 'Background' },
              { key: 'text_color', label: 'Text' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                  {label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={(branding as any)[key] || '#000000'}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="h-10 w-10 rounded border-[rgba(229,229,229,0.12)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(branding as any)[key] || ''}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        [key]: e.target.value || null,
                      }))
                    }
                    placeholder="Inherit"
                    className="flex-1 border-[rgba(229,229,229,0.12)] rounded px-2 py-1 text-sm font-mono"
                  />
                  {(branding as any)[key] && (
                    <button
                      onClick={() => handleResetColor(key)}
                      className="text-[#888888] hover:text-[#E5E5E5] text-sm"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Code */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Custom Code</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Custom CSS
              </label>
              <textarea
                value={branding.custom_css}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, custom_css: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2 font-mono text-sm"
                rows={6}
                placeholder="/* Add custom CSS here */"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Custom HTML (Head)
              </label>
              <textarea
                value={branding.custom_head_html}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    custom_head_html: e.target.value,
                  }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2 font-mono text-sm"
                rows={4}
                placeholder="<!-- Add tracking codes or meta tags -->"
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => fetchBranding()}
            className="border-[rgba(229,229,229,0.12)] px-4 py-2 rounded-md hover:bg-[rgba(229,229,229,0.05)]"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
