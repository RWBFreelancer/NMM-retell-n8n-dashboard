import { NextRequest, NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { AGENTS, AGENT_ORDER, type AgentKey } from "@/lib/agents";
import { listAllCalls, type RetellCall } from "@/lib/retell";
import { callTypeSlices, crossTabs, serviceReport } from "@/lib/reports";
import { RULES_CHANGED } from "@/lib/service-categories";
import { rangeForDays } from "@/lib/format";
import { readDays, rangeLabel } from "@/lib/ranges";

export const dynamic = "force-dynamic";

/**
 * The report tables as a spreadsheet file.
 *
 * Counts only: no caller name, no number, no call id. A report is the thing
 * most likely to be forwarded, so it carries nothing personal at all.
 * (dashboard/CLAUDE.md rule 3)
 *
 * It re-reads the calls and re-uses the same counting functions as the page,
 * so the file and the screen can never disagree.
 */
export async function GET(req: NextRequest) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const url = new URL(req.url);
    const days = readDays(url.searchParams.get("days") ?? undefined);
    const raw = url.searchParams.get("agent");
    const who = raw === "a" || raw === "b" ? raw : "both";
    const keys: AgentKey[] = who === "both" ? AGENT_ORDER : [who];

    const { startMs, endMs } = rangeForDays(days);
    const calls: RetellCall[] = [];
    for (const key of keys) {
      if (!AGENTS[key].agentId) continue;
      const r = await listAllCalls({ agentId: AGENTS[key].agentId, startMs, endMs });
      calls.push(...r.calls);
    }

    const rows: Array<Array<string | number>> = [];
    rows.push(["report", "answer", "raw_value", "calls", "share_percent"]);

    const add = (
      report: string,
      slices: Array<{ key: string; label: string; count: number; share: number }>,
    ) => {
      for (const s of slices) {
        rows.push([report, s.label, s.key, s.count, Math.round(s.share)]);
      }
      rows.push([report, "Every call", "", calls.length, 100]);
    };

    add("What kind of calls came in", callTypeSlices(calls));

    const service = serviceReport(calls);
    add("What work did they want (best guess)", service.slices);

    for (const tab of crossTabs(calls)) add(tab.label, tab.slices);

    const notes = [
      "",
      `Counted: last ${rangeLabel(days).toLowerCase()}, California time.`,
      `Agents: ${keys.map((k) => AGENTS[k].label).join(" and ")}.`,
      `Total calls: ${calls.length}.`,
      `"What work did they want" is a GUESS from the caller's words. ${service.noWords} calls had no words at all; ${service.noMatch} had words that matched no rule.`,
      `The guessing rules last changed on ${RULES_CHANGED}.`,
      "This file holds counts only. No caller name, number or call id.",
    ];

    const csv =
      rows.map((r) => r.map(cell).join(",")).join("\r\n") +
      "\r\n" +
      notes.map((n) => cell(n)).join("\r\n") +
      "\r\n";

    const stamp = new Date().toISOString().slice(0, 10);
    const name = `ninja-ops-reports-${who}-${days}d-${stamp}.csv`;

    // ﻿ is a byte order mark. Without it, Excel on Windows reads a UTF-8
    // file as the old Windows code page and mangles any accented letter.
    return new NextResponse(`﻿${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return failure(err);
  }
}

/**
 * Quote a cell, and stop a spreadsheet running it as a formula.
 * Excel and Google Sheets execute a cell starting with = + - or @.
 */
function cell(value: string | number): string {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}
