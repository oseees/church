'use client';

import { useState, useEffect, useCallback } from 'react';

type CategoryRow = { category: string; amount: number };

type ProfitData = {
  from: string | null;
  to: string | null;
  revenue: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
  isProfit: boolean;
  expensesByCategory: CategoryRow[];
};

const CATEGORY_LABELS: Record<string, string> = {
  FEED: '🌾 Feed',
  FEED_MATERIAL: '🧱 Feed Material',
  DRUG: '💊 Drugs',
  TRANSPORT: '🚚 Transport',
  SALARY: '👷 Salary',
  OTHER: '📦 Other',
};

function rangePreset(value: string): { from: string; to: string } | null {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (value === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { from, to };
  }
  if (value === 'quarter') {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), qStartMonth, 1).toISOString().slice(0, 10);
    return { from, to };
  }
  if (value === 'year') {
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    return { from, to };
  }
  if (value === 'all') {
    return { from: '2000-01-01', to };
  }
  return null;
}

export default function AdminProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchProfit = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/admin/profit?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    const r = rangePreset(preset);
    if (r) {
      setFrom(r.from);
      setTo(r.to);
    }
  }, [preset]);

  useEffect(() => {
    if (from && to) fetchProfit();
  }, [from, to, fetchProfit]);

  const maxCategory = data
    ? Math.max(...data.expensesByCategory.map((c) => c.amount), 1)
    : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">Loading profitability...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 Profitability</h1>
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Back to Admin</a>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { v: 'month', l: 'This Month' },
          { v: 'quarter', l: 'This Quarter' },
          { v: 'year', l: 'This Year' },
          { v: 'all', l: 'All Time' },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setPreset(opt.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${preset === opt.v ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {opt.l}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">
          {from && to ? `${from} → ${to}` : ''}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="rounded-xl border p-4 bg-green-50 text-green-700 border-green-200">
          <p className="text-sm font-medium opacity-75">Revenue (Sales)</p>
          <p className="text-2xl font-bold mt-1">₦{data?.revenue.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className="rounded-xl border p-4 bg-red-50 text-red-700 border-red-200">
          <p className="text-sm font-medium opacity-75">Total Expenses</p>
          <p className="text-2xl font-bold mt-1">₦{data?.totalExpenses.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className={`rounded-xl border p-4 ${data?.isProfit ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          <p className="text-sm font-medium opacity-75">Net Profit</p>
          <p className="text-2xl font-bold mt-1">
            {data?.isProfit ? '' : '-'}₦{Math.abs(data?.netProfit ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border p-4 bg-blue-50 text-blue-700 border-blue-200">
          <p className="text-sm font-medium opacity-75">Margin</p>
          <p className="text-2xl font-bold mt-1">{data?.margin.toFixed(1) ?? '0.0'}%</p>
        </div>
      </div>

      {/* Verdict banner */}
      <div className={`rounded-xl p-4 mb-8 text-center font-semibold ${data?.isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {data?.isProfit
          ? `✅ You are making a profit of ₦${data.netProfit.toFixed(2)} this period.`
          : `⚠️ You are running at a loss of ₦${Math.abs(data?.netProfit ?? 0).toFixed(2)} this period.`}
      </div>

      {/* Expenses by category */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h2>
        {data && data.expensesByCategory.length > 0 ? (
          <div className="space-y-3">
            {data.expensesByCategory
              .sort((a, b) => b.amount - a.amount)
              .map((c) => (
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
