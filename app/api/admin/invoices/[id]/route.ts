import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { name: true, phone: true } },
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: invoice.id,
    number: invoice.number,
    customerId: invoice.customerId,
    customer: invoice.customer,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    subtotal: Number(invoice.subtotal),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    status: invoice.status,
    notes: invoice.notes,
    items: invoice.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      amount: Number(it.amount),
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { status, dueDate, notes } = body;

  const existing = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    data.status = status;
  }
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
    notes: updated.notes,
  });
}
