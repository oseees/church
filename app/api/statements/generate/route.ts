import { NextRequest, NextResponse } from 'next/server';
import { generateStatementPDF } from '@/lib/pdf';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { customerId, period } = await request.json();

  if (!customerId || !period) {
    return NextResponse.json({ error: 'customerId and period required' }, { status: 400 });
  }

  // Parse period: 'monthly' → last 30 days, or custom {start, end}
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  } else if (typeof period === 'object' && period.start && period.end) {
    startDate = new Date(period.start);
    endDate = new Date(period.end);
  } else {
    return NextResponse.json({ error: 'Invalid period format' }, { status: 400 });
  }

  try {
    const pdfBuffer = await generateStatementPDF(customerId, startDate, endDate);

    // Upload to Vercel Blob
    const blobToken = process.env.VERCEL_BLOB_TOKEN!;
    const filename = `statement-${customerId}-${Date.now()}.pdf`;

    const uploadRes = await fetch(`https://blob.vercel-storage.com/put/${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        'Content-Type': 'application/pdf',
        'x-api-version': '1',
      },
      body: new Uint8Array(pdfBuffer),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Blob upload failed: ${err}`);
    }

    const { url } = await uploadRes.json();

    return NextResponse.json({ pdfUrl: url });
  } catch (err) {
    console.error('[statements/generate] error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
