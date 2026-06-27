import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { searchParams }: { searchParams: Promise<{ [key: string]: string }> }
) {
  try {
    const params = await searchParams;
    const imagePath = params.get('path');

    if (!imagePath) {
      return NextResponse.json({ error: 'Image path required' }, { status: 400 });
    }

    // Download from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('certificates')
      .download(imagePath);

    if (error || !data) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Convert Blob to ArrayBuffer then to response
    const arrayBuffer = await data.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
