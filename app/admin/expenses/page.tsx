'use client';

import { useState, useEffect, useCallback } from 'react';

type ExpenseCategory = 'FEED' | 'FEED_MATERIAL' | 'DRUG' | 'TRANSPORT' | 'SALARY' | 'OTHER';

type Expense = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  quantity: number | null;
  unit: string | null;
  date: string;
};

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'FEED', label: 'Feed', icon: '🌾' },
  { value: 'FEED_MATERIAL', label: 'Feed Material', icon: '🧱' },
  { value: 'DRUG', label: 'Drugs', icon: '💊' },
  { value: 'TRANSPORT', label: 'Transport', icon: '🚚' },
  { value: 'SALARY', label: 'Salary', icon: '👷' },
  { value: 'OTHER', label: 'Other', icon: '📦' },
];

const categoryColor: Record<ExpenseCategory, string> = {
  FEED: 'bg-green-100 text-green-800',
  FEED_MATERIAL: 'bg-lime-100 text-lime-800',
  DRUG: 'bg-purple-100 text-purple-800',
  TRANSPORT: 'bg-blue-100 text-blue-800',
  SALARY: 'bg-orange-100 text-orange-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [message, setMessage] = useState('');

  // form state
  const [category, setCategory] = useState<ExpenseCategory>('FEED');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchExpenses = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== 'ALL') params.set('category', filter);
    const res = await fetch(`/api/admin/expenses?${params.toString()}`);
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim() || isNaN(amt) || amt <= 0) {
      setMessage('❌ Enter a description and a valid positive amount.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        description: description.trim(),
        amount: amt,
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        date,
      }),
    });
    if (res.ok) {
      setDescription('');
      setAmount('');
      setQuantity('');
      setUnit('');
      await fetchExpenses();
      setMessage('✅ Expense recorded.');
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(`❌ ${err.error || 'Failed to record expense.'}`);
    }
    setSubmitting(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const res = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💸 Farm Inputs & Expenses</h1>
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {message}
        </div>
      )}

      {/* Record form */}
      <form onSubmit={submit} className="bg-white rounded-xl shadow p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 50 bags growers mash"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₦)</label>
          <input
            type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
          <input
            type="number" min="0" step="0.01" value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="optional"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
          <input
            value={unit} onChange={(e) => setUnit(e.target.value)}
            placeholder="bags, kg, litres..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit" disabled={submitting}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : '+ Record Expense'}
          </button>
        </div>
      </form>

      {/* Filter + total */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === c.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Total: ₦{total.toFixed(2)}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {expenses.length === 0 && (
          <p className="text-gray-500 text-center py-8 bg-white rounded-xl shadow">No expenses recorded yet.</p>
        )}
        {expenses.map((e) => (
          <div key={e.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${categoryColor[e.category]}`}>
                {e.category.replace('_', ' ')}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{e.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(e.date).toLocaleDateString()}
                  {e.quantity ? ` · ${e.quantity}${e.unit ? ' ' + e.unit : ''}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">₦{e.amount.toFixed(2)}</span>
              <button
                onClick={() => remove(e.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
