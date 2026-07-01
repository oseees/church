import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['FEED', 'FEED_MATERIAL', 'DRUG', 'TRANSPORT', 'SALARY', 'BIRDS', 'MORTALITY', 'OTHER'];
const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);
  const take = Math.min(PAGE_SIZE, Math.max(1, parseInt(searchParams.get('take') || String(PAGE_SIZE), 10) || PAGE_SIZE));

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ]);

  const res = NextResponse.json({
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      quantity: e.quantity ? Number(e.quantity) : null,
      unit: e.unit,
      date: e.date.toISOString(),
    })),
    total,
    skip,
    take,
  });

  // Cache for 30s on CDN/browser, stale-while-revalidate for 5min on slow tablets
  res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=300');

  return res;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { category, description, amount, quantity, unit, date } = body;

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description required' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const created = await prisma.expense.create({
    data: {
      category,
      description: description.trim(),
      amount,
      quantity: quantity ?? null,
      unit: unit ?? null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json({
    id: created.id,
    category: created.category,
    description: created.description,
    amount: Number(created.amount),
    quantity: created.quantity ? Number(created.quantity) : null,
    unit: created.unit,
    date: created.date.toISOString(),
  }, { status: 201 });
}
