"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldGroupRows } from "@/lib/call-detail";
import { Card, CardTitle, Chip, RawName } from "./ui";

/**
 * Everything the agent wrote down, in groups.
 *
 * A client component for one reason: the switch that reveals a caller's name,
 * number and address. Those start hidden so the page is safe to show somebody
 * or screenshot. Every word on screen was turned into plain English on the
 * server; nothing is looked up here.
 */
export function FieldGroups({ groups }: { groups: FieldGroupRows[] }) {
  const [hidden, setHidden] = useState(true);

  const personalCount = groups.reduce(
    (n, g) => n + g.rows.filter((r) => r.personal).length,
    0,
  );

  // Some calls carry no notes at all: the caller hung up before the agent had
  // anything to write down, or the analysis never ran. Say that plainly. An
  // empty page looks like the dashboard is broken.
  if (groups.length === 0) {
    return (
      <Card>
        <CardTitle>What the agent wrote down</CardTitle>
        <p className="text-sm text-muted">
          Nothing. The agent saved no notes for this call at all, which usually
          means the caller hung up almost straight away. The recording above is
          all there is.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {personalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {personalCount} personal {personalCount === 1 ? "detail is" : "details are"}{" "}
            {hidden ? "hidden" : "showing"}.
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
                Show the name and numbers
              </>
            ) : (
              <>
                <Eye aria-hidden className="h-3.5 w-3.5" />
                Hide the name and numbers
              </>
            )}
          </button>
        </div>
      ) : null}

      {groups.map((group) => (
        <Card key={group.id}>
          <CardTitle hint={group.means}>{group.label}</CardTitle>
          <dl className="divide-y divide-border">
            {group.rows.map((row) => (
              <div
                key={row.name}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
              >
                <dt className="text-sm text-muted" title={row.means}>
                  {row.label}
                  <RawName>{row.name}</RawName>
                </dt>
                <dd className="min-w-0 flex-1 text-right text-sm">
                  {row.personal && hidden ? (
                    <button
                      type="button"
                      onClick={() => setHidden(false)}
                      className="rounded bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted hover:bg-surface-hover"
                    >
                      Hidden — click to show
                    </button>
                  ) : row.isChip ? (
                    <Chip tone={row.tone} icon={false} title={row.means}>
                      {row.value}
                    </Chip>
                  ) : (
                    <span className="break-words whitespace-pre-wrap">
                      {row.value}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}
