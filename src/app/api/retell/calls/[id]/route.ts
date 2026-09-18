import { NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { getCall } from "@/lib/retell";

export const dynamic = "force-dynamic";

/** One call, with its transcript and recording link. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const { id } = await params;
    return NextResponse.json(await getCall(id));
  } catch (err) {
    return failure(err);
  }
}
