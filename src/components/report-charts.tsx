"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorFor, useChartColors, type ChartColors } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

/**
 * The charts on the Reports page.
 *
 * Rules kept here, on purpose, because they are easy to break by accident:
 *
 *  - Colour is assigned in a fixed order and never cycled. "Never said" and
 *    "Not recorded" always take the same grey, in every chart on the page, so
 *    the eye learns that colour once.
 *  - Colour is never the only signal. Every chart has a legend, and the same
 *    numbers sit in a table underneath.
 *  - Marks are separated by a 2px gap in the surface colour, never by a border
 *    drawn round them.
 *  - Text wears text colours, never a series colour.
 *  - Bars do not animate. Two reasons, both real: globals.css turns motion off
 *    for anybody who asks for that, and a JavaScript chart library ignores
 *    that setting entirely. And a bar that grows from nothing is decoration on
 *    a page whose whole job is to state a number.
 */

export type SliceView = {
  key: string;
  label: string;
  means: string;
  count: number;
  share: number;
  isUnknown: boolean;
  /** The hue this answer owns. Worked out on the server, never from position. */
  colorIndex: number;
};

/* ------------------------------------------------------------------ *
 * Share of the whole: one bar, not a pie
 * ------------------------------------------------------------------ */

/**
 * A single horizontal bar split into its parts.
 *
 * A donut was the first idea and it is the wrong one here: these labels are
 * sentences ("Never said what they wanted"), and a ring of six long labels is
 * unreadable. One bar reads left to right, holds long names in its legend, and
 * compares shares better than angles do.
 */
export function ShareBar({
  slices,
  onPick,
}: {
  slices: SliceView[];
  onPick?: (key: string) => void;
}) {
  const colors = useChartColors();
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((n, s) => n + s.count, 0);

  if (total === 0) {
    return (
      <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
        There were no calls in this time, so there is nothing to divide up.
      </p>
    );
  }

  return (
    <div>
      {/* The bar. A 2px gap in the surface colour does the separating. */}
      <div
        className="flex h-8 w-full overflow-hidden rounded"
        style={{ gap: 2 }}
        role="img"
        aria-label={`Share of calls: ${slices
          .map((s) => `${s.label} ${Math.round(s.share)} per cent`)
          .join(", ")}`}
      >
        {slices.map((slice) => (
          <button
            key={slice.key}
            type="button"
            onClick={onPick ? () => onPick(slice.key) : undefined}
            onMouseEnter={() => setHover(slice.key)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(slice.key)}
            onBlur={() => setHover(null)}
            title={`${slice.label}: ${slice.count} of ${total}. ${slice.means}`}
            className={cn(
              "h-full min-w-[3px] transition-opacity",
              onPick ? "cursor-pointer" : "cursor-default",
              hover && hover !== slice.key ? "opacity-45" : "opacity-100",
            )}
            style={{
              width: `${slice.share}%`,
              backgroundColor: paint(slice, colors),
            }}
          >
            <span className="sr-only">
              {slice.label}, {slice.count} calls
            </span>
          </button>
        ))}
      </div>

      <Legend slices={slices} colors={colors} hover={hover} onHover={setHover} />
    </div>
  );
}

function Legend({
  slices,
  colors,
  hover,
  onHover,
}: {
  slices: SliceView[];
  colors: ChartColors;
  hover: string | null;
  onHover: (key: string | null) => void;
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {slices.map((slice) => (
        <li
          key={slice.key}
          onMouseEnter={() => onHover(slice.key)}
          onMouseLeave={() => onHover(null)}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-opacity",
            hover && hover !== slice.key ? "opacity-45" : "opacity-100",
          )}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: paint(slice, colors) }}
          />
          {/* Text never wears the series colour. */}
          <span className="text-muted">{slice.label}</span>
          <span className="font-medium tabular-nums">
            {Math.round(slice.share)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
 * Calls per day, stacked by kind
 * ------------------------------------------------------------------ */

export type TrendPoint = { label: string } & Record<string, number | string>;

export function TrendChart({
  data,
  seriesKeys,
  seriesLabels,
  colorIndexes,
}: {
  data: TrendPoint[];
  seriesKeys: string[];
  seriesLabels: Record<string, string>;
  /**
   * The hue each answer owns, exactly as the share bar uses it. Passed in
   * rather than worked out here, so one answer is one colour on the whole
   * page. -1 means the grey.
   */
  colorIndexes: Record<string, number>;
}) {
  const colors = useChartColors();
  const hue = (key: string) => {
    const at = colorIndexes[key];
    return at === undefined || at < 0
      ? colors.unknown
      : colors.series[at % colors.series.length];
  };

  const busy = data.length > 40;

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            {/* Recessive: hairline, solid, horizontal only. */}
            <CartesianGrid
              stroke={colors.grid}
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              interval={busy ? Math.floor(data.length / 8) : 0}
              minTickGap={4}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: colors.surface, fillOpacity: 0.08 }}
              contentStyle={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                color: colors.foreground,
                fontSize: 12,
              }}
              labelStyle={{ color: colors.foreground, fontWeight: 600 }}
              itemStyle={{ color: colors.muted }}
              formatter={(value, name) => {
                const n = Number(value ?? 0);
                return [
                  `${n} ${n === 1 ? "call" : "calls"}`,
                  seriesLabels[String(name)] ?? String(name),
                ];
              }}
            />
            {seriesKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="calls"
                maxBarSize={24}
                fill={hue(key)}
                // A 2px line in the SURFACE colour is the gap between stacked
                // pieces. It is not a border: it is the card showing through.
                stroke={colors.surface}
                strokeWidth={2}
                isAnimationActive={false}
                radius={i === seriesKeys.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {seriesKeys.map((key) => (
          <li key={key} className="flex items-center gap-1.5 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: hue(key) }}
            />
            <span className="text-muted">{seriesLabels[key] ?? key}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Which colour a slice gets.
 *
 * "Never said" and "Not recorded" always take the grey, whatever position they
 * land in. Everything else takes the next hue in the fixed order.
 */
function paint(slice: SliceView, colors: ChartColors): string {
  if (slice.isUnknown) return colors.unknown;
  return colorFor(slice.key, slice.colorIndex, colors);
}
