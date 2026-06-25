'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FormField {
  id: string;
  field_name: string;
  field_type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  sort_order: number;
}

interface Form {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  is_template: boolean;
  fields: FormField[];
  registrations_count: number;
}

export default function FormEditorPage({ params }: { params: Promise<{ id: string; formId: string }> }) {
  const { id: eventId, formId } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newField, setNewField] = useState({
    field_name: '', field_type: 'text', label: '', placeholder: '', required: false, options: '',
  });

  useEffect(() => {
    fetch(`/api/events/${eventId}/forms/${formId}`)
      .then(r => r.json())
      .then(data => {
        setForm(data.form || data);
        setFields(data.form?.fields || data.fields || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId, formId]);

  const addField = async () => {
    const field = {
      field_name: newField.field_name || newField.label.toLowerCase().replace(/\s+/g, '_'),
      field_type: newField.field_type,
      label: newField.label,
      placeholder: newField.placeholder,
      required: newField.required,
      options: newField.field_type === 'select' || newField.field_type === 'checkbox_group'
        ? newField.options.split(',').map(o => o.trim()).filter(Boolean)
        : undefined,
      sort_order: fields.length,
    };

    try {
      const res = await fetch(`/api/events/${eventId}/forms/${formId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field),
      });
      const data = await res.json();
      if (data.field) {
        setFields([...fields, { ...data.field, id: data.field.id || crypto.randomUUID() }]);
      }
      setAddFieldOpen(false);
      setNewField({ field_name: '', field_type: 'text', label: '', placeholder: '', required: false, options: '' });
    } catch (err) {
      console.error('Failed to add field:', err);
      setAddFieldOpen(false);
    }
  };

  const removeField = async (fieldId: string) => {
    try {
      await fetch(`/api/events/${eventId}/forms/${formId}/fields/${fieldId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to remove field:', err);
    }
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const updateForm = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form?.title, description: form?.description, is_active: form?.is_active }),
      });
      if (!res.ok) {
        console.error('Failed to save form');
      }
    } catch (err) {
      console.error('Failed to save form:', err);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#E5E5E5' }}>Loading form...</div>;
  if (!form) return <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444' }}>Form not found</div>;

  return (
    <div className="min-h-screen bg-transparent text-white font-sans antialiased relative">
      <nav className="hp-nav flex justify-between items-center px-8 h-16">
        <div className="flex items-center gap-2 text-xs text-hp-text-secondary/60">
          <button onClick={() => router.back()} className="bg-transparent border-none text-hp-text-secondary hover:text-white cursor-pointer text-[11px] transition-all duration-150">← Back</button>
          <span>/</span>
          <Link href={`/dashboard/events/${eventId}/forms`} className="text-hp-text-secondary hover:text-white no-underline transition-all duration-150">Forms</Link>
          <span>/</span>
          <span className="text-white font-medium">{form.title}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={updateForm} disabled={saving} className={`hp-btn hp-btn-primary text-xs font-semibold rounded-lg px-4 py-2 ${saving ? 'opacity-60 wait' : 'cursor-pointer'}`}>{saving ? 'Saving...' : 'Save Form'}</button>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            style={{ fontSize: '1.3rem', fontWeight: 700, background: 'transparent', border: 'none', color: '#fff', padding: '0.5rem 0' }}
            placeholder="Form title"
          />
          <Input
            value={form.description || ''}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ color: '#E5E5E5', background: 'transparent', border: 'none', padding: '0.25rem 0' }}
            placeholder="Form description (optional)"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Fields ({fields.length})</h2>
          <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
            <DialogTrigger asChild>
              <button style={{
                background: 'rgba(229,229,229,0.08)', border: '1px solid rgba(229,229,229,0.15)',
                color: '#E5E5E5', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 500,
              }}>+ Add Field</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle style={{ color: '#fff' }}>Add Field</DialogTitle></DialogHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <Label style={{ color: '#E5E5E5' }}>Label</Label>
                  <Input value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} placeholder="e.g. Full Name" style={{ background: 'rgba(229,229,229,0.05)', borderColor: 'rgba(229,229,229,0.15)', color: '#fff' }} />
                </div>
                <div>
                  <Label style={{ color: '#E5E5E5' }}>Type</Label>
                  <Select value={newField.field_type} onValueChange={v => setNewField({ ...newField, field_type: v })}>
                    <SelectTrigger style={{ background: 'rgba(229,229,229,0.05)', borderColor: 'rgba(229,229,229,0.15)', color: '#fff' }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: '#1a2a4a', border: '1px solid rgba(229,229,229,0.15)' }}>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="radio">Radio</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="file">File Upload</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newField.field_type === 'select' || newField.field_type === 'checkbox_group') && (
                  <div>
                    <Label style={{ color: '#E5E5E5' }}>Options (comma-separated)</Label>
                    <Input value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })} placeholder="Option 1, Option 2, Option 3" style={{ background: 'rgba(229,229,229,0.05)', borderColor: 'rgba(229,229,229,0.15)', color: '#fff' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Label style={{ color: '#E5E5E5' }}>Required</Label>
                  <button
                    onClick={() => setNewField({ ...newField, required: !newField.required })}
                    style={{
                      width: '40px', height: '22px', borderRadius: '11px', border: 'none',
                      background: newField.required ? '#FCA311' : '#E09800',
                      cursor: 'pointer', position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: '2px', left: newField.required ? '20px' : '2px',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
                <button onClick={addField} disabled={!newField.label} style={{
                  background: 'linear-gradient(135deg, #FCA311, #E09800)', color: '#000',
                  padding: '0.6rem', borderRadius: '8px', border: 'none', fontWeight: 600,
                  fontSize: '0.85rem', cursor: 'pointer', opacity: !newField.label ? 0.5 : 1,
                }}>Add Field</button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {fields.length === 0 ? (
          <div style={{
            background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)',
            borderRadius: '12px', padding: '3rem', textAlign: 'center',
          }}>
            <p style={{ color: '#E5E5E5', marginBottom: '1rem' }}>No fields yet. Add your first field to start building the form.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...fields].sort((a, b) => a.sort_order - b.sort_order).map((field, idx) => (
              <div key={field.id} style={{
                background: 'rgba(229,229,229,0.03)', border: '1px solid rgba(229,229,229,0.08)',
                borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <span style={{ color: '#888888', fontSize: '0.75rem', minWidth: '20px' }}>{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#fff' }}>{field.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#E5E5E5' }}>
                    {field.field_type} {field.required && '· required'}
                  </div>
                </div>
                <button onClick={() => removeField(field.id)} style={{
                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                  fontSize: '0.75rem', padding: '0.3rem 0.5rem', borderRadius: '4px',
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
