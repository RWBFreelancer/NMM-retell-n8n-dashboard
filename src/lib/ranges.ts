/**
 * The date ranges the whole dashboard offers. Plain, not a module that runs
 * only in the browser, because server pages read the label too.
 */
export const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export const RANGE_DAYS = RANGES.map((r) => r.days) as readonly number[];

export function rangeLabel(days: number): string {
  return RANGES.find((r) => r.days === days)?.label ?? `${days} days`;
}

/** Read ?days= from a URL, falling back to a week. */
export function readDays(value: string | undefined): number {
  const n = Number(value);
  return RANGE_DAYS.includes(n) ? n : 7;
}
