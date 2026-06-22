import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/route-guard';
import { volunteerService } from '@/lib/volunteer-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload } = await import('@/lib/route-guard');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);

    const tasks = await volunteerService.listTasks(auth.clientId, id);
    return successResponse({ tasks });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_TASKS_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const task = await volunteerService.createTask(auth.clientId, id, body);
    return successResponse({ task }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_TASKS_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const body = await req.json();
    const { task_id, ...updates } = body;
    if (!task_id) return errorResponse('task_id is required');
    const task = await volunteerService.updateTask(auth.clientId, task_id, updates);
    return successResponse({ task });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { extractAuthPayload, requirePermission } = await import('@/lib/route-guard');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = extractAuthPayload(req);
    if (!auth || !auth.clientId) return errorResponse('Forbidden', 403);
    const guard = await requirePermission(req, PERMISSIONS.VOLUNTEER_TASKS_MANAGE);
    if (!guard.allowed) return errorResponse('Forbidden', 403);

    const { task_id } = await req.json();
    if (!task_id) return errorResponse('task_id is required');
    await volunteerService.deleteTask(auth.clientId, task_id);
    return successResponse({ deleted: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
}
