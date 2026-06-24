'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface FormField {
  id: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  is_required: boolean;
  options: { items: Array<{ label: string; value: string }> } | null;
  validation: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
    min_value?: number;
    max_value?: number;
    allowed_types?: string[];
    max_size_mb?: number;
    max_files?: number;
  } | null;
  conditional_logic: {
    action: 'show' | 'hide';
    rules: Array<{
      field_id: string;
      operator: string;
      value: string;
    }>;
    logic: 'and' | 'or';
  } | null;
  conditional_required: {
    enabled: boolean;
    rules: Array<{
      field_id: string;
      operator: string;
      value: string;
    }>;
  } | null;
  default_value: string | null;
  help_text: string | null;
  section_id: string | null;
  sort_order: number;
}

interface FormSection {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface FormData {
  form: {
    id: string;
    name: string;
    is_multi_step: boolean;
    steps_config: unknown[];
  };
  fields: FormField[];
  sections: FormSection[];
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
}

interface PublicRegistrationPageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicRegistrationPage({ params }: PublicRegistrationPageProps) {
  const router = useRouter();
  const [eventSlug, setEventSlug] = useState<string>('');

  useEffect(() => {
    params.then(({ slug }) => setEventSlug(slug));
  }, [params]);

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ registration_id: string; ticket_number: string } | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string | File | string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const fetchForm = useCallback(async (slug: string) => {
    if (!slug) return;
    try {
      const response = await fetch(`/api/public/forms/${slug}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setFormData(data.data);

        // Initialize field values with defaults
        const initialValues: Record<string, string | File | string[]> = {};
        for (const field of data.data.fields) {
          if (field.default_value) {
            initialValues[field.id] = field.default_value;
          } else if (field.field_type === 'checkbox') {
            initialValues[field.id] = [];
          } else {
            initialValues[field.id] = '';
          }
        }
        setFieldValues(initialValues);
      } else {
        setError(data.error || 'Failed to load form');
      }
    } catch {
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    if (eventSlug) fetchForm(eventSlug);
  }, [eventSlug, fetchForm]);

  const evaluateCondition = (
    rules: Array<{ field_id: string; operator: string; value: string }>,
    logic: 'and' | 'or'
  ): boolean => {
    const results = rules.map((rule) => {
      const fieldValue = String(fieldValues[rule.field_id] || '');
      switch (rule.operator) {
        case 'equals': return fieldValue === rule.value;
        case 'not_equals': return fieldValue !== rule.value;
        case 'contains': return fieldValue.includes(rule.value);
        case 'not_contains': return !fieldValue.includes(rule.value);
        case 'is_empty': return fieldValue === '';
        case 'is_not_empty': return fieldValue !== '';
        default: return false;
      }
    });

    return logic === 'and' ? results.every(Boolean) : results.some(Boolean);
  };

  const shouldShowField = (field: FormField): boolean => {
    if (!field.conditional_logic) return true;
    const { action, rules, logic } = field.conditional_logic;
    const conditionMet = evaluateCondition(rules, logic);
    return action === 'show' ? conditionMet : !conditionMet;
  };

  const isFieldRequired = (field: FormField): boolean => {
    if (field.is_required) return true;
    if (field.conditional_required?.enabled) {
      return evaluateCondition(field.conditional_required.rules, 'and');
    }
    return false;
  };

  const validateField = (field: FormField, value: unknown): string | null => {
    const required = isFieldRequired(field);

    if (required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`;
    }

    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }

    const strValue = String(value);

    // Type validation
    switch (field.field_type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
          return 'Invalid email address';
        }
        break;
      case 'phone':
        if (!/^[+]?[\d\s\-()]{7,20}$/.test(strValue)) {
          return 'Invalid phone number';
        }
        break;
      case 'number':
        if (isNaN(Number(strValue))) {
          return 'Must be a number';
        }
        break;
    }

    // Custom validation
    if (field.validation) {
      const v = field.validation;
      if (v.min_length && strValue.length < v.min_length) {
        return `Minimum ${v.min_length} characters required`;
      }
      if (v.max_length && strValue.length > v.max_length) {
        return `Maximum ${v.max_length} characters allowed`;
      }
      if (v.pattern && !new RegExp(v.pattern).test(strValue)) {
        return 'Invalid format';
      }
      if (v.min_value !== undefined && Number(strValue) < v.min_value) {
        return `Minimum value is ${v.min_value}`;
      }
      if (v.max_value !== undefined && Number(strValue) > v.max_value) {
        return `Maximum value is ${v.max_value}`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!formData) return;

    // Validate all visible fields
    const errors: Record<string, string> = {};
    for (const field of formData.fields) {
      if (shouldShowField(field)) {
        const error = validateField(field, fieldValues[field.id]);
        if (error) {
          errors[field.id] = error;
        }
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Extract standard fields
      const standardFields: Record<string, string> = {};
      const customFields: Record<string, unknown> = {};

      for (const field of formData.fields) {
        const value = fieldValues[field.id];
        if (value === undefined || value === '') continue;

        switch (field.label.toLowerCase()) {
          case 'email':
            standardFields.email = String(value);
            break;
          case 'first name':
            standardFields.first_name = String(value);
            break;
          case 'last name':
            standardFields.last_name = String(value);
            break;
          case 'phone':
            standardFields.phone = String(value);
            break;
          case 'company':
            standardFields.company = String(value);
            break;
          case 'job title':
            standardFields.job_title = String(value);
            break;
          default:
            customFields[field.id] = value;
        }
      }

      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formData.form.id,
          ...standardFields,
          custom_fields: customFields,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.data);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Registration Unavailable</h1>
          <p className="text-[#E5E5E5]">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="max-w-md w-full bg-[rgba(229,229,229,0.03)] rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-[rgba(16,185,129,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Registration Successful!</h1>
          <p className="text-[#E5E5E5] mb-4">Thank you for registering.</p>
          <div className="bg-transparent rounded p-4 mb-4">
            <p className="text-sm text-[#E5E5E5]">Your ticket number:</p>
            <p className="text-lg font-mono font-bold">{success.ticket_number}</p>
          </div>
          <p className="text-sm text-[#888888]">
            A confirmation email has been sent to your email address.
          </p>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  const { form, fields, sections, event } = formData;
  const visibleFields = fields.filter(shouldShowField);

  // Group fields by section
  const sectionGroups = sections.map((section) => ({
    ...section,
    fields: visibleFields.filter((f) => f.section_id === section.id),
  }));

  const unsectionedFields = visibleFields.filter(
    (f) => !f.section_id || !sections.some((s) => s.id === f.section_id)
  );

  // Multi-step support
  const steps = form.is_multi_step
    ? (form.steps_config as Array<{ title: string }>) || [{ title: 'Registration' }]
    : [{ title: 'Registration' }];

  const fieldsPerStep = form.is_multi_step
    ? Math.ceil(visibleFields.length / steps.length)
    : visibleFields.length;

  const currentStepFields = form.is_multi_step
    ? visibleFields.slice(currentStep * fieldsPerStep, (currentStep + 1) * fieldsPerStep)
    : visibleFields;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#fff', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }} className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{event.name}</h1>
          <p className="text-[#E5E5E5]">
            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
          </p>
        </div>

        {/* Progress Bar (Multi-step) */}
        {form.is_multi_step && steps.length > 1 && (
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`text-sm ${
                    index <= currentStep ? 'text-[#E5E5E5] font-medium' : 'text-[#888888]'
                  }`}
                >
                  {step.title || `Step ${index + 1}`}
                </div>
              ))}
            </div>
            <div className="h-2 bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-[rgba(229,229,229,0.03)] rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] rounded p-4 mb-6">
              {error}
            </div>
          )}

          {/* Sections */}
          {sectionGroups.map((section) => (
            <div key={section.id} className="mb-8">
              {section.title && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                  {section.description && (
                    <p className="text-sm text-[#E5E5E5] mt-1">{section.description}</p>
                  )}
                </div>
              )}
              <div className="space-y-4">
                {section.fields.map((field) => renderField(field))}
              </div>
            </div>
          ))}

          {/* Unsectioned Fields */}
          {unsectionedFields.length > 0 && (
            <div className="space-y-4">
              {unsectionedFields.map((field) => renderField(field))}
            </div>
          )}

          {/* Navigation / Submit */}
          <div className="flex justify-between mt-8">
            {form.is_multi_step && currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-2 border border-[rgba(229,229,229,0.12)] rounded-md text-[#E5E5E5] hover:bg-transparent"
              >
                Back
              </button>
            )}
            <div className="ml-auto">
              {form.is_multi_step && currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function renderField(field: FormField) {
    const value = fieldValues[field.id];
    const error = fieldErrors[field.id];

    switch (field.field_type) {
      case 'heading':
        return (
          <div key={field.id} className="pt-4">
            <h3 className="text-lg font-medium text-white">{field.label}</h3>
          </div>
        );
      case 'paragraph':
        return (
          <div key={field.id} className="pt-2">
            <p className="text-[#E5E5E5]">{field.label}</p>
          </div>
        );
      case 'divider':
        return <hr key={field.id} className="my-4 border-[rgba(229,229,229,0.08)]" />;
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <input
              type={field.field_type === 'number' ? 'number' : 'text'}
              value={String(value || '')}
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                if (fieldErrors[field.id]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              placeholder={field.placeholder || ''}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            />
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'textarea':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <textarea
              value={String(value || '')}
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                if (fieldErrors[field.id]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              placeholder={field.placeholder || ''}
              rows={4}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            />
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'select':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <select
              value={String(value || '')}
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                if (fieldErrors[field.id]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options?.items?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'radio':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.items?.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.id}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={(e) => {
                      setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                      if (fieldErrors[field.id]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next[field.id];
                          return next;
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-2">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.items?.map((opt) => {
                const checked = Array.isArray(value) && value.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = Array.isArray(value) ? [...value] : [];
                        if (e.target.checked) {
                          current.push(opt.value);
                        } else {
                          const idx = current.indexOf(opt.value);
                          if (idx > -1) current.splice(idx, 1);
                        }
                        setFieldValues((prev) => ({ ...prev, [field.id]: current }));
                        if (fieldErrors[field.id]) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next[field.id];
                            return next;
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'date':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <input
              type="date"
              value={String(value || '')}
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                if (fieldErrors[field.id]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            />
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'file':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFieldValues((prev) => ({ ...prev, [field.id]: file }));
                }
              }}
              accept={field.validation?.allowed_types?.map((t) => `.${t}`).join(',')}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            />
            {field.validation?.max_size_mb && (
              <p className="text-sm text-[#888888] mt-1">
                Max size: {field.validation.max_size_mb}MB
              </p>
            )}
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'country':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <select
              value={String(value || '')}
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                if (fieldErrors[field.id]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            >
              <option value="">Select Country...</option>
              <option value="US">United States</option>
              <option value="IN">India</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="BR">Brazil</option>
              <option value="OTHER">Other</option>
            </select>
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      case 'state':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-[#E5E5E5] mb-1">
              {field.label}
              {isFieldRequired(field) && <span className="text-[#ef4444] ml-1">*</span>}
            </label>
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => {
                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                if (fieldErrors[field.id]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }
              }}
              placeholder={field.placeholder || 'Enter state/province'}
              className={`w-full border rounded-md px-3 py-2 ${
                error ? 'border-red-500' : 'border-[rgba(229,229,229,0.12)]'
              }`}
            />
            {field.help_text && (
              <p className="text-sm text-[#888888] mt-1">{field.help_text}</p>
            )}
            {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
          </div>
        );
      default:
        return null;
    }
  }
}
