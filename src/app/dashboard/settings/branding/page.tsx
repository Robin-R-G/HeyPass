'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';

interface BrandingData {
  brand_name: string;
  tagline: string;
  logo_url: string | null;
  college_logo_url: string | null;
  favicon_url: string | null;
  default_banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  font_family: string;
  border_radius: number;
  white_label_enabled: boolean;
  footer_text: string;
  support_email: string;
  support_phone: string;
  social_links: Record<string, string>;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string;
  footer_company_name: string;
  footer_website_url: string;
  footer_copyright: string;
}

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingData>({
    brand_name: '',
    tagline: '',
    logo_url: null,
    college_logo_url: null,
    favicon_url: null,
    default_banner_url: null,
    primary_color: '#3B82F6',
    secondary_color: '#1D4ED8',
    accent_color: '#10B981',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    success_color: '#10B981',
    warning_color: '#F59E0B',
    error_color: '#EF4444',
    font_family: 'Inter, system-ui, sans-serif',
    border_radius: 8,
    white_label_enabled: false,
    footer_text: '',
    support_email: '',
    support_phone: '',
    social_links: {},
    email_from_name: '',
    email_from_address: '',
    email_reply_to: '',
    footer_company_name: '',
    footer_website_url: '',
    footer_copyright: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { toast } = useToast();

  const fetchBranding = useCallback(async () => {
    try {
      const response = await fetch('/api/branding');
      const data = await response.json();
      if (data.data?.branding) {
        setBranding(data.data.branding);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load branding' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/branding', {
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

  const handleFileUpload = async (type: string, file: File) => {
    setUploading(type);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = type === 'banner'
        ? '/api/branding/banner'
        : type === 'college-logo'
        ? '/api/branding/college-logo'
        : type === 'favicon'
        ? '/api/branding/favicon'
        : '/api/branding/logo';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const urlField = type === 'banner'
          ? 'default_banner_url'
          : type === 'college-logo'
          ? 'college_logo_url'
          : type === 'favicon'
          ? 'favicon_url'
          : 'logo_url';

        setBranding((prev) => ({
          ...prev,
          [urlField]: data.data[urlField],
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

  const executeDeleteAsset = async () => {
    const type = confirmDeleteAsset;
    if (!type) return;
    setConfirmDeleteAsset(null);

    setMessage(null);

    try {
      const endpoint = type === 'banner' ? '/api/branding/banner' : `/api/branding/${type}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        const urlField = type === 'banner'
          ? 'default_banner_url'
          : type === 'college-logo'
          ? 'college_logo_url'
          : type === 'favicon'
          ? 'favicon_url'
          : 'logo_url';

        setBranding((prev) => ({
          ...prev,
          [urlField]: null,
        }));
        setMessage({ type: 'success', text: `${type} deleted successfully` });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || `Failed to delete ${type}` });
      }
    } catch {
      setMessage({ type: 'error', text: `Failed to delete ${type}` });
    }
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
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '1rem 1.5rem', borderBottom: '1px solid rgba(229,229,229,0.08)',
      background: 'rgba(20,33,61,0.6)',
    }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
      <span style={{ color: '#888888' }}>/</span>
      <Link href="/dashboard" style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Events</Link>
      <span style={{ color: '#888888' }}>/</span>
      <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: 500 }}>Settings</span>
    </nav>
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Branding Settings</h1>

      {message && (
        <div className={'p-4 mb-6 rounded ' + (message.type === 'success' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]')}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Identity */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={branding.brand_name}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, brand_name: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
                placeholder="Your Brand Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={branding.tagline}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, tagline: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
                placeholder="Your tagline"
              />
            </div>
          </div>
        </section>

        {/* Logos */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Logos & Images</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Organization Logo */}
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
                Organization Logo
              </label>
              {branding.logo_url && (
                <div className="mb-2">
                  <img
                    src={branding.logo_url}
                    alt="Organization Logo"
                    className="h-20 object-contain"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <label className="cursor-pointer bg-[rgba(252,163,17,0.08)] text-[#E5E5E5] px-3 py-1 rounded text-sm hover:bg-[rgba(252,163,17,0.15)]">
                  {uploading === 'logo' ? 'Uploading...' : 'Upload'}
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
                {branding.logo_url && (
                  <button
                    onClick={() => setConfirmDeleteAsset('logo')}
                    className="text-[#ef4444] text-sm hover:text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* College Logo */}
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
                College Logo
              </label>
              {branding.college_logo_url && (
                <div className="mb-2">
                  <img
                    src={branding.college_logo_url}
                    alt="College Logo"
                    className="h-20 object-contain"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <label className="cursor-pointer bg-[rgba(252,163,17,0.08)] text-[#E5E5E5] px-3 py-1 rounded text-sm hover:bg-[rgba(252,163,17,0.15)]">
                  {uploading === 'college-logo' ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('college-logo', file);
                    }}
                    disabled={uploading !== null}
                  />
                </label>
                {branding.college_logo_url && (
                  <button
                    onClick={() => setConfirmDeleteAsset('college-logo')}
                    className="text-[#ef4444] text-sm hover:text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Favicon */}
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
                Favicon
              </label>
              {branding.favicon_url && (
                <div className="mb-2">
                  <img
                    src={branding.favicon_url}
                    alt="Favicon"
                    className="h-8 object-contain"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <label className="cursor-pointer bg-[rgba(252,163,17,0.08)] text-[#E5E5E5] px-3 py-1 rounded text-sm hover:bg-[rgba(252,163,17,0.15)]">
                  {uploading === 'favicon' ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/x-icon,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('favicon', file);
                    }}
                    disabled={uploading !== null}
                  />
                </label>
                {branding.favicon_url && (
                  <button
                    onClick={() => setConfirmDeleteAsset('favicon')}
                    className="text-[#ef4444] text-sm hover:text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Default Banner */}
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
                Default Banner
              </label>
              {branding.default_banner_url && (
                <div className="mb-2">
                  <img
                    src={branding.default_banner_url}
                    alt="Default Banner"
                    className="h-20 object-cover rounded"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <label className="cursor-pointer bg-[rgba(252,163,17,0.08)] text-[#E5E5E5] px-3 py-1 rounded text-sm hover:bg-[rgba(252,163,17,0.15)]">
                  {uploading === 'banner' ? 'Uploading...' : 'Upload'}
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
                {branding.default_banner_url && (
                  <button
                    onClick={() => setConfirmDeleteAsset('banner')}
                    className="text-[#ef4444] text-sm hover:text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Colors</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'primary_color', label: 'Primary' },
              { key: 'secondary_color', label: 'Secondary' },
              { key: 'accent_color', label: 'Accent' },
              { key: 'background_color', label: 'Background' },
              { key: 'text_color', label: 'Text' },
              { key: 'success_color', label: 'Success' },
              { key: 'warning_color', label: 'Warning' },
              { key: 'error_color', label: 'Error' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                  {label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={(branding as any)[key]}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="h-10 w-10 rounded border-[rgba(229,229,229,0.12)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(branding as any)[key]}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="flex-1 border-[rgba(229,229,229,0.12)] rounded px-2 py-1 text-sm font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography & Shape */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Typography & Shape</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Font Family
              </label>
              <input
                type="text"
                value={branding.font_family}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, font_family: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Border Radius (px)
              </label>
              <input
                type="number"
                min="0"
                max="24"
                value={branding.border_radius}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    border_radius: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.white_label_enabled}
                  onChange={(e) =>
                    setBranding((prev) => ({
                      ...prev,
                      white_label_enabled: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm text-[#E5E5E5]">White Label Mode</span>
              </label>
            </div>
          </div>
        </section>

        {/* Footer & Support */}
        <section className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6">
          <h2 className="text-lg font-semibold mb-4">Footer & Support</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Footer Company Name
              </label>
              <input
                type="text"
                value={branding.footer_company_name}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    footer_company_name: e.target.value,
                  }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Footer Website URL
              </label>
              <input
                type="url"
                value={branding.footer_website_url}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    footer_website_url: e.target.value,
                  }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Footer Copyright
              </label>
              <input
                type="text"
                value={branding.footer_copyright}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    footer_copyright: e.target.value,
                  }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Footer Text
              </label>
              <textarea
                value={branding.footer_text}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, footer_text: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={branding.support_email}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, support_email: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
                Support Phone
              </label>
              <input
                type="tel"
                value={branding.support_phone}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, support_phone: e.target.value }))
                }
                className="w-full border-[rgba(229,229,229,0.12)] rounded-md px-3 py-2"
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FCA311] text-black font-semibold px-6 py-2 rounded-md hover:bg-[#E09800] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteAsset !== null}
        title="Delete Asset"
        message={'Are you sure you want to delete the ' + confirmDeleteAsset + '? This action cannot be undone.'}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDeleteAsset}
        onCancel={() => setConfirmDeleteAsset(null)}
      />
    </div>
    </div>
  );
}
