'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface FrequencyBand {
  /** Raw frequency in Hz (e.g. 1000, 4000) */
  frequency_hz: number;
  /** Short producer-friendly label (e.g. "50", "1k", "10k") */
  label: string;
  /** The dB delta (mix minus reference) */
  delta_db: number;
}

export interface FrequencySpectrumChartProps {
  /** 29 interpolated ISO centre frequencies in Hz */
  frequency_bands_hz: number[];
  /** 29 corresponding spectrum delta values in dB */
  spectrum_delta_db: number[];
  /** Optional additional Tailwind classes for the wrapper */
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Turns a Hz value into a compact label audio producers expect:
 *   < 1000 Hz  → "50", "100", "250"
 *   ≥ 1000 Hz  → "1k", "2.5k", "10k"
 *   ≥ 10000 Hz → "10k", "12.5k", "20k"
 */
function formatFrequencyLabel(hz: number): string {
  if (hz >= 1000) {
    const khz = hz / 1000;
    // Drop unnecessary ".0" but keep ".5"
    return khz % 1 === 0 ? `${khz}k` : `${khz.toFixed(1)}k`;
  }
  return `${hz}`;
}

/**
 * Builds an rgba() fill colour:
 *   delta > 0 → green (mix is louder)
 *   delta < 0 → red   (mix is quieter)
 *   delta = 0 → grey
 * Opacity scales with |delta| relative to the data-set's max absolute delta.
 */
function barFill(delta: number, maxAbsDelta: number): string {
  // Clamp intensity between 0.3 (faint) and 1.0 (fully saturated)
  const intensity = 0.3 + 0.7 * (Math.abs(delta) / Math.max(maxAbsDelta, 0.01));

  if (delta > 0) {
    return `rgba(34, 197, 94, ${intensity.toFixed(2)})`; // tailwind green-500
  }
  if (delta < 0) {
    return `rgba(239, 68, 68, ${intensity.toFixed(2)})`; // tailwind red-500
  }
  return 'rgba(156, 163, 175, 0.5)'; // gray-400 at fixed 50 % opacity
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * Custom tooltip showing the exact frequency and dB difference.
 * Styled for a dark-mode aesthetic with Tailwind.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FrequencyBand }[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const { frequency_hz, delta_db } = payload[0].payload;
  const freqLabel =
    frequency_hz >= 1000
      ? `${(frequency_hz / 1000).toFixed(frequency_hz % 1000 === 0 ? 0 : 1)} kHz`
      : `${frequency_hz} Hz`;

  const sign = delta_db > 0 ? '+' : '';

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wide text-gray-400">{freqLabel}</p>
      <p
        className={`text-sm font-semibold tabular-nums ${
          delta_db > 0
            ? 'text-green-400'
            : delta_db < 0
            ? 'text-red-400'
            : 'text-gray-400'
        }`}
      >
        {sign}
        {delta_db.toFixed(1)} dB
      </p>
    </div>
  );
}

/**
 * Tick formatter for the X-axis: only renders labels at the 9 most
 * relevant frequencies so the axis stays readable for producers.
 */
const KEY_FREQUENCIES = new Set([
  50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000,
]);

// ── Main component ──────────────────────────────────────────────────────────

export default function FrequencySpectrumChart({
  frequency_bands_hz,
  spectrum_delta_db,
  className = '',
}: FrequencySpectrumChartProps) {
  // Build chart data + compute the global max-abs-delta for opacity scaling
  const { chartData, maxAbsDelta, yDomain } = useMemo(() => {
    const data: FrequencyBand[] = frequency_bands_hz.map((hz, i) => ({
      frequency_hz: hz,
      label: formatFrequencyLabel(hz),
      delta_db: spectrum_delta_db[i] ?? 0,
    }));

    const absDeltas = data.map((d) => Math.abs(d.delta_db));
    const maxAbs = Math.max(...absDeltas, 0.01);

    // Dynamic Y domain with ~20 % headroom
    const maxD = Math.max(...spectrum_delta_db);
    const minD = Math.min(...spectrum_delta_db);
    const pad = Math.max(Math.abs(maxD), Math.abs(minD)) * 0.25;
    const yMin = Math.floor(Math.min(minD - pad, -pad));
    const yMax = Math.ceil(Math.max(maxD + pad, pad));

    return { chartData: data, maxAbsDelta: maxAbs, yDomain: [yMin, yMax] as [number, number] };
  }, [frequency_bands_hz, spectrum_delta_db]);

  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-950 p-5 ${className}`}
    >
      {/* Title */}
      <h3 className="mb-4 text-sm font-medium text-gray-300">
        Frequency Spectrum Delta — Mix vs Reference
      </h3>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
        >
          {/* Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />

          {/* X Axis */}
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#4B5563' }}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            interval={0}
            tickFormatter={(_value: string, index: number) => {
              const freq = chartData[index]?.frequency_hz;
              return freq && KEY_FREQUENCIES.has(freq)
                ? chartData[index].label
                : '';
            }}
          />

          {/* Y Axis */}
          <YAxis
            tickLine={false}
            axisLine={{ stroke: '#4B5563' }}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            domain={yDomain}
            tickFormatter={(value: number) =>
              `${value > 0 ? '+' : ''}${value} dB`
            }
            width={55}
          />

          {/* Tooltip */}
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          />

          {/* Dashed zero-reference line */}
          <ReferenceLine
            y={0}
            stroke="#6B7280"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />

          {/* Bars */}
          <Bar dataKey="delta_db" radius={[2, 2, 0, 0]} maxBarSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={barFill(entry.delta_db, maxAbsDelta)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
          Mix louder than reference
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          Mix quieter than reference
        </div>
        <div className="flex items-center gap-1.5">
          <span className="select-none text-gray-500">— —</span>
          Reference level (0 dB)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-300 opacity-50" />
          Faint colour = small delta
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-600" />
          Deep colour = large delta
        </div>
      </div>
    </div>
  );
}
