import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/route-guard';
import { analyticsService } from '@/lib/analytics-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, userId, clientId) => {
    const { id } = await params;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = async () => {
          try {
            const metrics = await analyticsService.getRealtime(clientId, id);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(metrics)}\n\n`));
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`));
          }
        };

        send();
        const interval = setInterval(send, 10000);

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
  });
}
