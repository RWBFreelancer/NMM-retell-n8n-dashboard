import { NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/api-helpers";
import { getWorkflow } from "@/lib/n8n";

export const dynamic = "force-dynamic";

/** The recap workflow itself: its name, whether it is switched on, its nodes. */
export async function GET() {
  const blocked = await requireSession();
  if (blocked) return blocked;

  try {
    return NextResponse.json(await getWorkflow());
  } catch (err) {
    return failure(err);
  }
}
