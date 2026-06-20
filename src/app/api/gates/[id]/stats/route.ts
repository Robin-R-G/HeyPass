import { NextRequest, NextResponse } from 'next/server';
import { gateService } from '@/lib/gate-service';
import { withAuth } from '@/lib/route-guard';

// GET /api/gates/[id]/stats — Get gate statistics
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user) => {
    try {
      const { id: gateId } = await params;
      const gate = await gateService.getGate(user.client_id!, gateId);
      if (!gate) return NextResponse.json({ success: false, error: 'Gate not found' }, { status: 404 });

      const performance = await gateService.getGatePerformance(user.client_id!, gate.event_id);
      const gateStats = performance.find((g: { gate_id: string }) => g.gate_id === gateId);

      return NextResponse.json({ success: true, data: gateStats || { gate_id: gateId, total_scans: 0 } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get gate stats';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  });
}
