import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDF } from '@/lib/pdf';

export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pdfBuffer = await generateInvoicePDF(params.id);
    const filename = `invoice-${params.id}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[invoices/pdf] error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
