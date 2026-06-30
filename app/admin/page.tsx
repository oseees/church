import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import AdminOrdersClient from './orders/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [totalRevenue, pendingOrders, lowStockCount, totalCustomers, orders, totalExpenses, unpaidInvoices] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'SALE' } }),
    prisma.order.count({ where: { status: 'Pending' } }),
    prisma.product.count({ where: { stock: { lt: 10 } } }),
    prisma.customer.count(),
    prisma.order.findMany({
      include: { customer: { select: { phone: true, name: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: { in: ['SENT', 'OVERDUE'] } } }),
  ]);

  const revenue = Number(totalRevenue._sum.amount || 0);
  const expenses = Number(totalExpenses._sum.amount || 0);
  const netProfit = revenue - expenses;
  const outstanding = Number(unpaidInvoices._sum.total || 0);

  const cards = [
    { label: 'Total Revenue', value: `₦${revenue.toFixed(2)}`, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Total Expenses', value: `₦${expenses.toFixed(2)}`, color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'Net Profit', value: `${netProfit < 0 ? '-' : ''}₦${Math.abs(netProfit).toFixed(2)}`, color: netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200' },
    { label: 'Outstanding Invoices', value: `₦${outstanding.toFixed(2)}`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Pending Orders', value: pendingOrders, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'Low Stock Items', value: lowStockCount, color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'Total Customers', value: totalCustomers, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ];

  const serializedOrders = orders.map((o) => ({
    id: o.id,
    customer: o.customer,
    product: o.product,
    quantity: o.quantity,
    total: Number(o.total),
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-sm font-medium opacity-75">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <Link href="/admin/profit" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900">📊 Profitability</h2>
          <p className="text-sm text-gray-500 mt-1">Revenue vs expenses & net profit</p>
        </Link>
        <Link href="/admin/expenses" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900">💸 Inputs & Expenses</h2>
          <p className="text-sm text-gray-500 mt-1">Track feed, drugs, transport, salaries</p>
        </Link>
        <Link href="/admin/invoices" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900">🧾 Invoices</h2>
          <p className="text-sm text-gray-500 mt-1">Create & send invoices to customers</p>
        </Link>
        <Link href="/admin/inventory" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900">📦 Inventory</h2>
          <p className="text-sm text-gray-500 mt-1">Manage stock levels and prices</p>
        </Link>
        <Link href="/admin/customers" className="block bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900">👥 Customers</h2>
          <p className="text-sm text-gray-500 mt-1">View balances, orders & transaction history</p>
        </Link>
      </div>

      <AdminOrdersClient orders={serializedOrders} />
    </div>
  );
}
