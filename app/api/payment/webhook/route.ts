import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { verifyTransaction, sendReceipt } from '@/lib/payment';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-paystack-signature') || '';
  const body = await request.text();

  // ── Verify Paystack webhook signature (HMAC SHA512) ──────────────────────────
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET!;
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

  if (hash !== signature) {
    console.error('Paystack signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);

  // Return 200 immediately — process async
  if (event.event === 'charge.success') {
    const { reference, amount, metadata } = event.data;
    const phone = metadata?.phone;

    if (phone && amount > 0) {
      handlePayment(phone, amount / 100, reference).catch((err) =>
        console.error('Payment processing error:', err)
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePayment(
  phone: string,
  amount: number,
  reference: string
) {
  try {
    // Verify transaction with Paystack before processing
    const txData = await verifyTransaction(reference);
    if (txData.status !== 'success') {
      console.log(`Transaction ${reference} not successful: ${txData.status}`);
      return;
    }

    // Idempotency: check for duplicate PAYMENT within 60s window
    const duplicate = await prisma.transaction.findFirst({
      where: {
        type: 'PAYMENT',
        amount,
        customer: { phone },
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (duplicate) {
      console.log(`Duplicate payment ignored for ${phone}: ₦${amount}`);
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      console.error(`Customer not found: ${phone}`);
      return;
    }

    const newBalance = Number(customer.balance) - amount;

    await prisma.transaction.create({
      data: {
        customerId: customer.id,
        type: 'PAYMENT',
        amount,
        balanceAfter: newBalance,
      },
    });

    await prisma.customer.update({
      where: { id: customer.id },
      data: { balance: newBalance },
    });

    await sendReceipt(phone, amount, newBalance);
    console.log(
      `Payment: ${phone} paid ₦${amount}, balance ₦${newBalance}`
    );
  } catch (error) {
    console.error('handlePayment error:', error);
  }
}
