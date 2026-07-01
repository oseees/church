'use client';

import { useState, useEffect } from 'react';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  amount: number;
};

export type Invoice = {
  id: string;
  number: string;
  customer: { name: string; phone: string };
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  tax: number;
  total: number;
  totalCost: number;
  status: InvoiceStatus;
  notes: string | null;
  items: InvoiceItem[];
};

type Customer = { id: string; name: string; phone: string };

const STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

const statusColor: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-200 text-gray-500 line-through',
};

export default function InvoiceClient({
  initialInvoices,
  customers,
}: {
  initialInvoices: Invoice[];
  customers: Customer[];
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const fetchInvoices = () => {
    fetch('/api/admin/invoices', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((fresh: Invoice[]) => {
        setInvoices(fresh);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Always hydrate from the live API on mount — ignore server-rendered
  // initialInvoices because they may be stale from SW cache.
  useEffect(() => {
    fetchInvoices();
  }, []);

  // form
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, cost: 0, amount: 0 },
  ]);

  const updateItem = (i: number, field: keyof InvoiceItem, value: string) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it };
        if (field === 'description') next.description = value;
        else if (field === 'quantity' || field === 'unitPrice' || field === 'cost') {
          next[field] = parseFloat(value) || 0;
          next.amount = Number((next.quantity * next.unitPrice).toFixed(2));
        }
        return next;
      })
    );
  };

  const addItem = () =>
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, cost: 0, amount: 0 }]);
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const totalCost = items.reduce((s, it) => s + (it.cost || 0), 0);
  const taxAmount = parseFloat(tax) || 0;
  const total = subtotal + taxAmount;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setMessage('❌ Select a customer.');
      return;
    }
    if (items.length === 0 || items.some((it) => !it.description.trim() || it.quantity <= 0)) {
      setMessage('❌ Add at least one valid line item.');
      return;
    }
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          dueDate: dueDate || null,
          tax: taxAmount,
          notes: notes || null,
          items: items.map((it) => ({
            description: it.description.trim(),
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            cost: it.cost || 0,
          })),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setCustomerId('');
        setDueDate('');
        setTax('');
        setNotes('');
        setItems([{ description: '', quantity: 1, unitPrice: 0, cost: 0, amount: 0 }]);
        setMessage('✅ Invoice created.');
        // Re-fetch from server to guarantee the list matches the DB
        fetchInvoices();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(`❌ ${err.error || 'Failed to create invoice.'}`);
      }
    } catch {
      setMessage('❌ Network error. Please try again.');
    }
  };

  const updateStatus = async (id: string, status: InvoiceStatus) => {
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch {
      // silent fail for status updates
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading invoices...</div>
    );
  }

  return (
    <>
      {message && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {message}
        </div>
      )}

      <button
        onClick={() => setShowForm((s) => !s)}
        className="mb-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
      >
        {showForm ? 'Cancel' : '+ New Invoice'}
      </button>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
              <input
                type="date" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tax (₦)</label>
              <input
                type="number" min="0" step="0.01" value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">Line Items</label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="col-span-4 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="number" min="0" step="0.01" value={it.quantity || ''}
                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="col-span-1 border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="number" min="0" step="0.01" value={it.unitPrice || ''}
                    onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                    placeholder="Price"
                    className="col-span-2 border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="number" min="0" step="0.01" value={it.cost || ''}
                    onChange={(e) => updateItem(i, 'cost', e.target.value)}
                    placeholder="Cost"
                    className="col-span-2 border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="col-span-2 text-sm text-gray-700 text-right">₦{it.amount.toFixed(2)}</span>
                  <button
                    type="button" onClick={() => removeItem(i)}
                    className="col-span-1 text-xs text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={addItem}
              className="mt-2 text-sm text-orange-600 hover:text-orange-800"
            >
              + Add item
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes for the customer"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm text-gray-600 space-y-1">
              <p>Subtotal: ₦{subtotal.toFixed(2)}</p>
              <p>Tax: ₦{taxAmount.toFixed(2)}</p>
              <p className="text-base font-bold text-gray-900">Total: ₦{total.toFixed(2)}</p>
              {totalCost > 0 && (
                <p className="text-xs text-gray-500">
                  Cost: ₦{totalCost.toFixed(2)} · Profit: <span className={total - totalCost >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>₦{(total - totalCost).toFixed(2)}</span>
                </p>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Create Invoice
            </button>
          </div>
        </form>
      )}

      {/* Invoice list */}
      <div className="space-y-2">
        {invoices.length === 0 && (
          <p className="text-gray-500 text-center py-8 bg-white rounded-xl shadow">No invoices yet.</p>
        )}
        {invoices.map((inv) => {
          const profit = inv.total - (inv.totalCost || 0);
          const showProfit = inv.totalCost > 0;
          return (
            <div key={inv.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">{inv.number}</span>
                    <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${statusColor[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{inv.customer.name} · {inv.customer.phone}</p>
                  <p className="text-xs text-gray-500">
                    Issued {new Date(inv.issueDate).toLocaleDateString()}
                    {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                    {' · '}{inv.items.length} item(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">₦{inv.total.toFixed(2)}</span>
                    {inv.status === 'PAID' && showProfit && (
                      <p className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '📈 Profit' : '📉 Loss'}: ₦{Math.abs(profit).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <select
                    value={inv.status}
                    onChange={(e) => updateStatus(inv.id, e.target.value as InvoiceStatus)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-900 focus:ring-2 focus:ring-orange-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <a
                    href={`/api/admin/invoices/${inv.id}/pdf`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    PDF
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
