import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { createForm, addSection, addField, type FormField } from './form-builder';

// ============================================================
// TYPES
// ============================================================

export interface FormTemplate {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  category: string;
  fields_config: Array<Partial<FormField> & { label: string; field_type: string }>;
  sections_config: Array<{ title: string; description?: string; sort_order: number }>;
  is_system: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// TEMPLATE CRUD
// ============================================================

export async function listTemplates(
  clientId: string,
  category?: string
): Promise<FormTemplate[]> {
  let query = supabaseAdmin
    .from('form_templates')
    .select('*')
    .is('deleted_at', null)
    .order('is_system', { ascending: false })
    .order('name');

  // Filter by category if provided
  if (category) {
    query = query.eq('category', category);
  }

  // Show system templates + client's own templates
  query = query.or(`is_system.eq.true,client_id.eq.${clientId},is_public.eq.true`);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getTemplate(templateId: string): Promise<FormTemplate | null> {
  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .select('*')
    .eq('id', templateId)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createTemplate(
  clientId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    category?: string;
    fields_config: Array<Partial<FormField> & { label: string; field_type: string }>;
    sections_config?: Array<{ title: string; description?: string; sort_order: number }>;
    is_public?: boolean;
  }
): Promise<FormTemplate> {
  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .insert({
      client_id: clientId,
      name: input.name,
      description: input.description || null,
      category: input.category || 'custom',
      fields_config: input.fields_config,
      sections_config: input.sections_config || [],
      is_system: false,
      is_public: input.is_public ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'form_template',
    resource_id: data.id,
    new_value: { name: data.name, category: data.category },
  });

  return data;
}

export async function updateTemplate(
  templateId: string,
  clientId: string,
  userId: string,
  input: Partial<Pick<FormTemplate, 'name' | 'description' | 'category' | 'fields_config' | 'sections_config' | 'is_public'>>
): Promise<FormTemplate> {
  const { data: existing } = await supabaseAdmin
    .from('form_templates')
    .select('id, is_system')
    .eq('id', templateId)
    .single();

  if (!existing) throw new Error('Template not found');
  if (existing.is_system) throw new Error('Cannot modify system templates');

  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .update(input)
    .eq('id', templateId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.create',
    resource_type: 'form_template',
    resource_id: templateId,
    new_value: { updated_fields: Object.keys(input) },
  });

  return data;
}

export async function deleteTemplate(
  templateId: string,
  clientId: string,
  userId: string
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('form_templates')
    .select('id, is_system')
    .eq('id', templateId)
    .single();

  if (!existing) throw new Error('Template not found');
  if (existing.is_system) throw new Error('Cannot delete system templates');

  const { error } = await supabaseAdmin
    .from('form_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('client_id', clientId);

  if (error) throw error;

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'event.delete',
    resource_type: 'form_template',
    resource_id: templateId,
  });
}

// ============================================================
// CREATE FORM FROM TEMPLATE
// ============================================================

export async function createFormFromTemplate(
  templateId: string,
  eventId: string,
  clientId: string,
  userId: string,
  formName?: string
): Promise<string> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error('Template not found');

  // Create form
  const form = await createForm(eventId, clientId, userId, {
    name: formName || template.name,
  });

  // Create sections
  const sectionMap = new Map<number, string>();

  for (const sectionConfig of template.sections_config) {
    const section = await addSection(form.id, clientId, userId, {
      title: sectionConfig.title,
      description: sectionConfig.description,
      sort_order: sectionConfig.sort_order,
    });
    sectionMap.set(sectionConfig.sort_order, section.id);
  }

  // Get sections to map sort_order to id
  const { data: sections } = await supabaseAdmin
    .from('form_sections')
    .select('id, sort_order')
    .eq('form_id', form.id);

  const sortOrderToSectionId = new Map<number, string>();
  if (sections) {
    for (const s of sections) {
      sortOrderToSectionId.set(s.sort_order, s.id);
    }
  }

  // Create fields
  for (const fieldConfig of template.fields_config) {
    const sectionId = sortOrderToSectionId.get(
      template.sections_config.findIndex(
        (s) => s.title === template.sections_config[0]?.title
      )
    ) || null;

    await addField(form.id, clientId, userId, {
      label: fieldConfig.label,
      field_type: fieldConfig.field_type as FormField['field_type'],
      placeholder: fieldConfig.placeholder,
      is_required: fieldConfig.is_required ?? false,
      is_unique: fieldConfig.is_unique ?? false,
      sort_order: fieldConfig.sort_order,
      options: fieldConfig.options,
      validation: fieldConfig.validation,
      conditional_logic: fieldConfig.conditional_logic,
      default_value: fieldConfig.default_value,
      help_text: fieldConfig.help_text,
      section_id: sectionId,
    });
  }

  return form.id;
}

// ============================================================
// SAVE FORM AS TEMPLATE
// ============================================================

export async function saveFormAsTemplate(
  formId: string,
  clientId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    category?: string;
    is_public?: boolean;
  }
): Promise<FormTemplate> {
  const { data: form } = await supabaseAdmin
    .from('registration_forms')
    .select('*')
    .eq('id', formId)
    .eq('client_id', clientId)
    .single();

  if (!form) throw new Error('Form not found');

  // Get fields
  const { data: fields } = await supabaseAdmin
    .from('form_fields')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order');

  // Get sections
  const { data: sections } = await supabaseAdmin
    .from('form_sections')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order');

  // Create template
  return createTemplate(clientId, userId, {
    name: input.name,
    description: input.description,
    category: input.category || 'custom',
    fields_config: (fields || []).map((f) => ({
      label: f.label,
      field_type: f.field_type,
      placeholder: f.placeholder,
      is_required: f.is_required,
      is_unique: f.is_unique,
      sort_order: f.sort_order,
      options: f.options,
      validation: f.validation,
      conditional_logic: f.conditional_logic,
      default_value: f.default_value,
      help_text: f.help_text,
    })),
    sections_config: (sections || []).map((s) => ({
      title: s.title,
      description: s.description,
      sort_order: s.sort_order,
    })),
    is_public: input.is_public ?? false,
  });
}
