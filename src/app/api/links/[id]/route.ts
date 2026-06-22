import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { registrationLinkService } from '@/lib/registration-link-service';
import { z } from 'zod';

const updateSchema = z.object({
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const link = await registrationLinkService.get(clientId, id);
      if (!link) {
        return NextResponse.json({ error: 'Link not found' }, { status: 404 });
      }
      return NextResponse.json({ link });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = updateSchema.parse(body) as any;
      const link = await registrationLinkService.update(clientId, id, parsed);
      return NextResponse.json({ link });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const { id } = await params;
      await registrationLinkService.delete(clientId, id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
