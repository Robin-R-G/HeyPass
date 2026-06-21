import { NextRequest, NextResponse } from 'next/server';
import { registrationLinkService } from '@/lib/registration-link-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const result = await registrationLinkService.resolve(code);

    if (!result) {
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Build registration URL with UTM params
    const url = new URL(`/register/${result.event_id}`, request.url);
    const { searchParams } = new URL(request.url);

    // Copy UTM params if present
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('utm_')) {
        url.searchParams.set(key, value);
      }
    }

    url.searchParams.set('ref', code);

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.redirect(new URL('/404', request.url));
  }
}
