import { NextRequest, NextResponse } from 'next/server';
import { gateService } from '@/lib/gate-service';
import { withAuth } from '@/lib/route-guard';

// GET /api/events/[id]/gates — List gates for event
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const gates = await gateService.listGates(user.client_id!, eventId);
      return NextResponse.json({ success: true, data: gates });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list gates';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

// POST /api/events/[id]/gates — Create gate
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: eventId } = await params;
      const body = await req.json();
      const gate = await gateService.createGate(user.client_id!, eventId, body);
      return NextResponse.json({ success: true, data: gate }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create gate';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}
