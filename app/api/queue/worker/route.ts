import { NextResponse } from 'next/server';
import { startWorker } from '@/lib/queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    startWorker().catch((err) => console.error('[worker] startWorker error:', err));
  } catch (err) {
    console.error('[worker] init error:', err);
  }
  return NextResponse.json({ ok: true });
}
