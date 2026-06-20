import { supabaseAdmin } from '@/lib/supabase/client';
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache';
import { createAuditLog } from '@/lib/audit';

const FORM_CACHE_TTL = 300; // 5 minutes

// ============================================================
// TYPES
// ============================================================

export type FieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'textarea'
  | 'select' | 'checkbox' | 'radio' | 'date' | 'file'
  | 'country' | 'state' | 'heading' | 'paragraph' | 'divider';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldValidation {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min_value?: number;
  max_value?: number;
  allowed_types?: string[];
  max_size_mb?: number;
  max_files?: number;
  custom_message?: string;
}

export interface ConditionalLogic {
  action: 'show' | 'hide';
  rules: Array<{
    field_id: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';
    value: string;
  }>;
  logic: 'and' | 'or';
}

export interface ConditionalRequired {
  enabled: boolean;
  rules: Array<{
    field_id: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: string;
  }>;
}

export interface FormField {
  id: string;
  form_id: string;
  section_id: string | null;
  label: string;
  field_type: FieldType;
  placeholder: string | null;
  is_required: boolean;
  is_unique: boolean;
  is_readonly: boolean;
  sort_order: number;
  options: { items: FormFieldOption[] } | null;
  validation: FormFieldValidation | null;
  conditional_logic: ConditionalLogic | null;
  conditional_required: ConditionalRequired | null;
  default_value: string | null;
  help_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSection {
  id: string;
  form_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_collapsible: boolean;
  is_collapsed_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegistrationForm {
  id: string;
  event_id: string;
  client_id: string;
  name: string;
  is_active: boolean;
  is_multi_step: boolean;
  steps_config: unknown[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FormWithFields extends RegistrationForm {
  fields: FormField[];
  sections: FormSection[];
}

// ============================================================
// VALIDATION
// ============================================================

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'email', 'phone', 'number', 'textarea',
  'select', 'checkbox', 'radio', 'date', 'file',
  'country', 'state', 'heading', 'paragraph', 'divider',
];

function validateFieldType(type: string): type is FieldType {
  return VALID_FIELD_TYPES.includes(type as FieldType);
}

function validateFieldInput(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (data.field_type && !validateFieldType(data.field_type as string)) {
    return { valid: false, error: `Invalid field type: ${data.field_type}` };
  }

  if (data.label !== undefined) {
    const label = data.label as string;
    if (!label || label.trim().length === 0) {
      return { valid: false, error: 'Label is required' };
    }
    if (label.length > 255) {
      return { valid: false, error: 'Label is too long (max 255 characters)' };
    }
  }

  if (data.options) {
    const options = data.options as { items?: FormFieldOption[] };
    if (options.items && Array.isArray(options.items)) {
      for (const opt of options.items) {
        if (!opt.label || !opt.value) {
          return { valid: false, error: 'Option label and value are required' };
        }
      }
    }
  }

  if (data.validation) {
    const v = data.validation as FormFieldValidation;
    if (v.min_length !== undefined && v.max_length !== undefined) {
      if (v.min_length > v.max_length) {
        return { valid: false, error: 'min_length cannot exceed max_length' };
      }
    }
    if (v.max_size_mb !== undefined && v.max_size_mb > 50) {
      return { valid: false, error: 'max_size_mb cannot exceed 50' };
    }
    if (v.max_files !== undefined && v.max_files > 10) {
      return { valid: false, error: 'max_files cannot exceed 10' };
    }
  }

  if (data.help_text && (data.help_text as string).length > 500) {
    return { valid: false, error: 'help_text is too long (max 500 characters)' };
  }

  if (data.default_value && (data.default_value as string).length > 1000) {
    return { valid: false, error: 'default_value is too long' };
  }

  return { valid: true };
}

// ============================================================
// FORM CRUD
// ============================================================

export async function listForms(eventId: string, clientId: string): Promise<RegistrationForm[]> {
  const { data, error } = await supabaseAdmin
    .from('registration_forms')
    .select('*')
    .eq('event_id', eventId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getForm(formId: string, clientId: string): Promise<FormWithFields | null> {
  const cacheKey = `form:${formId}`;
  const cached = await cacheGet<FormWithFields>(cacheKey);
  if (cached) return cached;

  const { data: form, error: formError } = await supabaseAdmin
    .from('registration_forms')
    .select('*')
    .eq('id', formId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .single();

  if (formError || !form) return null;

  const { data: fields } = await supabaseAdmin
    .from('form_fields')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order');

  const { data: sections } = await supabaseAdmin
    .from('form_sections')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order');

  const result: FormWithFields = {
    ...form,
    fields: fields || [],
    sections: sections || [],
  };

  await cacheSet(cacheKey, result, FORM_CACHE_TTL);
  return result;
}

export async function createForm(
  eventId: string,
  clientId: string,
  userId: string,
  input: { name?: string; is_active?: boolean; is_multi_step?: boolean }
): Promise<RegistrationForm> {
  const { data, error } = await supabaseAdmin
    .from('registration_forms')
    .insert({
      event_id: eventId,
      client_id: clientId,
      name: input.name || 'Untitled Form',
      is_active: input.is_active ?? true,
      is_multi_step: input.is_multi_step ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'registration_form',
    resource_id: data.id,
    new_value: { event_id: eventId, name: data.name },
  });

  return data;
}

export async function updateForm(
  formId: string,
  clientId: string,
  userId: string,
  input: Partial<Pick<RegistrationForm, 'name' | 'is_active' | 'is_multi_step' | 'steps_config'>>
): Promise<RegistrationForm> {
  const { data, error } = await supabaseAdmin
    .from('registration_forms')
    .update(input)
    .eq('id', formId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;

  await cacheDelete(`form:${formId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'registration_form',
    resource_id: formId,
    new_value: { updated_fields: Object.keys(input) },
  });

  return data;
}

export async function deleteForm(
  formId: string,
  clientId: string,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('registration_forms')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', formId)
    .eq('client_id', clientId);

  if (error) throw error;

  await cacheDelete(`form:${formId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.delete',
    resource_type: 'registration_form',
    resource_id: formId,
  });
}

export async function duplicateForm(
  formId: string,
  clientId: string,
  userId: string,
  targetEventId?: string
): Promise<RegistrationForm> {
  const form = await getForm(formId, clientId);
  if (!form) throw new Error('Form not found');

  // Create new form
  const newForm = await createForm(
    targetEventId || form.event_id,
    clientId,
    userId,
    { name: `${form.name} (Copy)`, is_active: false }
  );

  // Copy sections
  for (const section of form.sections) {
    await supabaseAdmin
      .from('form_sections')
      .insert({
        form_id: newForm.id,
        title: section.title,
        description: section.description,
        sort_order: section.sort_order,
        is_collapsible: section.is_collapsible,
        is_collapsed_default: section.is_collapsed_default,
      });
  }

  // Get new sections to map old IDs to new IDs
  const { data: newSections } = await supabaseAdmin
    .from('form_sections')
    .select('id, title')
    .eq('form_id', newForm.id);

  const sectionMap = new Map<string, string>();
  if (newSections) {
    for (let i = 0; i < form.sections.length; i++) {
      sectionMap.set(form.sections[i].id, newSections[i]?.id || '');
    }
  }

  // Copy fields
  for (const field of form.fields) {
    await supabaseAdmin
      .from('form_fields')
      .insert({
        form_id: newForm.id,
        section_id: field.section_id ? sectionMap.get(field.section_id) || null : null,
        label: field.label,
        field_type: field.field_type,
        placeholder: field.placeholder,
        is_required: field.is_required,
        is_unique: field.is_unique,
        is_readonly: field.is_readonly,
        sort_order: field.sort_order,
        options: field.options,
        validation: field.validation,
        conditional_logic: field.conditional_logic,
        conditional_required: field.conditional_required,
        default_value: field.default_value,
        help_text: field.help_text,
      });
  }

  return newForm;
}

// ============================================================
// FIELD CRUD
// ============================================================

export async function addField(
  formId: string,
  clientId: string,
  userId: string,
  input: Partial<Omit<FormField, 'id' | 'form_id' | 'created_at' | 'updated_at'>>
): Promise<FormField> {
  const validation = validateFieldInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get next sort order
  const { data: existingFields } = await supabaseAdmin
    .from('form_fields')
    .select('sort_order')
    .eq('form_id', formId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingFields && existingFields.length > 0
    ? (existingFields[0].sort_order || 0) + 1
    : 0;

  const { data, error } = await supabaseAdmin
    .from('form_fields')
    .insert({
      form_id: formId,
      section_id: input.section_id || null,
      label: input.label || 'Untitled Field',
      field_type: input.field_type || 'text',
      placeholder: input.placeholder || null,
      is_required: input.is_required ?? false,
      is_unique: input.is_unique ?? false,
      is_readonly: input.is_readonly ?? false,
      sort_order: input.sort_order ?? nextSortOrder,
      options: input.options || null,
      validation: input.validation || null,
      conditional_logic: input.conditional_logic || null,
      conditional_required: input.conditional_required || null,
      default_value: input.default_value || null,
      help_text: input.help_text || null,
    })
    .select()
    .single();

  if (error) throw error;

  await cacheDelete(`form:${formId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'form_field',
    resource_id: data.id,
    new_value: { form_id: formId, label: data.label, field_type: data.field_type },
  });

  return data;
}

export async function updateField(
  fieldId: string,
  clientId: string,
  userId: string,
  input: Partial<Omit<FormField, 'id' | 'form_id' | 'created_at' | 'updated_at'>>
): Promise<FormField> {
  const validation = validateFieldInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get field to find form_id
  const { data: existing } = await supabaseAdmin
    .from('form_fields')
    .select('form_id')
    .eq('id', fieldId)
    .single();

  if (!existing) throw new Error('Field not found');

  const { data, error } = await supabaseAdmin
    .from('form_fields')
    .update(input)
    .eq('id', fieldId)
    .select()
    .single();

  if (error) throw error;

  await cacheDelete(`form:${existing.form_id}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'form_field',
    resource_id: fieldId,
    new_value: { updated_fields: Object.keys(input) },
  });

  return data;
}

export async function deleteField(
  fieldId: string,
  clientId: string,
  userId: string
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('form_fields')
    .select('form_id')
    .eq('id', fieldId)
    .single();

  if (!existing) throw new Error('Field not found');

  const { error } = await supabaseAdmin
    .from('form_fields')
    .delete()
    .eq('id', fieldId);

  if (error) throw error;

  await cacheDelete(`form:${existing.form_id}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.delete',
    resource_type: 'form_field',
    resource_id: fieldId,
  });
}

export async function reorderFields(
  formId: string,
  clientId: string,
  userId: string,
  fieldOrders: Array<{ id: string; sort_order: number; section_id?: string | null }>
): Promise<void> {
  for (const item of fieldOrders) {
    await supabaseAdmin
      .from('form_fields')
      .update({
        sort_order: item.sort_order,
        section_id: item.section_id !== undefined ? item.section_id : undefined,
      })
      .eq('id', item.id)
      .eq('form_id', formId);
  }

  await cacheDelete(`form:${formId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'form_field',
    new_value: { action: 'reorder', form_id: formId, count: fieldOrders.length },
  });
}

// ============================================================
// SECTION CRUD
// ============================================================

export async function addSection(
  formId: string,
  clientId: string,
  userId: string,
  input: { title?: string; description?: string; sort_order?: number }
): Promise<FormSection> {
  const { data: existingSections } = await supabaseAdmin
    .from('form_sections')
    .select('sort_order')
    .eq('form_id', formId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingSections && existingSections.length > 0
    ? (existingSections[0].sort_order || 0) + 1
    : 0;

  const { data, error } = await supabaseAdmin
    .from('form_sections')
    .insert({
      form_id: formId,
      title: input.title || 'New Section',
      description: input.description || null,
      sort_order: input.sort_order ?? nextSortOrder,
    })
    .select()
    .single();

  if (error) throw error;

  await cacheDelete(`form:${formId}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'form_section',
    resource_id: data.id,
    new_value: { form_id: formId, title: data.title },
  });

  return data;
}

export async function updateSection(
  sectionId: string,
  clientId: string,
  userId: string,
  input: Partial<Pick<FormSection, 'title' | 'description' | 'sort_order' | 'is_collapsible' | 'is_collapsed_default'>>
): Promise<FormSection> {
  const { data: existing } = await supabaseAdmin
    .from('form_sections')
    .select('form_id')
    .eq('id', sectionId)
    .single();

  if (!existing) throw new Error('Section not found');

  const { data, error } = await supabaseAdmin
    .from('form_sections')
    .update(input)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) throw error;

  await cacheDelete(`form:${existing.form_id}`);

  return data;
}

export async function deleteSection(
  sectionId: string,
  clientId: string,
  userId: string
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('form_sections')
    .select('form_id')
    .eq('id', sectionId)
    .single();

  if (!existing) throw new Error('Section not found');

  // Move fields to unsectioned
  await supabaseAdmin
    .from('form_fields')
    .update({ section_id: null })
    .eq('section_id', sectionId);

  const { error } = await supabaseAdmin
    .from('form_sections')
    .delete()
    .eq('id', sectionId);

  if (error) throw error;

  await cacheDelete(`form:${existing.form_id}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.delete',
    resource_type: 'form_section',
    resource_id: sectionId,
  });
}

// ============================================================
// PUBLIC FORM (for registration page)
// ============================================================

export async function getPublicForm(eventSlug: string): Promise<{
  form: RegistrationForm;
  fields: FormField[];
  sections: FormSection[];
  event: { id: string; name: string; start_date: string; end_date: string };
} | null> {
  // Get event by slug
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, name, start_date, end_date, client_id')
    .eq('slug', eventSlug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single();

  if (!event) return null;

  // Get active form for event
  const { data: form } = await supabaseAdmin
    .from('registration_forms')
    .select('*')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!form) return null;

  // Get fields
  const { data: fields } = await supabaseAdmin
    .from('form_fields')
    .select('*')
    .eq('form_id', form.id)
    .order('sort_order');

  // Get sections
  const { data: sections } = await supabaseAdmin
    .from('form_sections')
    .select('*')
    .eq('form_id', form.id)
    .order('sort_order');

  return {
    form,
    fields: fields || [],
    sections: sections || [],
    event: {
      id: event.id,
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
    },
  };
}

// ============================================================
// FORM VALIDATION (server-side)
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export async function validateRegistration(
  formId: string,
  formData: Record<string, unknown>
): Promise<ValidationResult> {
  const form = await getFormPublic(formId);
  if (!form) {
    return { valid: false, errors: { form: 'Form not found' } };
  }

  const errors: Record<string, string> = {};

  for (const field of form.fields) {
    const value = formData[field.id] ?? formData[field.label];

    // Skip non-input fields
    if (['heading', 'paragraph', 'divider'].includes(field.field_type)) {
      continue;
    }

    // Required check
    const isRequired = field.is_required ||
      (field.conditional_required?.enabled && evaluateCondition(field.conditional_required.rules, formData));

    if (isRequired && (value === undefined || value === null || value === '')) {
      errors[field.id] = field.validation?.custom_message || `${field.label} is required`;
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type validation
    const typeError = validateFieldTypeValue(field, value);
    if (typeError) {
      errors[field.id] = typeError;
      continue;
    }

    // Custom validation
    if (field.validation) {
      const valError = validateCustomRules(field, value);
      if (valError) {
        errors[field.id] = valError;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

async function getFormPublic(formId: string): Promise<FormWithFields | null> {
  const { data: form } = await supabaseAdmin
    .from('registration_forms')
    .select('*')
    .eq('id', formId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!form) return null;

  const { data: fields } = await supabaseAdmin
    .from('form_fields')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order');

  const { data: sections } = await supabaseAdmin
    .from('form_sections')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order');

  return {
    ...form,
    fields: fields || [],
    sections: sections || [],
  };
}

function validateFieldTypeValue(field: FormField, value: unknown): string | null {
  const strValue = String(value);

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
    case 'file':
      // File validation is done separately
      break;
  }

  return null;
}

function validateCustomRules(field: FormField, value: unknown): string | null {
  const v = field.validation;
  if (!v) return null;

  const strValue = String(value);

  if (v.min_length !== undefined && strValue.length < v.min_length) {
    return v.custom_message || `Minimum ${v.min_length} characters required`;
  }
  if (v.max_length !== undefined && strValue.length > v.max_length) {
    return v.custom_message || `Maximum ${v.max_length} characters allowed`;
  }
  if (v.pattern && !new RegExp(v.pattern).test(strValue)) {
    return v.custom_message || 'Invalid format';
  }
  if (v.min_value !== undefined && Number(strValue) < v.min_value) {
    return v.custom_message || `Minimum value is ${v.min_value}`;
  }
  if (v.max_value !== undefined && Number(strValue) > v.max_value) {
    return v.custom_message || `Maximum value is ${v.max_value}`;
  }

  return null;
}

function evaluateCondition(
  rules: Array<{ field_id: string; operator: string; value: string }>,
  formData: Record<string, unknown>
): boolean {
  return rules.some((rule) => {
    const fieldValue = String(formData[rule.field_id] || '');
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
}
