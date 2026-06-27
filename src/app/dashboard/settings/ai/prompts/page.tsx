'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { Loader2, Plus, Edit3, Trash2, Copy, X } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  template: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
}

const CATEGORIES = [
  { value: 'event', label: 'Event' },
  { value: 'communication', label: 'Communication' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'general', label: 'General' },
];

export default function AIPromptsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', category: 'event', description: '', template: '', variables: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/ai/prompts');
      const data = await res.json();
      setTemplates(data.data || []);
    } catch {
      toast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openEditor(template?: PromptTemplate) {
    if (template) {
      setEditing(template);
      setForm({
        name: template.name,
        slug: template.slug,
        category: template.category,
        description: template.description || '',
        template: template.template,
        variables: template.variables.join(', '),
      });
    } else {
      setEditing(null);
      setForm({ name: '', slug: '', category: 'event', description: '', template: '', variables: '' });
    }
    setShowEditor(true);
  }

  function extractVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  }

  async function handleSave() {
    if (!form.name || !form.template) {
      toast('Name and template are required', 'error');
      return;
    }

    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const variables = form.variables ? form.variables.split(',').map(v => v.trim()).filter(Boolean) : extractVariables(form.template);

    setSaving(true);
    try {
      const url = editing ? `/api/ai/prompts/${editing.id}` : '/api/ai/prompts';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug, variables }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || 'Failed to save', 'error');
        return;
      }

      toast(editing ? 'Template updated' : 'Template created', 'success');
      setShowEditor(false);
      fetchTemplates();
    } catch {
      toast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await fetch(`/api/ai/prompts/${confirmDelete}`, { method: 'DELETE' });
      toast('Template deleted', 'success');
      setConfirmDelete(null);
      fetchTemplates();
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  function copyTemplate(template: string) {
    navigator.clipboard.writeText(template);
    toast('Template copied to clipboard', 'success');
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="text-[var(--hp-primary)] animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Prompt Templates</h2>
          <p className="text-sm text-[#888]">Manage reusable AI prompt templates for your organization.</p>
        </div>
        <button onClick={() => openEditor()} className="hp-btn hp-btn-primary flex items-center gap-2">
          <Plus size={14} /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="hp-glass-card p-8 text-center text-[#666]">No templates found</div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="hp-glass-card p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{t.name}</span>
                  {t.is_default && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--hp-primary)]/10 text-[var(--hp-primary)]">System</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#888]">{t.category}</span>
                </div>
                {t.description && <p className="text-xs text-[#888] mb-2">{t.description}</p>}
                <div className="text-xs text-[#666] font-mono bg-white/[0.02] rounded p-2 max-h-16 overflow-hidden">
                  {t.template.substring(0, 150)}...
                </div>
                {t.variables.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.variables.map(v => (
                      <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[#888] font-mono">{'{{'}}{v}{{'}}'}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => copyTemplate(t.template)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#666] hover:text-white transition-colors" title="Copy">
                  <Copy size={14} />
                </button>
                <button onClick={() => openEditor(t)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#666] hover:text-white transition-colors" title="Edit">
                  <Edit3 size={14} />
                </button>
                {!t.is_default && (
                  <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#666] hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Dialog */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111827] border border-white/[0.08] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setShowEditor(false)} className="text-[#666] hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--hp-primary)]">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug</label>
                <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Template</label>
                <textarea value={form.template} onChange={e => setForm({ ...form, template: e.target.value })} rows={10} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white font-mono placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)] resize-none" />
                <p className="text-xs text-[#666] mt-1">Use {'{{variable_name}}'} for dynamic values</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Variables (comma-separated)</label>
                <input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder="title, date, audience" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:border-[var(--hp-primary)]" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEditor(false)} className="hp-btn hp-btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="hp-btn hp-btn-primary flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Template"
        message="This custom template will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
