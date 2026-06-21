import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { fraudPreventionService } from '@/lib/fraud-prevention-service';
import { z } from 'zod';

const updateRuleSchema = z.object({
  rule_id: z.string().uuid(),
  config: z.record(z.unknown()),
});

const toggleSchema = z.object({
  rule_id: z.string().uuid(),
  is_active: z.boolean(),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const rules = await fraudPreventionService.listRules(clientId);
      const stats = await fraudPreventionService.getStats(clientId);
      return NextResponse.json({ rules, stats });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, userId, clientId) => {
    try {
      const body = await req.json();

      // Toggle rule
      if (body.is_active !== undefined) {
        const parsed = toggleSchema.parse(body);
        await fraudPreventionService.toggleRule(clientId, parsed.rule_id, parsed.is_active);
        return NextResponse.json({ success: true });
      }

      // Update rule config
      const parsed = updateRuleSchema.parse(body);
      const rule = await fraudPreventionService.updateRule(clientId, parsed.rule_id, parsed.config);
      return NextResponse.json({ rule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
