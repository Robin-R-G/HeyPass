import { NextRequest } from 'next/server';
import { gateService } from '@/lib/gate-service';
import { withAuth } from '@/lib/route-guard';
import { supabaseAdmin } from '@/lib/supabase/client';

// GET /api/gates/[id]/live — SSE live feed for gate
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await new Promise<{ clientId: string }>((resolve, reject) => {
    withAuth(req, async (_req, auth) => {
      resolve({ clientId: auth.clientId! });
    }).catch(reject);
  });

  const { id: gateId } = await params;
  const encoder = new TextEncoder();
  let lastCheck = new Date().toISOString();

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const feeds = await gateService.getGateLiveFeed(gateId, lastCheck);
          lastCheck = new Date().toISOString();

          const payload = `data: ${JSON.stringify({ feeds, timestamp: lastCheck })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          // silently retry
        }
      };

      send();
      const interval = setInterval(send, 3000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
