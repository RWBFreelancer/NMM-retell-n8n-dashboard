import { NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { getExecution } from "@/lib/n8n";

export const dynamic = "force-dynamic";

/** One run, node by node. Only for a detail view: the payload is large. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "bad_id", plain: "That is not a run number." },
        { status: 400 },
      );
    }
    return NextResponse.json(await getExecution(id));
  } catch (err) {
    return failure(err);
  }
}
