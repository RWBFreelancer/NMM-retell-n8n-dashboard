import { NextRequest, NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { getAgentInfo } from "@/lib/agents";
import { listAllCalls } from "@/lib/retell";
import { buildRows } from "@/lib/call-rows";
import { rowsToCsv } from "@/lib/call-row";
import { applyFilters, applySearch, readFilters } from "@/lib/call-filters";
import { rangeForDays } from "@/lib/format";
import { readDays } from "@/lib/ranges";

export const dynamic = "force-dynamic";

/**
 * The call table as a spreadsheet file.
 *
 * It re-reads the calls and re-applies the same filters as the page, using the
 * same row builder, so the file always matches what was on screen. Read-only:
 * it reaches Retell's list-calls and nothing else.
 *
 * Caller numbers are hidden unless the request asks for them, because a
 * spreadsheet gets emailed and forwarded. (dashboard/CLAUDE.md rule 3)
 */
export async function GET(req: NextRequest) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const url = new URL(req.url);
    const agent = getAgentInfo(url.searchParams.get("agent") ?? "");
    if (!agent || !agent.agentId) {
      return NextResponse.json(
        {
          error: "unknown_agent",
          plain: "We do not know which agent to export. Go back and try again.",
        },
        { status: 400 },
      );
    }

    const days = readDays(url.searchParams.get("days") ?? undefined);
    const filters = readFilters(url.searchParams.getAll("f"));
    const search = (url.searchParams.get("q") ?? "").trim();
    // Hidden unless asked for, not the other way round.
    const showNumbers = url.searchParams.get("show") === "numbers";

    const { startMs, endMs } = rangeForDays(days);
    const { calls } = await listAllCalls({
      agentId: agent.agentId,
      startMs,
      endMs,
    });

    const matching = applySearch(applyFilters(calls, filters), search);
    const csv = rowsToCsv(buildRows(matching), !showNumbers);

    const stamp = new Date().toISOString().slice(0, 10);
    const name = `ninja-ops-agent-${agent.key}-${days}d-${stamp}.csv`;

    // The leading ﻿ is a byte order mark. Without it, Excel on Windows
    // reads a UTF-8 file as if it were the old Windows code page, and any
    // accented letter arrives as rubbish.
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
