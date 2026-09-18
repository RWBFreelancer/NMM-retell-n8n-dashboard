import "server-only";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { RetellError } from "./retell";
import { N8nError } from "./n8n";

/**
 * Shared bits for every /api route.
 *
 * Two jobs: refuse anybody who is not signed in, and turn an error into a
 * sentence a person can act on. Never leak a key, a URL with a key in it, or
 * a raw provider message.
 */

export type ApiFailure = {
  error: string;
  /** The sentence shown on screen. Says what to do next. */
  plain: string;
};

/** Returns a 401 response when the caller is not signed in, else null. */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json<ApiFailure>(
      {
        error: "unauthorized",
        plain: "You are signed out. Sign in again to see this.",
      },
      { status: 401 },
    );
  }
  return null;
}

/** Turn any thrown thing into a safe JSON reply. */
export function failure(err: unknown): NextResponse {
  if (err instanceof RetellError || err instanceof N8nError) {
    // The message is safe: our own clients build it, and never include the key.
    console.error(err.message);
    return NextResponse.json<ApiFailure>(
      { error: err.name, plain: err.plain },
      { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
    );
  }

  console.error("Unexpected API error", err);
  return NextResponse.json<ApiFailure>(
    {
      error: "unexpected",
      plain: "Something broke on our side. Try again. If it keeps happening, tell Rey.",
    },
    { status: 500 },
  );
}

/** Read a whole number from the query string. */
export function numberParam(
  url: URL,
  name: string,
  fallback?: number,
): number | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
