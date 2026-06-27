import { createClient } from '@supabase/supabase-js';
import type { AIPromptTemplate } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface AIPromptServiceResult<T = AIPromptTemplate> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export interface AIPromptTemplateInput {
  name: string;
  slug: string;
  category: string;
  description?: string;
  template: string;
  variables: string[];
}

export class AIPromptService {
  async getTemplates(clientId: string): Promise<AIPromptServiceResult<AIPromptTemplate[]>> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) return { success: false, error: error.message };

    const templates = (data || []).map(t => ({
      ...t,
      variables: Array.isArray(t.variables) ? t.variables : [],
    }));

    return { success: true, data: templates };
  }

  async getTemplate(clientId: string, slug: string): Promise<AIPromptServiceResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('client_id', clientId)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Template not found' };

    return {
      success: true,
      data: {
        ...data,
        variables: Array.isArray(data.variables) ? data.variables : [],
      },
    };
  }

  async createTemplate(clientId: string, input: AIPromptTemplateInput): Promise<AIPromptServiceResult> {
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('ai_prompt_templates')
      .select('id')
      .eq('client_id', clientId)
      .eq('slug', input.slug)
      .single();

    if (existing) {
      return { success: false, error: 'A template with this slug already exists' };
    }

    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .insert({
        client_id: clientId,
        name: input.name,
        slug: input.slug,
        category: input.category,
        description: input.description || null,
        template: input.template,
        variables: input.variables,
        is_default: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        ...data,
        variables: Array.isArray(data.variables) ? data.variables : [],
      },
    };
  }

  async updateTemplate(clientId: string, templateId: string, input: Partial<AIPromptTemplateInput>): Promise<AIPromptServiceResult> {
    const supabase = getSupabase();
    const updateData: Record<string, unknown> = {};

    if (input.name) updateData.name = input.name;
    if (input.slug) updateData.slug = input.slug;
    if (input.category) updateData.category = input.category;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.template) updateData.template = input.template;
    if (input.variables) updateData.variables = input.variables;

    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('client_id', clientId)
      .eq('is_default', false)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Template not found or is a system default' };

    return {
      success: true,
      data: {
        ...data,
        variables: Array.isArray(data.variables) ? data.variables : [],
      },
    };
  }

  async deleteTemplate(clientId: string, templateId: string): Promise<AIPromptServiceResult> {
    const supabase = getSupabase();

    const { data: template } = await supabase
      .from('ai_prompt_templates')
      .select('is_default')
      .eq('id', templateId)
      .eq('client_id', clientId)
      .single();

    if (!template) return { success: false, error: 'Template not found' };
    if (template.is_default) return { success: false, error: 'Cannot delete system default templates' };

    const { error } = await supabase
      .from('ai_prompt_templates')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('client_id', clientId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  renderTemplate(template: string, variables: Record<string, string>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || `[${key}]`);
    }
    return rendered;
  }
}

let _service: AIPromptService | null = null;

export function getAIPromptService(): AIPromptService {
  if (!_service) _service = new AIPromptService();
  return _service;
}
