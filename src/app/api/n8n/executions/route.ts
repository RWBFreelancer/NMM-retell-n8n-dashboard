import { NextRequest, NextResponse } from "next/server";
import { failure, numberParam, requireSession } from "@/lib/api-helpers";
import { listExecutions } from "@/lib/n8n";

export const dynamic = "force-dynamic";

/** Recent runs of the recap workflow. No payloads, so it stays small. */
export async function GET(req: NextRequest) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    return NextResponse.json(
      await listExecutions({
        limit: numberParam(url, "limit", 100),
        cursor: url.searchParams.get("cursor") ?? undefined,
        status:
          status === "success" || status === "error" || status === "waiting"
            ? status
            : undefined,
      }),
    );
  } catch (err) {
    return failure(err);
  }
}
