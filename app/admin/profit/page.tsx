import prisma from '@/lib/prisma';
import ProfitRangeSelector from './ProfitClient';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  FEED: '🌾 Feed',
  FEED_MATERIAL: '🧱 Feed Material',
  DRUG: '💊 Drugs',
  TRANSPORT: '🚚 Transport',
  SALARY: '👷 Salary',
  OTHER: '📦 Other',
};

function detectPreset(from: string, to: string): string {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (to !== todayStr) return '';
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  if (from === monthStart) return 'month';
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), qStartMonth, 1).toISOString().slice(0, 10);
  if (from === quarterStart) return 'quarter';
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  if (from === yearStart) return 'year';
  if (from === '2000-01-01') return 'all';
  return '';
}

export default async function AdminProfitPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  // Default to current month if no range provided
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const fromStr = searchParams.from || monthStart;
  const toStr = searchParams.to || todayStr;

  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  toDate.setHours(23, 59, 59, 999);

  const [salesAgg, expensesAgg, expenseByCategory] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'SALE', createdAt: { gte: fromDate, lte: toDate } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: fromDate, lte: toDate } },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { date: { gte: fromDate, lte: toDate } },
    }),
  ]);

  const revenue = Number(salesAgg._sum.amount || 0);
  const totalExpenses = Number(expensesAgg._sum.amount || 0);
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0;
  const isProfit = netProfit >= 0;

  const byCategory = expenseByCategory
    .map((c) => ({ category: c.category, amount: Number(c._sum.amount || 0) }))
    .sort((a, b) => b.amount - a.amount);

  const maxCategory = Math.max(...byCategory.map((c) => c.amount), 1);
  const currentPreset = detectPreset(fromStr, toStr);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 Profitability</h1>
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
      </div>

      <ProfitRangeSelector current={currentPreset} />

      <div className="text-xs text-gray-400 mb-6">
        {fromStr} → {toStr}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="rounded-xl border p-4 bg-green-50 text-green-700 border-green-200">
          <p className="text-sm font-medium opacity-75">Revenue (Sales)</p>
          <p className="text-2xl font-bold mt-1">₦{revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border p-4 bg-red-50 text-red-700 border-red-200">
          <p className="text-sm font-medium opacity-75">Total Expenses</p>
          <p className="text-2xl font-bold mt-1">₦{totalExpenses.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${isProfit ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          <p className="text-sm font-medium opacity-75">Net Profit</p>
          <p className="text-2xl font-bold mt-1">
            {isProfit ? '' : '-'}₦{Math.abs(netProfit).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border p-4 bg-blue-50 text-blue-700 border-blue-200">
          <p className="text-sm font-medium opacity-75">Margin</p>
          <p className="text-2xl font-bold mt-1">{margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Verdict banner */}
      <div className={`rounded-xl p-4 mb-8 text-center font-semibold ${isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {isProfit
          ? `✅ You are making a profit of ₦${netProfit.toFixed(2)} this period.`
          : `⚠️ You are running at a loss of ₦${Math.abs(netProfit).toFixed(2)} this period.`}
      </div>

      {/* Expenses by category */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h2>
        {byCategory.length > 0 ? (
          <div className="space-y-3">
            {byCategory.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{CATEGORY_LABELS[c.category] || c.category}</span>
                  <span className="font-medium text-gray-900">₦{c.amount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-orange-500 h-2.5 rounded-full"
                    style={{ width: `${(c.amount / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No expenses recorded in this period.</p>
        )}
      </div>
    </div>
  );
}
