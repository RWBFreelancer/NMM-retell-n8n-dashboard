import { NextRequest, NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { listCalls } from "@/lib/retell";

export const dynamic = "force-dynamic";

/**
 * The call list. POST because the filter travels in a body.
 * Read-only: it only ever reaches Retell's /v3/list-calls.
 */
export async function POST(req: NextRequest) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      agentId?: string;
      startMs?: number;
      endMs?: number;
      limit?: number;
      paginationKey?: string;
      analysisEquals?: Record<string, string | number | boolean>;
    };

    const result = await listCalls({
      agentId: body.agentId,
      startMs: body.startMs,
      endMs: body.endMs,
      limit: body.limit,
      paginationKey: body.paginationKey,
      analysisEquals: body.analysisEquals,
    });

    return NextResponse.json(result);
  } catch (err) {
    return failure(err);
  }
}
