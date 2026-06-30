import { NextRequest, NextResponse } from 'next/server';
import { createCheckout } from '@/lib/paystack';

export async function POST(request: NextRequest) {
  const { phone, amount } = await request.json();
  if (!phone || !amount || amount <= 0) {
    return NextResponse.json({ error: 'phone and amount required' }, { status: 400 });
  }
  try {
    const email = `${phone.replace(/\D/g, '')}@customer.church`;
    const { authorization_url, reference } = await createCheckout(amount, phone, email);
    return NextResponse.json({ url: authorization_url, reference });
  } catch (err) {
    console.error('[paystack/create] error:', err);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}