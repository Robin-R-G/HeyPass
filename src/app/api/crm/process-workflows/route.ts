import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    const { workflowService } = await import('@/lib/workflow-service');
    await workflowService.processScheduledWorkflowRuns();

    return successResponse({ processed: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
