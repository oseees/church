import prisma from '@/lib/prisma';
import InvoiceClient, { type Invoice } from './InvoiceClient';

export const dynamic = 'force-dynamic';

export default async function AdminInvoicesPage() {
  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        customer: { select: { name: true, phone: true } },
        items: true,
      },
      orderBy: { issueDate: 'desc' },
      take: 200,
    }),
    prisma.customer.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  const serializedInvoices: Invoice[] = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    customer: inv.customer,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
    subtotal: Number(inv.subtotal),
    tax: Number(inv.tax),
    total: Number(inv.total),
    status: inv.status,
    notes: inv.notes,
    items: inv.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      amount: Number(it.amount),
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🧾 Invoices</h1>
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
      </div>

      <InvoiceClient initialInvoices={serializedInvoices} customers={customers} />
    </div>
  );
}
