import { NextRequest, NextResponse } from 'next/server';
import { verificationService } from '@/lib/verification-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await verificationService.verifyByURL(token, ip, userAgent);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        message: 'Certificate not found or has been revoked',
      }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
