import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search') || '';
  const phone = request.nextUrl.searchParams.get('phone');

  // Single customer detail view
  if (phone) {
    const customer = await prisma.customer.findUnique({
      where: { phone },
      include: {
        orders: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { orders: true, transactions: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    return NextResponse.json({
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      balance: Number(customer.balance),
      creditLimit: Number(customer.creditLimit),
      totalOrders: customer._count.orders,
      totalTransactions: customer._count.transactions,
      orders: customer.orders.map((o) => ({
        id: o.id,
        product: o.product.name,
        quantity: o.quantity,
        total: Number(o.total),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      transactions: customer.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        createdAt: t.createdAt.toISOString(),
      })),
    });
  }

  // List all customers
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { phone: { contains: search } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { orders: true, transactions: true } },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { balance: 'desc' },
  });

  return NextResponse.json(
    customers.map((c) => ({
      id: c.id,
      phone: c.phone,
      name: c.name,
      balance: Number(c.balance),
      creditLimit: Number(c.creditLimit),
      totalOrders: c._count.orders,
      totalTransactions: c._count.transactions,
      lastOrderAt: c.orders[0]?.createdAt?.toISOString() || null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, name, creditLimit } = body;

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
  }

  // Check for duplicate phone
  const existing = await prisma.customer.findUnique({ where: { phone: phone.trim() } });
  if (existing) {
    return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 });
  }

  const limit = typeof creditLimit === 'number' && creditLimit >= 0 ? creditLimit : 0;

  const customer = await prisma.customer.create({
    data: {
      phone: phone.trim(),
      name: name.trim(),
      creditLimit: limit,
    },
  });

  return NextResponse.json({
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    balance: Number(customer.balance),
    creditLimit: Number(customer.creditLimit),
    totalOrders: 0,
    totalTransactions: 0,
    lastOrderAt: null,
  }, { status: 201 });
}
