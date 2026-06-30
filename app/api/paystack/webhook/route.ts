import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-paystack-signature') || '';
    const body = await request.text();

    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!).update(body).digest('hex');
    if (hash !== signature) {
      console.error('Paystack webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    if (event.event !== 'charge.success') return NextResponse.json({ received: true });

    const { reference, amount, metadata } = event.data;
    const phone = metadata?.phone;
    if (!phone || !amount) return NextResponse.json({ received: true });

    const existing = await prisma.transaction.findUnique({ where: { paystackRef: reference } });
    if (existing) return NextResponse.json({ received: true });

    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      console.error('Paystack webhook: customer not found', phone);
      return NextResponse.json({ received: true });
    }

    const amountNaira = amount / 100;
    const newBalance = Number(customer.balance) - amountNaira;

    await prisma.$transaction([
      prisma.customer.update({ where: { phone }, data: { balance: { decrement: amountNaira } } }),
      prisma.transaction.create({
        data: { customerId: customer.id, type: 'PAYMENT', amount: amountNaira, balanceAfter: newBalance, paystackRef: reference },
      }),
    ]);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
