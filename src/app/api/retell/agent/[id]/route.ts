import { NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { getAgent } from "@/lib/retell";

export const dynamic = "force-dynamic";

/**
 * The live agent, including the version that is really serving calls.
 * This is the only trustworthy source of that number.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    const { id } = await params;
    return NextResponse.json(await getAgent(id));
  } catch (err) {
    return failure(err);
  }
}
