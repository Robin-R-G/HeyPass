import { NextRequest } from 'next/server';
import { resolveBrandingByDomain, resolveEventBranding, generateBrandCss } from '@/lib/branding';
import { successResponse, errorResponse } from '@/lib/route-guard';

// GET /api/resolve-branding — Resolve branding from domain or event_id
// This is a public endpoint used by middleware and SSR
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const eventId = searchParams.get('event_id');

    if (!domain && !eventId) {
      return errorResponse('domain or event_id is required');
    }

    let branding;

    if (eventId) {
      branding = await resolveEventBranding(eventId);
    } else if (domain) {
      branding = await resolveBrandingByDomain(domain);
    }

    if (!branding) {
      // Return default branding
      return successResponse({
        branding: {
          primary_color: '#3B82F6',
          secondary_color: '#1D4ED8',
          accent_color: '#10B981',
          background_color: '#FFFFFF',
          text_color: '#1F2937',
          success_color: '#10B981',
          warning_color: '#F59E0B',
          error_color: '#EF4444',
          font_family: 'Inter, system-ui, sans-serif',
          border_radius: 8,
          white_label_enabled: false,
        },
        css: generateBrandCss({
          primary_color: '#3B82F6',
          secondary_color: '#1D4ED8',
          accent_color: '#10B981',
          background_color: '#FFFFFF',
          text_color: '#1F2937',
          success_color: '#10B981',
          warning_color: '#F59E0B',
          error_color: '#EF4444',
          font_family: 'Inter, system-ui, sans-serif',
          border_radius: 8,
          white_label_enabled: false,
        } as any),
      });
    }

    return successResponse({
      branding,
      css: generateBrandCss(branding),
    });
  } catch (err) {
    console.error('Branding resolution error:', err);
    return errorResponse('Internal server error', 500);
  }
}
