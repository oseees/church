import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['FEED', 'FEED_MATERIAL', 'DRUG', 'TRANSPORT', 'SALARY', 'BIRDS', 'MORTALITY', 'OTHER'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { category, description, amount, quantity, unit, date } = body;

  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (category !== undefined) {
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    data.category = category;
  }
  if (description !== undefined) data.description = String(description).trim();
  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });
    }
    data.amount = amount;
  }
  if (quantity !== undefined) data.quantity = quantity;
  if (unit !== undefined) data.unit = unit;
  if (date !== undefined) data.date = new Date(date);

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    category: updated.category,
    description: updated.description,
    amount: Number(updated.amount),
    quantity: updated.quantity ? Number(updated.quantity) : null,
    unit: updated.unit,
    date: updated.date.toISOString(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
