import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { phone: true, name: true } },
      product: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      customer: o.customer,
      product: o.product,
      quantity: o.quantity,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }))
  );
}
