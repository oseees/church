import prisma from '@/lib/prisma';
import ExpenseClient, { type Expense } from './ExpenseClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function AdminExpensesPage() {
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
      take: PAGE_SIZE,
    }),
    prisma.expense.count(),
  ]);

  const serialized: Expense[] = expenses.map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    quantity: e.quantity ? Number(e.quantity) : null,
    unit: e.unit,
    date: e.date.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💸 Farm Inputs & Expenses</h1>
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
      </div>

      <ExpenseClient initialExpenses={serialized} initialTotal={total} />
    </div>
  );
}
