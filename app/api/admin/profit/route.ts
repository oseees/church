import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/profit?from=ISO&to=ISO
// Returns revenue (sales), expenses by category, total expenses, and net profit.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateRange: Record<string, unknown> = {};
  if (from) dateRange.gte = new Date(from);
  if (to) dateRange.lte = new Date(to);

  const saleWhere: Record<string, unknown> = { type: 'SALE' };
  const expenseWhere: Record<string, unknown> = {};
  if (from || to) {
    saleWhere.createdAt = dateRange;
    expenseWhere.date = dateRange;
  }

  const [salesAgg, expenses, expenseByCategory] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: saleWhere }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: expenseWhere }),
    prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: expenseWhere,
    }),
  ]);

  const revenue = Number(salesAgg._sum.amount || 0);
  const totalExpenses = Number(expenses._sum.amount || 0);
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const byCategory = expenseByCategory.map((c) => ({
    category: c.category,
    amount: Number(c._sum.amount || 0),
  }));

  return NextResponse.json({
    from: from || null,
    to: to || null,
    revenue,
    totalExpenses,
    netProfit,
    margin: Number(margin.toFixed(2)),
    isProfit: netProfit >= 0,
    expensesByCategory: byCategory,
  });
}
