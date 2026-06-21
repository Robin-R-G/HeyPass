import { supabaseAdmin } from '@/lib/supabase/client';
import { createAuditLog } from '@/lib/audit';
import { generateSlug } from '@/lib/utils';

interface TaskInput {
  title: string;
  description?: string;
  location?: string;
  task_type?: string;
  start_time: string;
  end_time: string;
  slots_total?: number;
  skills_required?: string[];
}

interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  skills?: string[];
  availability?: { day_of_week: number; start_time: string; end_time: string }[];
}

interface VolunteerAnalyticsResult {
  total: number;
  approved: number;
  pending: number;
  checked_in: number;
  completed: number;
  no_show: number;
  tasks_total: number;
  tasks_filled: number;
  total_hours: number;
  top_performers: { name: string; hours: number; tasks: number }[];
  daily_stats: { date: string; count: number }[];
}

// ─── Tasks ───────────────────────────────────────────────────────

async function createTask(clientId: string, eventId: string, input: TaskInput) {
  const { data, error } = await supabaseAdmin
    .from('volunteer_tasks')
    .insert({
      client_id: clientId,
      event_id: eventId,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      task_type: input.task_type || 'general',
      start_time: input.start_time,
      end_time: input.end_time,
      slots_total: input.slots_total || 1,
      skills_required: input.skills_required || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data;
}

async function updateTask(clientId: string, taskId: string, input: Partial<TaskInput>) {
  const { data, error } = await supabaseAdmin
    .from('volunteer_tasks')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data;
}

async function deleteTask(clientId: string, taskId: string) {
  const { error } = await supabaseAdmin
    .from('volunteer_tasks')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', taskId)
    .eq('client_id', clientId);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

async function listTasks(clientId: string, eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('volunteer_tasks')
    .select('*')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('start_time', { ascending: true });

  if (error) throw new Error(`Failed to list tasks: ${error.message}`);
  return data || [];
}

// ─── Applications ────────────────────────────────────────────────

async function registerVolunteer(eventId: string, clientId: string, input: RegisterInput) {
  const { data: existing } = await supabaseAdmin
    .from('volunteer_applications')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('email', input.email)
    .maybeSingle();

  if (existing) {
    throw new Error('You have already applied for this event');
  }

  const { data, error } = await supabaseAdmin
    .from('volunteer_applications')
    .insert({
      event_id: eventId,
      client_id: clientId,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
      skills: input.skills || null,
      availability_json: input.availability || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to register: ${error.message}`);

  if (input.availability && input.availability.length > 0) {
    await supabaseAdmin.from('volunteer_availability').insert(
      input.availability.map((a) => ({
        volunteer_application_id: data.id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      }))
    );
  }

  return data;
}

async function listVolunteers(clientId: string, eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('volunteer_applications')
    .select('*, assignments:volunteer_assignments(*)')
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list volunteers: ${error.message}`);
  return data || [];
}

async function updateVolunteerStatus(
  clientId: string,
  userId: string,
  applicationId: string,
  status: string,
  assignedUserId?: string
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (assignedUserId) updates.assigned_user_id = assignedUserId;

  const { data, error } = await supabaseAdmin
    .from('volunteer_applications')
    .update(updates)
    .eq('id', applicationId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update status: ${error.message}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'volunteer.status_update',
    resource_type: 'volunteer_application',
    resource_id: applicationId,
    new_value: { status, assigned_user_id: assignedUserId },
  });

  return data;
}

// ─── Assignments ─────────────────────────────────────────────────

async function assignVolunteer(
  clientId: string,
  eventId: string,
  userId: string,
  taskId: string,
  applicationId: string
) {
  const { data: task } = await supabaseAdmin
    .from('volunteer_tasks')
    .select('slots_total, slots_filled')
    .eq('id', taskId)
    .single();

  if (!task) throw new Error('Task not found');
  if (task.slots_filled >= task.slots_total) {
    throw new Error('Task is fully booked');
  }

  const { data, error } = await supabaseAdmin
    .from('volunteer_assignments')
    .insert({
      task_id: taskId,
      volunteer_application_id: applicationId,
      event_id: eventId,
      client_id: clientId,
      status: 'assigned',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to assign volunteer: ${error.message}`);

  await supabaseAdmin
    .from('volunteer_tasks')
    .update({ slots_filled: task.slots_filled + 1 })
    .eq('id', taskId);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'volunteer.assign',
    resource_type: 'volunteer_assignment',
    resource_id: data.id,
    new_value: { task_id: taskId, application_id: applicationId },
  });

  return data;
}

async function unassignVolunteer(clientId: string, userId: string, assignmentId: string) {
  const { data: assignment } = await supabaseAdmin
    .from('volunteer_assignments')
    .select('task_id')
    .eq('id', assignmentId)
    .single();

  if (!assignment) throw new Error('Assignment not found');

  const { error } = await supabaseAdmin
    .from('volunteer_assignments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (error) throw new Error(`Failed to unassign: ${error.message}`);

  const { data: task } = await supabaseAdmin
    .from('volunteer_tasks')
    .select('slots_filled')
    .eq('id', assignment.task_id)
    .single();

  if (task && task.slots_filled > 0) {
    await supabaseAdmin
      .from('volunteer_tasks')
      .update({ slots_filled: task.slots_filled - 1 })
      .eq('id', assignment.task_id);
  }

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'volunteer.unassign',
    resource_type: 'volunteer_assignment',
    resource_id: assignmentId,
  });
}

async function checkInVolunteer(
  clientId: string,
  eventId: string,
  userId: string,
  assignmentId: string
) {
  const { data, error } = await supabaseAdmin
    .from('volunteer_assignments')
    .update({
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to check in: ${error.message}`);
  return data;
}

async function checkOutVolunteer(
  clientId: string,
  eventId: string,
  userId: string,
  assignmentId: string
) {
  const { data: assignment } = await supabaseAdmin
    .from('volunteer_assignments')
    .select('checked_in_at')
    .eq('id', assignmentId)
    .single();

  if (!assignment) throw new Error('Assignment not found');

  const { data, error } = await supabaseAdmin
    .from('volunteer_assignments')
    .update({
      status: 'checked_out',
      checked_out_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to check out: ${error.message}`);
  return data;
}

// ─── Schedule ────────────────────────────────────────────────────

async function getSchedule(clientId: string, eventId: string, date?: string) {
  let query = supabaseAdmin
    .from('volunteer_tasks')
    .select(`
      *,
      assignments:volunteer_assignments(
        *,
        volunteer:volunteer_applications(first_name, last_name, email, phone)
      )
    `)
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('start_time', { ascending: true });

  if (date) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    query = query.gte('start_time', dayStart.toISOString()).lt('start_time', dayEnd.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get schedule: ${error.message}`);
  return data || [];
}

// ─── Analytics ────────────────────────────────────────────────────

async function getVolunteerAnalytics(clientId: string, eventId: string): Promise<VolunteerAnalyticsResult> {
  const [appsResult, tasksResult, assignResult] = await Promise.all([
    supabaseAdmin
      .from('volunteer_applications')
      .select('status')
      .eq('client_id', clientId)
      .eq('event_id', eventId),

    supabaseAdmin
      .from('volunteer_tasks')
      .select('slots_total, slots_filled')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .is('deleted_at', null),

    supabaseAdmin
      .from('volunteer_assignments')
      .select('status, checked_in_at, checked_out_at, volunteer:volunteer_applications(first_name, last_name)')
      .eq('client_id', clientId)
      .eq('event_id', eventId),
  ]);

  const apps = appsResult.data || [];
  const tasks = tasksResult.data || [];
  const assignments = assignResult.data || [];

  const total = apps.length;
  const approved = apps.filter((a) => a.status === 'approved').length;
  const pending = apps.filter((a) => a.status === 'pending').length;
  const checkedIn = assignments.filter((a) => a.status === 'checked_in' || a.status === 'checked_out').length;
  const completed = assignments.filter((a) => a.status === 'checked_out').length;
  const noShow = assignments.filter((a) => a.status === 'no_show').length;

  const tasksTotal = tasks.reduce((s, t) => s + (t.slots_total || 0), 0);
  const tasksFilled = tasks.reduce((s, t) => s + (t.slots_filled || 0), 0);

  const volunteerHours = new Map<string, { name: string; hours: number; tasks: number }>();
  for (const a of assignments) {
    if (a.checked_in_at && a.checked_out_at) {
      const hours = (new Date(a.checked_out_at).getTime() - new Date(a.checked_in_at).getTime()) / 3600000;
      const vol = a.volunteer as { first_name: string; last_name: string } | null;
      const name = vol ? `${vol.first_name} ${vol.last_name}` : 'Unknown';
      const existing = volunteerHours.get(name) || { name, hours: 0, tasks: 0 };
      existing.hours += hours;
      existing.tasks++;
      volunteerHours.set(name, existing);
    }
  }

  const topPerformers = Array.from(volunteerHours.values())
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const dailyMap = new Map<string, number>();
  for (const a of assignments) {
    if (a.checked_in_at) {
      const day = new Date(a.checked_in_at).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }
  }
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total, approved, pending,
    checked_in: checkedIn,
    completed,
    no_show: noShow,
    tasks_total: tasksTotal,
    tasks_filled: tasksFilled,
    total_hours: Array.from(volunteerHours.values()).reduce((s, v) => s + v.hours, 0),
    top_performers: topPerformers,
    daily_stats: dailyStats,
  };
}

export const volunteerService = {
  createTask,
  updateTask,
  deleteTask,
  listTasks,
  registerVolunteer,
  listVolunteers,
  updateVolunteerStatus,
  assignVolunteer,
  unassignVolunteer,
  checkInVolunteer,
  checkOutVolunteer,
  getSchedule,
  getVolunteerAnalytics,
};

export type { TaskInput, RegisterInput, VolunteerAnalyticsResult };
