"use client";

import { useSyncExternalStore } from "react";

/**
 * Recharts cannot read CSS variables, so we resolve them ourselves and pass
 * real colour strings in as props. Re-reads whenever the theme changes.
 */
export type ChartColors = {
  series: string[];
  unknown: string;
  grid: string;
  axis: string;
  surface: string;
  border: string;
  foreground: string;
  muted: string;
  good: string;
  warn: string;
  bad: string;
  info: string;
  neutral: string;
  accent: string;
};

const FALLBACK: ChartColors = {
  series: ["#2563eb", "#b45309", "#0d9488", "#9a3412", "#0369a1", "#4d7c0f", "#7c3aed", "#be185d"],
  unknown: "#94a3b8",
  grid: "#e2e6ec",
  axis: "#6b7480",
  surface: "#ffffff",
  border: "#d9dee6",
  foreground: "#14181f",
  muted: "#5b6573",
  good: "#15803d",
  warn: "#a16207",
  bad: "#b91c1c",
  info: "#0e7490",
  neutral: "#4b5563",
  accent: "#2563eb",
};

function read(style: CSSStyleDeclaration, name: string, fallback: string) {
  const v = style.getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * The colours the charts are painted with.
 *
 * The tokens live in CSS, not in JavaScript, so they have to be read off the
 * page. That makes them an external system, and `useSyncExternalStore` is
 * React's tool for reading one. The older way, setting state inside an effect,
 * renders the whole tree a second time on every load.
 *
 * A MutationObserver watches the <html> element, because that is where
 * next-themes writes the light/dark class. When it changes, the cache is
 * dropped and every chart on the page repaints in the new colours.
 */

let cache: ChartColors | null = null;
const listeners = new Set<() => void>();

/**
 * ONE observer for the whole page, not one per chart.
 *
 * Every chart subscribes, and each observer would tell every listener, so N
 * charts on a page would mean N observers each waking N listeners on a single
 * theme change. The answer would still be right, just worked out N times over.
 * One shared observer, started with the first chart and stopped with the last.
 */
let observer: MutationObserver | null = null;

function subscribe(onChange: () => void) {
  listeners.add(onChange);

  if (!observer) {
    observer = new MutationObserver(() => {
      cache = null; // the theme moved, so the colours have to be read again
      for (const l of listeners) l();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
  }

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

/**
 * Read every token off the page, once, and keep the answer.
 *
 * The SAME object has to come back every time until the theme changes, or
 * React sees a new value on every check and re-renders for ever.
 */
function getSnapshot(): ChartColors {
  if (cache) return cache;
  const s = getComputedStyle(document.documentElement);
  cache = {
    series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
      read(s, `--chart-${i}`, FALLBACK.series[i - 1]),
    ),
    unknown: read(s, "--chart-unknown", FALLBACK.unknown),
    grid: read(s, "--grid", FALLBACK.grid),
    axis: read(s, "--axis", FALLBACK.axis),
    surface: read(s, "--surface", FALLBACK.surface),
    border: read(s, "--border", FALLBACK.border),
    foreground: read(s, "--foreground", FALLBACK.foreground),
    muted: read(s, "--muted", FALLBACK.muted),
    good: read(s, "--good", FALLBACK.good),
    warn: read(s, "--warn", FALLBACK.warn),
    bad: read(s, "--bad", FALLBACK.bad),
    info: read(s, "--info", FALLBACK.info),
    neutral: read(s, "--neutral", FALLBACK.neutral),
    accent: read(s, "--accent", FALLBACK.accent),
  };
  return cache;
}

/** The server has no page to read, so it uses the light values. */
const getServerSnapshot = (): ChartColors => FALLBACK;

export function useChartColors(): ChartColors {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Pick a colour for a category. "unknown" and blank always get the same grey,
 * in every chart, so the eye learns it once.
 */
export function colorFor(
  key: string,
  index: number,
  colors: ChartColors,
): string {
  if (!key || key === "unknown" || key === "no_answer_captured") {
    return colors.unknown;
  }
  return colors.series[index % colors.series.length];
}
