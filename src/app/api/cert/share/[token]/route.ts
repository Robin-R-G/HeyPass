import { NextRequest, NextResponse } from 'next/server';
import { certificateService } from '@/lib/certificate-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await certificateService.getByShareToken(token);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found or link expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        certificate: {
          certificate_number: result.certificate.certificate_number,
          recipient_name: result.certificate.recipient_name,
          event_title: result.certificate.event_title,
          certificate_type: result.certificate.certificate_type,
          issued_at: result.certificate.issued_at,
          organization_name: result.certificate.organization_name,
          status: result.certificate.status,
          pdf_url: result.certificate.pdf_url,
          png_url: result.certificate.png_url,
        },
        share_link: result.share_link,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
