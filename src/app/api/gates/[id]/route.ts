import { NextRequest, NextResponse } from 'next/server';
import { gateService } from '@/lib/gate-service';
import { withAuth } from '@/lib/route-guard';

// GET /api/gates/[id] — Get single gate
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id } = await params;
      const gate = await gateService.getGate(user.client_id!, id);
      if (!gate) return NextResponse.json({ success: false, error: 'Gate not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: gate });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get gate';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

// PATCH /api/gates/[id] — Update gate
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const gate = await gateService.updateGate(user.client_id!, id, body);
      return NextResponse.json({ success: true, data: gate });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update gate';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

// DELETE /api/gates/[id] — Delete gate
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id } = await params;
      await gateService.deleteGate(user.client_id!, id);
      return NextResponse.json({ success: true, message: 'Gate deleted' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete gate';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}
