import "server-only";
import { hashProblem, isUsableHash } from "./password-hash.mjs";

/**
 * The three settings a sign-in needs, and how to read them safely.
 *
 * Kept in its own file because two places need the same answer: auth.ts, when
 * somebody presses Sign in, and the login page, which warns before anybody
 * types. The login page cannot rely on auth.ts alone, because a missing
 * AUTH_SECRET is rejected by Auth.js itself before our code ever runs.
 *
 * Node only. Never import this from a component or from middleware.
 */

/**
 * Read one login setting and forgive the three ways a paste goes wrong.
 *
 * The Vercel settings page is a plain text box with no validation, so a value
 * can arrive with spaces or a line break around it, wrapped in quote marks, or
 * with the whole `NAME=value` line pasted in by mistake. All three used to
 * fail as "wrong password" with nothing on screen to explain it. Strip them
 * instead. `scripts/check-login.mjs` strips exactly the same things, so a
 * local check and the live server always agree.
 */
export function readSetting(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;

  let value = raw.trim();

  // The whole line, name included, pasted into the value box.
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim();

  // Quote marks around the value. A .env file strips these; Vercel does not.
  const quoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")));
  if (quoted) value = value.slice(1, -1).trim();

  return value.length > 0 ? value : undefined;
}

/**
 * Name the first sign-in setting that is missing or unreadable, or return
 * null when all three are usable.
 *
 * The sentence is safe to show on the public login page and safe to log: it
 * names the setting, never a value. Saying "this is not set up" instead of
 * "wrong password" is the whole point. The old build said the same thing for
 * both, which is what made the Vercel deploy so slow to diagnose.
 */
export function loginSetupProblem(): string | null {
  if (!readSetting("AUTH_SECRET")) {
    return "AUTH_SECRET is missing, so no sign-in can be remembered.";
  }
  if (!readSetting("DASHBOARD_USERNAME")) {
    return "DASHBOARD_USERNAME is missing.";
  }

  const rawHash = readSetting("DASHBOARD_PASSWORD_HASH");
  if (!rawHash) {
    return "DASHBOARD_PASSWORD_HASH is missing.";
  }
  if (!isUsableHash(rawHash)) {
    // The length is a fact about the setting, not a piece of the secret, and
    // it is the single most useful clue when a paste went wrong.
    return `DASHBOARD_PASSWORD_HASH: ${hashProblem(rawHash)} It is ${rawHash.length} characters long.`;
  }
  return null;
}
