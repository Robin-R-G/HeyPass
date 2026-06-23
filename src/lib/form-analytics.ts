import { supabaseAdmin } from '@/lib/supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface FormAnalyticsData {
  form_id: string;
  date: string;
  views: number;
  starts: number;
  completions: number;
  errors: number;
  avg_time_seconds: number | null;
  field_views: Record<string, number>;
}

export interface FormAnalyticsSummary {
  total_views: number;
  total_starts: number;
  total_completions: number;
  total_errors: number;
  conversion_rate: number;
  completion_rate: number;
  avg_time_seconds: number | null;
  daily_data: FormAnalyticsData[];
}

// ============================================================
// ANALYTICS TRACKING
// ============================================================

export async function trackFormView(formId: string, eventId: string, clientId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseAdmin
    .from('form_analytics')
    .select('views')
    .eq('form_id', formId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('form_analytics')
      .update({ views: (existing.views || 0) + 1, updated_at: new Date().toISOString() })
      .eq('form_id', formId)
      .eq('date', today);
  } else {
    await supabaseAdmin
      .from('form_analytics')
      .insert({
        form_id: formId,
        event_id: eventId,
        client_id: clientId,
        date: today,
        views: 1,
      });
  }
}

export async function trackFormStart(formId: string, eventId: string, clientId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseAdmin
    .from('form_analytics')
    .select('starts')
    .eq('form_id', formId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('form_analytics')
      .update({ starts: (existing.starts || 0) + 1, updated_at: new Date().toISOString() })
      .eq('form_id', formId)
      .eq('date', today);
  } else {
    await supabaseAdmin
      .from('form_analytics')
      .insert({
        form_id: formId,
        event_id: eventId,
        client_id: clientId,
        date: today,
        starts: 1,
      });
  }
}

export async function trackFormCompletion(
  formId: string,
  eventId: string,
  clientId: string,
  timeSeconds?: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseAdmin
    .from('form_analytics')
    .select('completions, avg_time_seconds')
    .eq('form_id', formId)
    .eq('date', today)
    .single();

  if (existing) {
    const newCompletions = (existing.completions || 0) + 1;
    const newAvgTime = timeSeconds
      ? Math.round(((existing.avg_time_seconds || 0) * (existing.completions || 0) + timeSeconds) / newCompletions)
      : existing.avg_time_seconds;

    await supabaseAdmin
      .from('form_analytics')
      .update({
        completions: newCompletions,
        avg_time_seconds: newAvgTime,
        updated_at: new Date().toISOString(),
      })
      .eq('form_id', formId)
      .eq('date', today);
  } else {
    await supabaseAdmin
      .from('form_analytics')
      .insert({
        form_id: formId,
        event_id: eventId,
        client_id: clientId,
        date: today,
        completions: 1,
        avg_time_seconds: timeSeconds || null,
      });
  }
}

export async function trackFormError(formId: string, eventId: string, clientId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseAdmin
    .from('form_analytics')
    .select('errors')
    .eq('form_id', formId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('form_analytics')
      .update({ errors: (existing.errors || 0) + 1, updated_at: new Date().toISOString() })
      .eq('form_id', formId)
      .eq('date', today);
  } else {
    await supabaseAdmin
      .from('form_analytics')
      .insert({
        form_id: formId,
        event_id: eventId,
        client_id: clientId,
        date: today,
        errors: 1,
      });
  }
}

export async function trackFieldView(
  formId: string,
  eventId: string,
  clientId: string,
  fieldId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseAdmin
    .from('form_analytics')
    .select('field_views')
    .eq('form_id', formId)
    .eq('date', today)
    .single();

  const fieldViews = existing?.field_views || {};
  fieldViews[fieldId] = (fieldViews[fieldId] || 0) + 1;

  await supabaseAdmin
    .from('form_analytics')
    .upsert(
      {
        form_id: formId,
        event_id: eventId,
        client_id: clientId,
        date: today,
        field_views: fieldViews,
      },
      {
        onConflict: 'form_id,date',
        ignoreDuplicates: false,
      }
    );
}

// ============================================================
// ANALYTICS RETRIEVAL
// ============================================================

export async function getFormAnalytics(
  formId: string,
  clientId: string,
  days: number = 30
): Promise<FormAnalyticsSummary> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('form_analytics')
    .select('*')
    .eq('form_id', formId)
    .eq('client_id', clientId)
    .gte('date', startDateStr)
    .order('date');

  if (error) throw error;

  const analyticsData = data || [];

  const totalViews = analyticsData.reduce((sum, d) => sum + (d.views || 0), 0);
  const totalStarts = analyticsData.reduce((sum, d) => sum + (d.starts || 0), 0);
  const totalCompletions = analyticsData.reduce((sum, d) => sum + (d.completions || 0), 0);
  const totalErrors = analyticsData.reduce((sum, d) => sum + (d.errors || 0), 0);

  const avgTime = analyticsData
    .filter((d) => d.avg_time_seconds !== null)
    .reduce((sum, d, _, arr) => sum + (d.avg_time_seconds || 0) / arr.length, 0);

  return {
    total_views: totalViews,
    total_starts: totalStarts,
    total_completions: totalCompletions,
    total_errors: totalErrors,
    conversion_rate: totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0,
    completion_rate: totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 100) : 0,
    avg_time_seconds: avgTime > 0 ? Math.round(avgTime) : null,
    daily_data: analyticsData.map((d) => ({
      form_id: d.form_id,
      date: d.date,
      views: d.views || 0,
      starts: d.starts || 0,
      completions: d.completions || 0,
      errors: d.errors || 0,
      avg_time_seconds: d.avg_time_seconds,
      field_views: d.field_views || {},
    })),
  };
}

export async function getFormAnalyticsDaily(
  formId: string,
  clientId: string,
  startDate: string,
  endDate: string
): Promise<FormAnalyticsData[]> {
  const { data, error } = await supabaseAdmin
    .from('form_analytics')
    .select('*')
    .eq('form_id', formId)
    .eq('client_id', clientId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) throw error;

  return (data || []).map((d) => ({
    form_id: d.form_id,
    date: d.date,
    views: d.views || 0,
    starts: d.starts || 0,
    completions: d.completions || 0,
    errors: d.errors || 0,
    avg_time_seconds: d.avg_time_seconds,
    field_views: d.field_views || {},
  }));
}

export async function getEventFormsAnalytics(
  eventId: string,
  clientId: string
): Promise<Array<{
  form_id: string;
  form_name: string;
  views: number;
  starts: number;
  completions: number;
  conversion_rate: number;
}>> {
  const { data: forms } = await supabaseAdmin
    .from('registration_forms')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('client_id', clientId)
    .is('deleted_at', null);

  if (!forms) return [];

  const results: { form_id: string; form_name: string; views: number; starts: number; completions: number; conversion_rate: number }[] = [];

  for (const form of forms) {
    const { data: analytics } = await supabaseAdmin
      .from('form_analytics')
      .select('views, starts, completions')
      .eq('form_id', form.id)
      .eq('client_id', clientId);

    const totalViews = (analytics || []).reduce((sum, d) => sum + (d.views || 0), 0);
    const totalStarts = (analytics || []).reduce((sum, d) => sum + (d.starts || 0), 0);
    const totalCompletions = (analytics || []).reduce((sum, d) => sum + (d.completions || 0), 0);

    results.push({
      form_id: form.id,
      form_name: form.name,
      views: totalViews,
      starts: totalStarts,
      completions: totalCompletions,
      conversion_rate: totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0,
    });
  }

  return results;
}
