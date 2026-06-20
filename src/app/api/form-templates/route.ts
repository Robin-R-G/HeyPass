import { NextRequest } from 'next/server';
import { withAuth, withPermission, successResponse, errorResponse } from '@/lib/route-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { listTemplates, createTemplate } from '@/lib/form-templates';

// GET /api/form-templates — List templates
export const GET = withAuth(async (req: NextRequest, auth) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;

  const templates = await listTemplates(auth.clientId!, category);
  return successResponse({ templates });
});

// POST /api/form-templates — Create template
export const POST = withPermission(async (req: NextRequest, auth) => {
  const body = await req.json();

  if (!body.name) {
    return errorResponse('Name is required');
  }

  const template = await createTemplate(auth.clientId!, auth.userId, {
    name: body.name,
    description: body.description,
    category: body.category,
    fields_config: body.fields_config || [],
    sections_config: body.sections_config,
    is_public: body.is_public,
  });

  return successResponse({ template }, 201);
}, PERMISSIONS.SETTINGS_EDIT);
