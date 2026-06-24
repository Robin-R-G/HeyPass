import { supabaseAdmin } from '@/lib/supabase/client';
import { whatsappService } from './whatsapp-service';

export interface WorkflowAction {
  type: 'whatsapp';
  template_name: string;
  variables: string[]; // Variable maps, e.g. ['{{name}}', '{{event_title}}']
  delay_minutes: number;
}

export interface WorkflowDefinition {
  id: string;
  client_id: string;
  event_id: string;
  name: string;
  trigger_type: 'registration_complete' | 'days_before_event' | 'hours_before_event' | 'checkin_complete' | 'certificate_ready' | 'feedback_missing' | 'event_completed';
  trigger_config: Record<string, any>;
  actions: WorkflowAction[];
  is_active: boolean;
}

class WorkflowService {
  /**
   * Trigger Workflows for a specific lifecycle event
   */
  async triggerWorkflow(params: {
    clientId: string;
    eventId: string;
    triggerType: string;
    contactId: string;
    variables?: Record<string, string>; // Placeholder values
  }): Promise<void> {
    const { clientId, eventId, triggerType, contactId, variables = {} } = params;

    // 1. Fetch active workflows matching the trigger
    const { data: workflows, error } = await supabaseAdmin
      .from('crm_workflows')
      .select('*')
      .eq('client_id', clientId)
      .eq('event_id', eventId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true);

    if (error || !workflows || workflows.length === 0) {
      return; // No active workflows matching trigger
    }

    // Fetch contact name/email details to inject variables if needed
    const { data: contact } = await supabaseAdmin
      .from('crm_contacts')
      .select('name, email, phone')
      .eq('id', contactId)
      .single();

    const mergedVariables = {
      name: contact?.name || 'Attendee',
      email: contact?.email || '',
      phone: contact?.phone || '',
      ...variables,
    };

    // 2. Process each workflow definition
    for (const workflow of workflows) {
      for (const action of (workflow.actions as WorkflowAction[])) {
        // Resolve variables mapped to actions
        const resolvedVars = action.variables.map(v => {
          let resolved = v;
          Object.entries(mergedVariables).forEach(([key, val]) => {
            resolved = resolved.replace(`{{${key}}}`, val);
          });
          return resolved;
        });

        if (action.delay_minutes > 0) {
          // Schedule workflow run for later
          const scheduledAt = new Date(Date.now() + action.delay_minutes * 60 * 1000).toISOString();
          await supabaseAdmin
            .from('crm_workflow_runs')
            .insert({
              client_id: clientId,
              workflow_id: workflow.id,
              contact_id: contactId,
              event_id: eventId,
              status: 'pending',
              scheduled_at: scheduledAt,
              execution_log: {
                action_type: action.type,
                template_name: action.template_name,
                variables: resolvedVars,
              },
            });
        } else {
          // Execute immediately
          await this.executeAction(clientId, eventId, contactId, action.type, action.template_name, resolvedVars);
        }
      }
    }
  }

  /**
   * Helper to execute a single workflow run action (e.g. WhatsApp message)
   */
  private async executeAction(
    clientId: string,
    eventId: string,
    contactId: string,
    actionType: string,
    templateName: string,
    variables: string[]
  ): Promise<boolean> {
    try {
      if (actionType === 'whatsapp') {
        await whatsappService.sendTemplateMessage({
          clientId,
          contactId,
          eventId,
          templateName,
          variables,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Workflow Engine] Action execution failed:', err);
      return false;
    }
  }

  /**
   * Process all pending scheduled workflows (to be called by a cron / periodic background trigger)
   */
  async processScheduledWorkflowRuns(): Promise<void> {
    const now = new Date().toISOString();

    const { data: runs, error } = await supabaseAdmin
      .from('crm_workflow_runs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (error || !runs || runs.length === 0) return;

    for (const run of runs) {
      // Mark as currently processing to prevent double run
      await supabaseAdmin
        .from('crm_workflow_runs')
        .update({ status: 'completed', executed_at: now })
        .eq('id', run.id);

      const log = run.execution_log as any;
      const success = await this.executeAction(
        run.client_id,
        run.event_id,
        run.contact_id,
        log.action_type,
        log.template_name,
        log.variables || []
      );

      if (!success) {
        await supabaseAdmin
          .from('crm_workflow_runs')
          .update({ status: 'failed', executed_at: now })
          .eq('id', run.id);
      }
    }
  }
}

export const workflowService = new WorkflowService();
