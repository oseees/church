import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { phone, productId, quantity } = await request.json();

  if (!phone || !productId || !quantity) {
    return NextResponse.json(
      { error: 'phone, productId, quantity required' },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer)
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product)
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  if (product.stock < quantity)
    return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });

  const total = Number(product.pricePerKg) * quantity;
  const newBalance = Number(customer.balance) + total;

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      productId: product.id,
      quantity,
      total,
      status: 'Confirmed',
    },
  });

  await prisma.transaction.create({
    data: {
      customerId: customer.id,
      type: 'SALE',
      amount: total,
      balanceAfter: newBalance,
      orderId: order.id,
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { balance: newBalance },
  });

  await prisma.product.update({
    where: { id: product.id },
    data: { stock: { decrement: quantity } },
  });

  return NextResponse.json({ success: true, balance: newBalance, orderId: order.id });
}
