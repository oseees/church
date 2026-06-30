import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) return NextResponse.json([]);

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      product: o.product,
      quantity: o.quantity,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }))
  );
}
