import "server-only";
import type { RetellCall } from "./retell";

/**
 * Counting rules, in one place.
 *
 * Honesty rules that must not be broken:
 *  - "unknown" and "not recorded" are their own buckets. Never folded away.
 *  - Every bucket total adds back to the number of calls.
 *  - A rate says what it is out of.
 */

/** Read one post-call analysis field off a call. */
export function analysisValue(
  call: RetellCall,
  field: string,
): string | undefined {
  const data = call.call_analysis?.custom_analysis_data;
  if (!data) return undefined;
  const raw = data[field];
  if (raw === undefined || raw === null || raw === "") return undefined;
  return String(raw);
}

/** True only when the field plainly says yes. Blank is not a no. */
export function isYes(call: RetellCall, field: string): boolean {
  const v = analysisValue(call, field);
  return v === "yes" || v === "true";
}

export type Bucket = { key: string; count: number };

/**
 * Count calls by one analysis field.
 * A call with no value lands in "(not recorded)", never in "unknown", because
 * those two mean different things: the agent answered "unknown", or nothing
 * was saved at all.
 */
export function countBy(calls: RetellCall[], field: string): Bucket[] {
  const counts = new Map<string, number>();
  for (const call of calls) {
    const key = analysisValue(call, field) ?? "(not recorded)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Count calls by a top-level call field, such as disconnection_reason. */
export function countByCallField(
  calls: RetellCall[],
  pick: (c: RetellCall) => string | undefined,
): Bucket[] {
  const counts = new Map<string, number>();
  for (const call of calls) {
    const key = pick(call) ?? "(not recorded)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export type AgentStats = {
  total: number;
  serviceRequests: number;
  incomplete: number;
  needsPerson: number;
  salesOrSpam: number;
  wrongNumber: number;
  /** Calls where the caller never said what they wanted. */
  nothingSaid: number;
  avgDurationMs: number;
  totalCostCents: number;
  /** Median of the per-call e2e p50, in milliseconds. */
  replySpeedMs?: number;
};

export function summarise(calls: RetellCall[]): AgentStats {
  const total = calls.length;

  let durationSum = 0;
  let costSum = 0;
  const speeds: number[] = [];

  for (const call of calls) {
    durationSum += call.duration_ms ?? 0;
    costSum += call.call_cost?.combined_cost ?? 0;
    const p50 = call.latency?.e2e?.p50;
    if (typeof p50 === "number" && p50 > 0) speeds.push(p50);
  }

  return {
    total,
    serviceRequests: calls.filter(
      (c) => analysisValue(c, "call_type") === "service_request",
    ).length,
    incomplete: calls.filter((c) => isYes(c, "incomplete_intake")).length,
    needsPerson: calls.filter((c) => isYes(c, "human_review_required")).length,
    salesOrSpam: calls.filter((c) => isYes(c, "sales_or_spam")).length,
    wrongNumber: calls.filter((c) => isYes(c, "is_wrong_number")).length,
    nothingSaid: calls.filter(
      (c) => analysisValue(c, "call_type") === "unknown",
    ).length,
    avgDurationMs: total ? Math.round(durationSum / total) : 0,
    totalCostCents: costSum,
    replySpeedMs: speeds.length ? median(speeds) : undefined,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
