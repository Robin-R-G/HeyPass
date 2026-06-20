import { NextRequest, NextResponse } from 'next/server';
import { gateService } from '@/lib/gate-service';
import { withAuth } from '@/lib/route-guard';

// GET /api/gates/[id]/staff — List staff for gate
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: gateId } = await params;
      const staff = await gateService.listGateStaff(user.client_id!, gateId);
      return NextResponse.json({ success: true, data: staff });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list staff';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

// POST /api/gates/[id]/staff — Assign staff to gate
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: gateId } = await params;
      const { staff_id, role } = await req.json();
      const assignment = await gateService.assignStaff(user.client_id!, gateId, staff_id, role);
      return NextResponse.json({ success: true, data: assignment }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign staff';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}

// DELETE /api/gates/[id]/staff — Remove staff from gate
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: gateId } = await params;
      const { staff_id } = await req.json();
      await gateService.removeStaff(user.client_id!, gateId, staff_id);
      return NextResponse.json({ success: true, message: 'Staff removed' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove staff';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}
