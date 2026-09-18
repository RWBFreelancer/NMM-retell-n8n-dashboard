import { TZDate } from "@date-fns/tz";
import { format, formatDistanceToNowStrict } from "date-fns";

/**
 * Formatting, always in California time.
 *
 * Robert's calls happen in Pacific time. Never use the viewer's zone, or a
 * phone in another state shows the wrong day and every daily count shifts.
 */
export const TIME_ZONE = "America/Los_Angeles";

export function toPacific(ms: number): TZDate {
  return new TZDate(ms, TIME_ZONE);
}

/** "Tue 17 Sep, 2:45 pm" */
export function dateTime(ms?: number): string {
  if (!ms) return "—";
  return format(toPacific(ms), "EEE d MMM, h:mm a");
}

/** "2:45 pm" */
export function timeOnly(ms?: number): string {
  if (!ms) return "—";
  return format(toPacific(ms), "h:mm a");
}

/** "17 Sep" */
export function dayShort(ms: number): string {
  return format(toPacific(ms), "d MMM");
}

/** "2026-09-17", the key a daily chart groups by. */
export function dayKey(ms: number): string {
  return format(toPacific(ms), "yyyy-MM-dd");
}

/** "3 hours ago" */
export function ago(ms?: number): string {
  if (!ms) return "—";
  return `${formatDistanceToNowStrict(new Date(ms))} ago`;
}

/** "2m 14s". Always words a person would say. */
export function duration(msTotal?: number): string {
  if (!msTotal || msTotal < 0) return "—";
  const total = Math.round(msTotal / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Retell reports cost in cents. */
export function money(cents?: number): string {
  if (cents === undefined || cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

/** "45%" — always rounded, never a long decimal. */
export function percent(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

/** "12 of every 100 calls" — the plain sentence under a percentage. */
export function outOfHundred(part: number, whole: number): string {
  if (!whole) return "There were no calls to count.";
  const n = Math.round((part / whole) * 100);
  return `${n} of every 100 calls.`;
}

/** "(555) 010-1234" from "+15550101234". Leaves anything odd alone. */
export function phonePretty(raw?: string): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

/**
 * Hide most of a phone number. On by default, because this repo is public and
 * a screen can be shared. "(805) •••-••26"
 */
export function phoneMasked(raw?: string): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  const area = digits.length >= 10 ? digits.slice(-10, -7) : "•••";
  return `(${area}) •••-••${digits.slice(-2)}`;
}

/** Hide a name but keep it recognisable once you know it. "R•••• G••••" */
export function nameMasked(raw?: string): string {
  if (!raw) return "—";
  return raw
    .split(/\s+/)
    .map((word) => (word ? `${word[0]}${"•".repeat(Math.max(word.length - 1, 1))}` : word))
    .join(" ");
}

/** Start and end of a day range, in California time, as unix milliseconds. */
export function rangeForDays(days: number): { startMs: number; endMs: number } {
  const endMs = Date.now();
  const startMs = endMs - days * 24 * 60 * 60 * 1000;
  return { startMs, endMs };
}
