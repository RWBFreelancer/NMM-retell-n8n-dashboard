"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartColors } from "@/lib/chart-theme";

/**
 * The two agents side by side.
 *
 * Only measures on the SAME scale share a chart. These are all "out of every
 * 100 calls", so they can sit together honestly. Average call length is a
 * different kind of number and lives on a tile instead: putting it here would
 * need a second y-axis, and a chart with two scales can be read to say
 * whatever the reader already believed.
 */

export type CompareRow = {
  /** What the measure is, in words. */
  label: string;
  /** One sentence, for the tooltip. */
  means: string;
  /** Out of every 100 calls, for each agent. */
  b: number;
  a: number;
};

export function CompareChart({
  rows,
  counts,
}: {
  rows: CompareRow[];
  /** How many calls each rate is out of. A percentage without this lies. */
  counts: { b: number; a: number };
}) {
  const colors = useChartColors();

  // "100%" off two calls is true and useless. Say so rather than draw it.
  const thin = (n: number) => n > 0 && n < 10;

  // Two series, so a legend is not optional. Agent B keeps slot 1 and Agent A
  // slot 2 everywhere on the site, whichever has the bigger bar today.
  const bColor = colors.series[0];
  const aColor = colors.series[1];

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
            barGap={2}
          >
            <CartesianGrid stroke={colors.grid} strokeWidth={1} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={124}
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: colors.muted, fillOpacity: 0.06 }}
              contentStyle={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                color: colors.foreground,
                fontSize: 12,
              }}
              labelStyle={{ color: colors.foreground, fontWeight: 600 }}
              itemStyle={{ color: colors.muted }}
              formatter={(value, name) => [
                `${Math.round(Number(value ?? 0))} of every 100 calls`,
                String(name),
              ]}
            />
            {/* 4px rounded data-end, square at the baseline. */}
            <Bar
              dataKey="b"
              name="Agent B"
              fill={bColor}
              maxBarSize={14}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="a"
              name="Agent A"
              fill={aColor}
              maxBarSize={14}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {[
          { label: `Agent B, the live one — ${callWord(counts.b)}`, color: bColor },
          { label: `Agent A, the spare — ${callWord(counts.a)}`, color: aColor },
        ].map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: s.color }}
            />
            {/* Text wears text colours, never the series colour. */}
            <span className="text-muted">{s.label}</span>
          </li>
        ))}
      </ul>

      {(thin(counts.b) || thin(counts.a)) && (
        <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Careful with the percentages. One of these agents took fewer than ten
          calls in this time, so a single call moves its bar a long way.
        </p>
      )}
      {(counts.b === 0 || counts.a === 0) && (
        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          An agent with no calls shows nothing at all here, not zero per cent.
          Those are different things.
        </p>
      )}

      {/* Colour is never the only signal: the same numbers, in words. */}
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="pb-1 font-semibold">Out of every 100 calls</th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Agent B
              <span className="block font-normal normal-case">
                of {callWord(counts.b)}
              </span>
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              Agent A
              <span className="block font-normal normal-case">
                of {callWord(counts.a)}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border">
              <td className="py-1.5 text-muted" title={row.means}>{row.label}</td>
              <td className="py-1.5 text-right tabular-nums">
                {counts.b === 0 ? "—" : Math.round(row.b)}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {counts.a === 0 ? "—" : Math.round(row.a)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "46 calls", "1 call", "no calls". */
function callWord(n: number): string {
  if (n === 0) return "no calls";
  return `${n} ${n === 1 ? "call" : "calls"}`;
}
