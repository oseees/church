'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminStatementsPage() {
  const [period, setPeriod] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [lastOrderAfter, setLastOrderAfter] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ queuedCount?: number; estimatedCompletion?: string; error?: string } | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setPreviewUrl(null);

    const periodPayload = period === 'custom'
      ? { start: customStart, end: customEnd }
      : period;

    const res = await fetch('/api/statements/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: previewCustomer || '__test__',
        period: periodPayload,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setPreviewUrl(data.pdfUrl);
    } else {
      setResult({ error: 'Preview generation failed' });
    }
    setLoading(false);
  };

  const handleBulkSend = async () => {
    setLoading(true);
    setResult(null);

    const segment: Record<string, unknown> = {};
    if (minBalance) segment.minBalance = parseFloat(minBalance);
    if (maxBalance) segment.maxBalance = parseFloat(maxBalance);
    if (lastOrderAfter) segment.lastOrderAfter = lastOrderAfter;
    if (minOrders) segment.minOrders = parseInt(minOrders);

    const res = await fetch('/api/statements/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, segment: Object.keys(segment).length ? segment : undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    } else {
      const err = await res.json();
      setResult({ error: err.error || 'Bulk send failed' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Admin
        </Link>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Period</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          {['monthly', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'monthly' ? 'This Month' : 'Custom Range'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap gap-4">
            <label className="flex-1 min-w-[160px]">
              <span className="text-xs text-gray-500 block mb-1">Start Date</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label className="flex-1 min-w-[160px]">
              <span className="text-xs text-gray-500 block mb-1">End Date</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* Segment Filters */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Segment (optional)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <span className="text-xs text-gray-500 block mb-1">Min Balance (₦)</span>
            <input
              type="number"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <label>
            <span className="text-xs text-gray-500 block mb-1">Max Balance (₦)</span>
            <input
              type="number"
              value={maxBalance}
              onChange={(e) => setMaxBalance(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <label>
            <span className="text-xs text-gray-500 block mb-1">Last Order After</span>
            <input
              type="date"
              value={lastOrderAfter}
              onChange={(e) => setLastOrderAfter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <label>
            <span className="text-xs text-gray-500 block mb-1">Min Orders</span>
            <input
              type="number"
              value={minOrders}
              onChange={(e) => setMinOrders(e.target.value)}
              placeholder="e.g. 3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Preview</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex-1 min-w-[200px]">
            <span className="text-xs text-gray-500 block mb-1">Test Customer ID</span>
            <input
              type="text"
              value={previewCustomer}
              onChange={(e) => setPreviewCustomer(e.target.value)}
              placeholder="Customer ID for preview"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            onClick={handlePreview}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Generating...' : 'Preview PDF'}
          </button>
        </div>
        {previewUrl && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 font-medium hover:underline break-all"
            >
              📄 Open Preview PDF
            </a>
          </div>
        )}
      </div>

      {/* Bulk Send */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Bulk Send</h2>
        <p className="text-sm text-gray-500 mb-4">
          Generate and send statements to all matching customers. PDFs are queued and
          processed hourly via the background worker.
        </p>
        <button
          onClick={handleBulkSend}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
        >
          {loading ? 'Enqueuing...' : 'Send to Customers'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            {result.error ? (
              <p className="text-sm text-red-700">{result.error}</p>
            ) : (
              <div className="space-y-1 text-sm text-green-800">
                <p className="font-semibold">✅ {result.queuedCount} statements queued</p>
                <p className="text-xs text-green-600">
                  Estimated completion: {result.estimatedCompletion ? new Date(result.estimatedCompletion).toLocaleTimeString() : 'N/A'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}