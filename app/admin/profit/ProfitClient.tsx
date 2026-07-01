'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function ProfitRangeSelector({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const select = (preset: string) => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let from = '';
    if (preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (preset === 'quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qStartMonth, 1).toISOString().slice(0, 10);
    } else if (preset === 'year') {
      from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    } else if (preset === 'all') {
      from = '2000-01-01';
    }
    const q = new URLSearchParams(params.toString());
    q.set('from', from);
    q.set('to', to);
    router.push(`/admin/profit?${q.toString()}`);
  };

  const presets = [
    { v: 'month', l: 'This Month' },
    { v: 'quarter', l: 'This Quarter' },
    { v: 'year', l: 'This Year' },
    { v: 'all', l: 'All Time' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {presets.map((opt) => (
        <button
          key={opt.v}
          onClick={() => select(opt.v)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${current === opt.v ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          {opt.l}
        </button>
      ))}
    </div>
  );
}
