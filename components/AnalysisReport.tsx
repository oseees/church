'use client';

import { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AnalysisReportProps {
  content: string;
}

type LiVariant = 'data' | 'fix' | 'why' | null;
type H3Variant = 'loudness' | 'moves' | 'protip' | null;
type MoveParagraphVariant = 'move-title' | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively extract raw text from React children (string | number | element | array). */
function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (React.isValidElement(children)) {
    const childProps = children.props as { children?: React.ReactNode };
    return extractText(childProps.children);
  }
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  return '';
}

// ---------------------------------------------------------------------------
// Style maps (static Tailwind classes only — no dynamic arbitrary variants)
// ---------------------------------------------------------------------------

const H3_VARIANT_STYLES: Record<NonNullable<H3Variant>, string> = {
  loudness: 'border-l-blue-500 bg-blue-500/5 shadow-blue-500/5',
  moves: 'border-l-purple-500 bg-purple-500/5 shadow-purple-500/5',
  protip: 'border-l-amber-500 bg-amber-500/5 shadow-amber-500/5',
};

/** Maps LiVariant → static CSS class (defined in globals.css) for strong coloring. */
const LI_VARIANT_CSS_CLASS: Record<NonNullable<LiVariant>, string> = {
  data: 'analysis-li-data',
  fix: 'analysis-li-fix',
  why: 'analysis-li-why',
};

const LI_VARIANT_BORDER: Record<NonNullable<LiVariant>, string> = {
  data: 'border-l-amber-500',
  fix: 'border-l-emerald-500',
  why: 'border-l-sky-500',
};

const LI_VARIANT_BG: Record<NonNullable<LiVariant>, string> = {
  data: 'bg-amber-500/5',
  fix: 'bg-emerald-500/5',
  why: 'bg-sky-500/5',
};

// ---------------------------------------------------------------------------
// Custom react-markdown components
// ---------------------------------------------------------------------------

/** Detect which H3 variant to apply based on header text. */
function detectH3Variant(children: React.ReactNode): H3Variant {
  const text = extractText(children);
  if (text.includes('Loudness') || text.includes('Dynamics')) return 'loudness';
  if (text.includes('Actionable') || text.includes('EQ') || text.includes('Moves')) return 'moves';
  if (text.includes('Pro Tip') || text.includes('Final')) return 'protip';
  return null;
}

/** Detect which list-item variant based on the first <strong> child text. */
function detectLiVariant(children: React.ReactNode): LiVariant {
  const childrenArray = React.Children.toArray(children);
  if (childrenArray.length === 0) return null;
  const first = childrenArray[0];
  if (!React.isValidElement(first)) return null;
  // react-markdown renders **text** as <strong>
  if (first.type !== 'strong') return null;
  const text = extractText(first.props.children);
  if (text.includes('The Data:')) return 'data';
  if (text.includes('The Fix:')) return 'fix';
  if (text.includes("The 'Why':") || text.includes('The "Why":') || text.includes('The Why:')) return 'why';
  return null;
}

/** Detect a move-title paragraph: a <p> whose only child is a <strong> starting with a digit. */
function detectMoveParagraph(children: React.ReactNode): MoveParagraphVariant {
  const childrenArray = React.Children.toArray(children);
  if (childrenArray.length !== 1) return null;
  const only = childrenArray[0];
  if (!React.isValidElement(only)) return null;
  if (only.type !== 'strong') return null;
  const text = extractText(only.props.children);
  if (/^\d+\./.test(text.trimStart())) return 'move-title';
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components used as react-markdown overrides
// ---------------------------------------------------------------------------

function CustomH3({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
  const variant = detectH3Variant(children);
  const accent = variant ? H3_VARIANT_STYLES[variant] : 'border-l-zinc-700 bg-zinc-900/40';

  return (
    <h3
      className={`mt-10 mb-5 border-l-[3px] rounded-r-lg py-3 pl-4 pr-5 text-lg font-semibold tracking-tight text-zinc-100 shadow-sm ${accent}`}
      {...props}
    >
      {children}
    </h3>
  );
}

function CustomLi({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) {
  const variant = detectLiVariant(children);

  if (!variant) {
    return (
      <li className="my-1.5 text-sm leading-relaxed text-zinc-300 marker:text-zinc-600" {...props}>
        {children}
      </li>
    );
  }

  const cssClass = LI_VARIANT_CSS_CLASS[variant];
  const border = LI_VARIANT_BORDER[variant];
  const bg = LI_VARIANT_BG[variant];

  return (
    <li
      className={`my-3 rounded-r-lg border-l-[3px] py-3 pl-4 pr-4 text-sm leading-relaxed text-zinc-300 ${border} ${bg} ${cssClass}`}
      {...props}
    >
      {children}
    </li>
  );
}

function CustomStrong({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) {
  // The li-level CSS class (analysis-li-*) handles the color for list items.
  // For move titles and inline bold in prose, use a clean near-white.
  return (
    <strong className="font-semibold text-zinc-100" {...props}>
      {children}
    </strong>
  );
}

function CustomH1({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) {
  return (
    <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-50" {...props}>
      {children}
    </h1>
  );
}

function CustomHr(props: React.ComponentPropsWithoutRef<'hr'>) {
  return <hr className="my-8 border-zinc-800" {...props} />;
}

function CustomP({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  const isMoveTitle = detectMoveParagraph(children);

  if (isMoveTitle === 'move-title') {
    return (
      <p
        className="mt-8 mb-3 border-l-[3px] border-l-violet-500/70 py-1.5 pl-4 text-base font-semibold tracking-tight text-zinc-100"
        {...props}
      >
        {children}
      </p>
    );
  }

  return (
    <p className="my-2 text-sm leading-relaxed text-zinc-300" {...props}>
      {children}
    </p>
  );
}

function CustomUl({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul className="my-2 ml-1 list-inside space-y-1" {...props}>
      {children}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AnalysisReport({ content }: AnalysisReportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // silent fail
      }
      document.body.removeChild(textarea);
    }
  }, [content]);

  const markdownComponents = useMemo(
    () => ({
      h1: CustomH1,
      h3: CustomH3,
      hr: CustomHr,
      p: CustomP,
      ul: CustomUl,
      li: CustomLi,
      strong: CustomStrong,
    }),
    [],
  );

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur">
      {/* ---- Header bar with Copy button ---- */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <svg
              className="h-4 w-4 text-emerald-400"
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
          <span className="text-sm font-medium tracking-wide text-zinc-300">
            Analysis Report
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`
            inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium
            transition-all duration-200 active:scale-[0.97]
            ${
              copied
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'
            }
          `}
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Full Report
            </>
          )}
        </button>
      </div>

      {/* ---- Report body ---- */}
      <div className="px-6 py-6">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
