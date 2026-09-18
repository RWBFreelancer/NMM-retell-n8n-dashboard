"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cell, CallRow } from "@/lib/call-row";
import { COLUMN_PLAIN } from "@/lib/plain";
import { Chip } from "./ui";

/**
 * The call table.
 *
 * A client component for one reason only: the "hide caller numbers" switch,
 * which starts ON. Everything on a row was already turned into plain English
 * on the server, so no code and no counting rule lives in here.
 *
 * On a narrow screen the table becomes a list of cards. A phone must not need
 * sideways scrolling to answer "did this call reach Daniel?".
 */
export function CallTable({
  rows,
  agentKey,
  /** Kept so a row can link back to the exact view the person came from. */
  backQuery,
}: {
  rows: CallRow[];
  agentKey: string;
  backQuery: string;
}) {
  // Hidden by default. A shared screen or a screenshot must be safe without
  // anybody remembering to switch anything. (dashboard/CLAUDE.md rule 3)
  const [hidden, setHidden] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {rows.length === 1 ? "1 call" : `${rows.length} calls`} on this page.
        </p>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-pressed={!hidden}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover"
        >
          {hidden ? (
            <>
              <EyeOff aria-hidden className="h-3.5 w-3.5" />
              Caller numbers are hidden
            </>
          ) : (
            <>
              <Eye aria-hidden className="h-3.5 w-3.5" />
              Caller numbers are showing
            </>
          )}
        </button>
      </div>

      {/* Wide screens: a real table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Every call in the chosen time, newest first.
          </caption>
          <thead>
            <tr className="bg-surface-2 text-left">
              <Th col="when" />
              <Th col="from" />
              <Th col="length" />
              <Th col="call_type" />
              <Th col="urgency" />
              <Th col="service_request" />
              <Th col="incomplete_intake" />
              <Th col="ended" />
              <Th col="cost" align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.callId}
                className="border-t border-border align-top hover:bg-surface-hover"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link
                    href={`/agent/${agentKey}/calls/${row.callId}${backQuery}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {row.when}
                  </Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  {hidden ? row.fromMasked : row.fromFull}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">{row.length}</td>
                <td className="px-3 py-2"><CellChip cell={row.callType} /></td>
                <td className="px-3 py-2"><CellChip cell={row.urgency} /></td>
                <td className="px-3 py-2"><CellChip cell={row.serviceRequest} /></td>
                <td className="px-3 py-2"><CellChip cell={row.detailsMissing} /></td>
                <td className="px-3 py-2"><CellChip cell={row.ended} /></td>
                <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                  {row.cost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: one card per call. */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li
            key={row.callId}
            className="rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                href={`/agent/${agentKey}/calls/${row.callId}${backQuery}`}
                className="font-medium text-accent hover:underline"
              >
                {row.when}
              </Link>
              <span className="text-sm tabular-nums text-muted">
                {row.length} · {row.cost}
              </span>
            </div>
            <p className="mt-0.5 text-sm tabular-nums text-muted">
              {hidden ? row.fromMasked : row.fromFull}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <CellChip cell={row.callType} />
              <CellChip cell={row.urgency} />
              <CellChip cell={row.serviceRequest} />
              <CellChip cell={row.detailsMissing} />
              <CellChip cell={row.ended} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Th({ col, align }: { col: string; align?: "right" }) {
  const plain = COLUMN_PLAIN[col];
  return (
    <th
      scope="col"
      title={plain?.means}
      className={cn(
        "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted",
        align === "right" && "text-right",
      )}
    >
      {plain?.label ?? col}
    </th>
  );
}

/**
 * One cell, as a chip. In Technical mode the raw code shows underneath, so a
 * developer can still see what the agent actually wrote.
 */
function CellChip({ cell }: { cell: Cell }) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <Chip tone={cell.tone} icon={false} title={cell.means}>
        {cell.label}
      </Chip>
      {cell.raw ? (
        <code className="technical-only font-mono text-[10px] text-faint">
          {cell.raw}
        </code>
      ) : null}
    </span>
  );
}
