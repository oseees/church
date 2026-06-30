'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import AnalysisReport from '@/components/AnalysisReport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AnalysisResult {
  lufs: { mix: number; ref: number; delta: number };
  bands: {
    mix: Record<string, number>;
    ref: Record<string, number>;
    delta: Record<string, number>;
  };
  ai_tips: string;
}

interface ChartDatum {
  frequency: string;
  delta: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ONE_THIRD_OCTAVE_BANDS = [
  20, 31.5, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000,
  10000, 12500, 16000, 20000,
];

function formatFreq(hz: number): string {
  if (hz >= 10000) return `${(hz / 1000).toFixed(0)}k`;
  if (hz >= 1000)
    return `${(hz / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(hz);
}

function toChartData(bands: Record<string, number>): ChartDatum[] {
  return ONE_THIRD_OCTAVE_BANDS.map((fc) => ({
    frequency: formatFreq(fc),
    delta: bands[String(fc)] ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function DropZone({
  file,
  onDrop,
  label,
  accentClass,
}: {
  file: File | null;
  onDrop: (f: File) => void;
  label: string;
  accentClass: string;
}) {
  const onDropCb = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onDrop(accepted[0]);
    },
    [onDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCb,
    accept: { 'audio/*': ['.wav', '.mp3', '.flac', '.aiff', '.m4a', '.ogg'] },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
        p-10 text-center transition-all duration-200 cursor-pointer min-h-[200px]
        ${
          isDragActive
            ? `border-emerald-400 bg-emerald-400/10 scale-[1.02]`
            : file
              ? `${accentClass} border-solid`
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
        }
      `}
    >
      <input {...getInputProps()} />

      {file ? (
        <>
          <div
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${accentClass}`}
          >
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-200">{file.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDrop(null as unknown as File);
            }}
            className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-300"
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-6 w-6 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">
            {isDragActive ? 'Drop it here…' : `Drop ${label}`}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            WAV, MP3, FLAC, AIFF, M4A, OGG
          </p>
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-700 border-t-emerald-400" />
      <p className="text-sm text-zinc-400">Analyzing your tracks…</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for the bar chart
// ---------------------------------------------------------------------------
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { frequency, delta } = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-300">
        <span className="font-semibold">{frequency} Hz</span>
      </p>
      <p className={delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        {delta > 0 ? '+' : ''}
        {delta.toFixed(1)} dB
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function Home() {
  const [mixFile, setMixFile] = useState<File | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = mixFile && refFile && !loading;

  const handleAnalyze = async () => {
    if (!mixFile || !refFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append('mix_file', mixFile);
      form.append('ref_file', refFile);

      const apiBase =
        process.env.NEXT_PUBLIC_ANALYZE_API_URL || 'http://localhost:8000';

      const { data } = await axios.post<AnalysisResult>(
        `${apiBase}/analyze`,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120_000, // 2 min – analysis can take a while
        },
      );

      setResult(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail =
          (err.response?.data as { detail?: string })?.detail ??
          err.message;
        setError(detail);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMixFile(null);
    setRefFile(null);
    setResult(null);
    setError(null);
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              🎛️ AI Reference Track Analyzer
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              Compare your mix to a pro reference — powered by AI
            </p>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              New Analysis
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* ---- Upload Section ---- */}
        {!result && (
          <section className="space-y-8">
            {/* Drop zones */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-zinc-300">
                  🎤 My Mix
                </p>
                <DropZone
                  file={mixFile}
                  onDrop={(f) => setMixFile(f)}
                  label="your mix"
                  accentClass="border-violet-500 bg-violet-500/10"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-zinc-300">
                  🎯 Reference Track
                </p>
                <DropZone
                  file={refFile}
                  onDrop={(f) => setRefFile(f)}
                  label="reference track"
                  accentClass="border-amber-500 bg-amber-500/10"
                />
              </div>
            </div>

            {/* Analyze button / spinner */}
            <div className="flex justify-center">
              {loading ? (
                <Spinner />
              ) : (
                <button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className={`
                    rounded-xl px-10 py-3.5 text-sm font-semibold tracking-wide transition-all
                    ${
                      canAnalyze
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[0.97]'
                        : 'cursor-not-allowed bg-zinc-800 text-zinc-600'
                    }
                  `}
                >
                  🔍 Analyze
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-auto max-w-lg rounded-xl border border-red-800 bg-red-950/50 px-5 py-4 text-center text-sm text-red-300">
                {error}
              </div>
            )}
          </section>
        )}

        {/* ---- Results Section ---- */}
        {result && (
          <section className="space-y-10">
            {/* LUFS summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  { label: 'Your Mix', value: result.lufs.mix, unit: 'LUFS' },
                  { label: 'Reference', value: result.lufs.ref, unit: 'LUFS' },
                  {
                    label: 'Delta',
                    value: result.lufs.delta,
                    unit: 'LUFS',
                    delta: true,
                  },
                ] as const
              ).map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-center backdrop-blur"
                >
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    {card.label}
                  </p>
                  <p
                    className={`mt-2 text-3xl font-bold tabular-nums ${
                      'delta' in card && card.delta
                        ? card.value > 0
                          ? 'text-emerald-400'
                          : card.value < 0
                            ? 'text-red-400'
                            : 'text-zinc-300'
                        : 'text-zinc-100'
                    }`}
                  >
                    {'delta' in card && card.delta && card.value > 0
                      ? '+'
                      : ''}
                    {card.value.toFixed(1)}
                  </p>
                  <p className="text-xs text-zinc-600">{card.unit}</p>
                </div>
              ))}
            </div>

            {/* Frequency Delta Chart */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur">
              <h2 className="mb-1 text-lg font-semibold text-zinc-200">
                📊 Frequency Balance
              </h2>
              <p className="mb-6 text-xs text-zinc-500">
                Delta = your mix – reference (green = louder, red = quieter)
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={toChartData(result.bands.delta)}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="frequency"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#3f3f46' }}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    unit=" dB"
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine
                    y={0}
                    stroke="#52525b"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="delta" radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {toChartData(result.bands.delta).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.delta >= 0 ? '#34d399' : '#f87171'}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Tips Card */}
            <AnalysisReport content={result.ai_tips} />
          </section>
        )}
      </div>
    </main>
  );
}
