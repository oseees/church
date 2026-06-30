import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink } from '@/lib/payment';

export async function POST(request: NextRequest) {
  const { phone, amount, email } = await request.json();

  if (!phone || !amount) {
    return NextResponse.json(
      { error: 'phone and amount required' },
      { status: 400 }
    );
  }

  if (amount <= 0) {
    return NextResponse.json(
      { error: 'amount must be positive' },
      { status: 400 }
    );
  }

  try {
    const { authorization_url, reference } = await createPaymentLink(amount, phone, email);
    return NextResponse.json({ url: authorization_url, reference });
  } catch (err) {
    console.error('[payment/create] error:', err);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
