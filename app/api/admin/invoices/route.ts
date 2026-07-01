import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  let seq = 1;
  if (last) {
    const m = last.number.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const customerId = searchParams.get('customerId') || undefined;

  const where: Record<string, unknown> = {};
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (customerId) where.customerId = customerId;

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: { select: { name: true, phone: true } },
      items: true,
    },
    orderBy: { issueDate: 'desc' },
    take: 200,
  });

  return NextResponse.json(
    invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      customerId: inv.customerId,
      customer: inv.customer,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      total: Number(inv.total),
      totalCost: inv.items.reduce((s, it) => s + Number(it.cost), 0),
      status: inv.status,
      notes: inv.notes,
      items: inv.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        cost: Number(it.cost),
        amount: Number(it.amount),
      })),
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { customerId, dueDate, tax, notes, items, status } = body;

  if (!customerId) {
    return NextResponse.json({ error: 'customerId required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one invoice item required' }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Validate + compute amounts
  const lineItems = items.map((it: { description: string; quantity: number; unitPrice: number; cost?: number }) => {
    if (!it.description || typeof it.description !== 'string') {
      throw new Error('Item description required');
    }
    if (typeof it.quantity !== 'number' || it.quantity <= 0) {
      throw new Error('Item quantity must be positive');
    }
    if (typeof it.unitPrice !== 'number' || it.unitPrice < 0) {
      throw new Error('Item unitPrice must be non-negative');
    }
    const amount = it.quantity * it.unitPrice;
    const itemCost = typeof it.cost === 'number' && it.cost >= 0 ? it.cost : 0;
    return {
      description: it.description.trim(),
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount,
      cost: itemCost,
    };
  });

  const subtotal = lineItems.reduce((s: number, it: { amount: number }) => s + it.amount, 0);
  const taxAmount = typeof tax === 'number' && tax >= 0 ? tax : 0;
  const total = subtotal + taxAmount;

  const number = await nextInvoiceNumber();

  const invoiceStatus = status && VALID_STATUSES.includes(status) ? status : 'DRAFT';

  const created = await prisma.invoice.create({
    data: {
      number,
      customerId,
      dueDate: dueDate ? new Date(dueDate) : null,
      subtotal,
      tax: taxAmount,
      total,
      status: invoiceStatus,
      notes: notes ?? null,
      items: { create: lineItems },
    },
    include: { items: true, customer: { select: { name: true, phone: true } } },
  });

  return NextResponse.json({
    id: created.id,
    number: created.number,
    customerId: created.customerId,
    customer: created.customer,
    issueDate: created.issueDate.toISOString(),
    dueDate: created.dueDate ? created.dueDate.toISOString() : null,
    subtotal: Number(created.subtotal),
    tax: Number(created.tax),
    total: Number(created.total),
    totalCost: created.items.reduce((s, it) => s + Number(it.cost), 0),
    status: created.status,
    notes: created.notes,
    items: created.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      cost: Number(it.cost),
      amount: Number(it.amount),
    })),
  }, { status: 201 });
}
