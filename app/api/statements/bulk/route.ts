import { NextRequest, NextResponse } from 'next/server';
import { enqueueBulkStatement } from '@/lib/bulk';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { period, segment } = await request.json();

  if (!period) {
    return NextResponse.json({ error: 'period is required' }, { status: 400 });
  }

  try {
    const result = await enqueueBulkStatement(period, segment);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[statements/bulk] error:', err);
    return NextResponse.json({ error: 'Bulk enqueue failed' }, { status: 500 });
  }
}
