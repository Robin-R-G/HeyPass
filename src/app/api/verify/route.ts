import { NextRequest, NextResponse } from 'next/server';
import { verificationService } from '@/lib/verification-service';
import { z } from 'zod';

const verifySchema = z.object({
  certificate_number: z.string().optional(),
  access_token: z.string().optional(),
  method: z.enum(['number', 'qr_code', 'url']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.parse(body);

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check CAPTCHA requirement
    const captchaRequired = await verificationService.getCaptchaRequired(ip);
    if (captchaRequired && !body.captcha_token) {
      return NextResponse.json({
        error: 'CAPTCHA verification required',
        captcha_required: true,
      }, { status: 429 });
    }

    let result;

    switch (parsed.method) {
      case 'number':
        if (!parsed.certificate_number) {
          return NextResponse.json({ error: 'certificate_number is required for method "number"' }, { status: 400 });
        }
        result = await verificationService.verifyByNumber(parsed.certificate_number, ip, userAgent);
        break;

      case 'qr_code':
        if (!parsed.access_token) {
          return NextResponse.json({ error: 'access_token is required for method "qr_code"' }, { status: 400 });
        }
        result = await verificationService.verifyByQR(parsed.access_token, ip, userAgent);
        break;

      case 'url':
        if (!parsed.access_token) {
          return NextResponse.json({ error: 'access_token is required for method "url"' }, { status: 400 });
        }
        result = await verificationService.verifyByURL(parsed.access_token, ip, userAgent);
        break;

      default:
        return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
