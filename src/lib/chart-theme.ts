"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

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
  series: ["#2563eb", "#0d9488", "#b45309", "#7c3aed", "#be185d", "#4d7c0f", "#0369a1", "#9a3412"],
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

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    setColors({
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
    });
  }, [resolvedTheme]);

  return colors;
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
