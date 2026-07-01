import Link from 'next/link';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [totalRevenue, totalExpenses, totalCustomers, pendingOrders] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'SALE' } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.customer.count(),
    prisma.order.count({ where: { status: 'Pending' } }),
  ]);

  const revenue = Number(totalRevenue._sum.amount || 0);
  const expenses = Number(totalExpenses._sum.amount || 0);
  const netProfit = revenue - expenses;

  const features = [
    { href: '/admin/profit', icon: '📊', title: 'Profitability', desc: 'Revenue vs expenses & net profit' },
    { href: '/admin/expenses', icon: '💸', title: 'Inputs & Expenses', desc: 'Track feed, drugs, transport, salaries' },
    { href: '/admin/invoices', icon: '🧾', title: 'Invoices', desc: 'Create & send invoices to customers' },
    { href: '/admin/inventory', icon: '📦', title: 'Inventory', desc: 'Manage stock levels and prices' },
    { href: '/admin/customers', icon: '👥', title: 'Customers', desc: 'View balances, orders & transactions' },
    { href: '/admin/orders', icon: '📋', title: 'Orders', desc: 'Manage and track customer orders' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🐔 Church Farm Manager</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track inputs, sales & profitability</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Admin Dashboard →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
          <div className="rounded-xl border p-4 bg-white border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Revenue</p>
            <p className="text-2xl font-bold mt-1 text-green-600">₦{revenue.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border p-4 bg-white border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Expenses</p>
            <p className="text-2xl font-bold mt-1 text-red-600">₦{expenses.toFixed(2)}</p>
          </div>
          <div className={`rounded-xl border p-4 bg-white border-gray-200 shadow-sm`}>
            <p className="text-sm font-medium text-gray-500">Net Profit</p>
            <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netProfit < 0 ? '-' : ''}₦{Math.abs(netProfit).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border p-4 bg-white border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Customers</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{totalCustomers}</p>
          </div>
        </div>

        {/* Feature grid */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Your Farm</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-orange-300 transition-all"
            >
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
            </Link>
          ))}
        </div>

        {/* Pending orders alert */}
        {pendingOrders > 0 && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            ⚠️ You have {pendingOrders} pending order{pendingOrders > 1 ? 's' : ''} to review.{' '}
            <Link href="/admin/orders" className="font-medium underline">View orders →</Link>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        Church Farm Manager · Powered by Next.js & Railway
      </footer>
    </div>
  );
}
