import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/route-guard';
import { teamService } from '@/lib/team-service';

// GET /api/team/stats - Get team statistics
export const GET = withAuth(async (req: NextRequest, auth) => {
  if (!auth.clientId) return errorResponse('No client context', 403);

  const stats = await teamService.getMemberStats(auth.clientId);
  return successResponse(stats);
});
