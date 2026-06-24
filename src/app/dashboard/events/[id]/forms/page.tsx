'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Form {
  id: string;
  name: string;
  is_active: boolean;
  is_multi_step: boolean;
  created_at: string;
  field_count?: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system: boolean;
}

interface FormsPageProps {
  params: { id: string };
}

export default function FormsPage({ params }: FormsPageProps) {
  const eventId = params.id;
  const router = useRouter();

  const [forms, setForms] = useState<Form[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/forms`);
      const data = await response.json();
      if (data.data?.forms) {
        setForms(data.data.forms);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load forms' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/form-templates');
      const data = await response.json();
      if (data.data?.templates) {
        setTemplates(data.data.templates);
      }
    } catch {
      console.error('Failed to load templates');
    }
  }, []);

  useEffect(() => {
    fetchForms();
    fetchTemplates();
  }, [fetchForms, fetchTemplates]);

  const handleCreateBlankForm = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Form' }),
      });

      const data = await response.json();

      if (response.ok && data.data?.form) {
        router.push(`/dashboard/events/${eventId}/forms/${data.data.form.id}`);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create form' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to create form' });
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/forms/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      });

      const data = await response.json();

      if (response.ok && data.data?.form_id) {
        router.push(`/dashboard/events/${eventId}/forms/${data.data.form_id}`);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create form' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to create form' });
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete "${formName}"?`)) return;

    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Form deleted successfully' });
        fetchForms();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete form' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete form' });
    }
  };

  const handleDuplicateForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Form duplicated successfully' });
        fetchForms();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to duplicate form' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to duplicate form' });
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
    <div className="max-w-6xl mx-auto p-6">
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ color: '#888888' }}>/</span>
        <Link href={`/dashboard/events/${eventId}/dashboard`} style={{ color: '#E5E5E5', textDecoration: 'none', fontSize: '0.85rem' }}>Event</Link>
        <span style={{ color: '#888888' }}>/</span>
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>Forms</span>
      </nav>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Registration Forms</h1>
          <p className="text-[#888888]">Build and manage registration forms for this event</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="bg-[rgba(229,229,229,0.08)] text-[#E5E5E5] px-4 py-2 rounded-md hover:bg-[rgba(229,229,229,0.12)]"
          >
            Use Template
          </button>
          <button
            onClick={handleCreateBlankForm}
            className="bg-[#FCA311] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#E09800]"
          >
            Create Blank Form
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 mb-6 rounded ${
            message.type === 'success'
              ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(229,229,229,0.12)] border-[rgba(16,185,129,0.2)]'
              : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(229,229,229,0.12)] border-[rgba(239,68,68,0.2)]'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Template Selection */}
      {showTemplates && (
        <div className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Choose a Template</h2>
          <div className="grid grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border-[rgba(229,229,229,0.12)] rounded-lg p-4 cursor-pointer hover:border-[#FCA311] hover:bg-[rgba(252,163,17,0.08)]"
                onClick={() => handleCreateFromTemplate(template.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      template.is_system
                        ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]'
                        : 'bg-[rgba(229,229,229,0.08)] text-white'
                    }`}
                  >
                    {template.category}
                  </span>
                  {template.is_system && (
                    <span className="text-xs text-[#888888]">System</span>
                  )}
                </div>
                <h3 className="font-medium">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-[#888888] mt-1">{template.description}</p>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowTemplates(false)}
            className="mt-4 text-sm text-[#E5E5E5] hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Forms List */}
      {forms.length === 0 ? (
        <div className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-12 text-center">
          <p className="text-[#888888] mb-4">No forms created yet</p>
          <button
            onClick={handleCreateBlankForm}
            className="bg-[#FCA311] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#E09800]"
          >
            Create Your First Form
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-[rgba(229,229,229,0.03)] rounded-lg border-[rgba(229,229,229,0.12)] p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{form.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        form.is_active
                          ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                          : 'bg-[rgba(229,229,229,0.08)] text-white'
                      }`}
                    >
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {form.is_multi_step && (
                      <span className="px-2 py-0.5 rounded text-xs bg-[rgba(59,130,246,0.15)] text-[#3b82f6]">
                        Multi-step
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#888888] mt-1">
                    Created {new Date(form.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    router.push(`/dashboard/events/${eventId}/forms/${form.id}`)
                  }
                  className="text-[#E5E5E5] hover:text-white text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicateForm(form.id)}
                  className="text-[#E5E5E5] hover:text-white text-sm"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteForm(form.id, form.name)}
                  className="text-[#ef4444] hover:text-white text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
