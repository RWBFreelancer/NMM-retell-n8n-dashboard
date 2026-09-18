import "server-only";
import {
  getExecution,
  listExecutions,
  type Execution,
  type RunDatum,
} from "./n8n";
import type { RetellCall } from "./retell";
import { RECAP_STATUS_PLAIN, type RecapStatus, type Plain, type Tone } from "./plain";

/**
 * Match one call to the recap run that handled it.
 *
 * This is the question the whole dashboard exists to answer: **did this lead
 * reach Daniel?**
 *
 * n8n cannot be asked "which run handled call X". The call id is buried in the
 * webhook body inside each run's data, and fetching that data costs about
 * 140 KB per run. So this does two steps:
 *
 *   1. List runs with no data at all. Cheap. Keep the ones that started in a
 *      sensible window around the call ending.
 *   2. Fetch those few, newest first, and read the call id out of the webhook
 *      node. Stop at the first exact match.
 *
 * The time window only decides WHICH runs to open. A run is never claimed as a
 * match on timing alone: the call id has to be identical. If nothing matches,
 * the answer is "no recap at all", which is a real and important answer.
 */

/** The webhook node that receives the call from Retell. */
const WEBHOOK_NODE = "Retell call_analyzed";

/** The node that hands the lead to Daniel. The one that really matters. */
const HANDOFF_NODE = "Send to Daniel";

/** How far before the call ended a run may have started. Clock drift only. */
const EARLY_MS = 2 * 60 * 1000;

/** How long after the call ended the recap may still fire. */
const LATE_MS = 60 * 60 * 1000;

/** Never open more than this many runs to answer one page. */
const MAX_FETCHES = 8;

export type RecapNode = {
  name: string;
  /** "ran", "failed" or "did not run". */
  state: "ran" | "failed" | "skipped";
  /** The plain reason, when it failed. */
  problem?: string;
  tone: Tone;
};

export type RecapMatch = {
  status: RecapStatus;
  plain: Plain;
  /** The n8n run number, for somebody who wants to open it in n8n. */
  executionId?: number;
  startedAtMs?: number;
  /** How long the run took, in milliseconds. */
  tookMs?: number;
  nodes: RecapNode[];
  /** The node that broke, if one did. */
  failedNode?: string;
  /** A sentence about what broke, with no stack trace and no key in it. */
  failedBecause?: string;
  /** True when the lead actually got handed over. */
  reachedDaniel: boolean;
  /**
   * True when we gave up looking rather than proving there is no run. Said out
   * loud on screen, because "we did not look hard enough" and "nothing ran"
   * must never look the same.
   */
  searchIncomplete: boolean;
  /** Why we could not finish looking. Shown on screen when there is one. */
  whyIncomplete?: string;
};

export async function findRecap(call: RetellCall): Promise<RecapMatch> {
  const endMs = call.end_timestamp ?? call.start_timestamp;

  let runs: Execution[];
  try {
    runs = (await listExecutions({ limit: 250 })).data ?? [];
  } catch {
    // n8n being unreachable is not the same as no recap existing.
    return noMatch(true, "We could not reach n8n at all, so we do not know.");
  }

  // n8n hands over a limited number of runs, newest first. A call older than
  // the oldest run we were given is simply out of our reach: its recap may
  // have run perfectly and been forgotten by n8n since. Saying "nothing ran"
  // there would be a lie.
  const oldestRunMs = runs.length
    ? Math.min(...runs.map((r) => Date.parse(r.startedAt)).filter((n) => !Number.isNaN(n)))
    : undefined;
  if (endMs && oldestRunMs !== undefined && endMs < oldestRunMs) {
    return noMatch(
      true,
      "This call is older than the oldest recap run n8n still keeps, so we cannot check it. It is not proof that anything went wrong.",
    );
  }

  const candidates = runs
    .map((run) => ({ run, startedMs: Date.parse(run.startedAt) }))
    .filter(({ startedMs }) => {
      if (!endMs || Number.isNaN(startedMs)) return true;
      return startedMs >= endMs - EARLY_MS && startedMs <= endMs + LATE_MS;
    })
    // Closest to the end of the call first: that is nearly always the one.
    .sort((a, b) =>
      endMs
        ? Math.abs(a.startedMs - endMs) - Math.abs(b.startedMs - endMs)
        : b.startedMs - a.startedMs,
    );

  const toOpen = candidates.slice(0, MAX_FETCHES);

  for (const { run } of toOpen) {
    let full: Execution;
    try {
      full = await getExecution(run.id);
    } catch {
      continue; // One unreadable run should not sink the whole answer.
    }
    if (callIdOf(full) === call.call_id) return describe(full);
  }

  // We opened everything we were willing to open and found nothing.
  return candidates.length > toOpen.length
    ? noMatch(
        true,
        `There were more recap runs around this call than we were willing to open (${candidates.length}). We checked the ${MAX_FETCHES} closest and none was this call.`,
      )
    : noMatch(false);
}

function noMatch(searchIncomplete: boolean, whyIncomplete?: string): RecapMatch {
  return {
    status: "none",
    plain: RECAP_STATUS_PLAIN.none,
    nodes: [],
    reachedDaniel: false,
    searchIncomplete,
    whyIncomplete,
  };
}

/** Pull the call id out of the webhook node's body. */
function callIdOf(execution: Execution): string | undefined {
  const runs = execution.data?.resultData?.runData?.[WEBHOOK_NODE];
  const json = runs?.[0]?.data?.main?.[0]?.[0]?.json as
    | { body?: { call?: { call_id?: string } } }
    | undefined;
  return json?.body?.call?.call_id;
}

function describe(execution: Execution): RecapMatch {
  const runData = execution.data?.resultData?.runData ?? {};
  const error = execution.data?.resultData?.error;

  const nodes: RecapNode[] = Object.entries(runData).map(([name, runs]) => {
    const first = runs?.[0];
    const failed = Boolean(first?.error);
    return {
      name,
      state: failed ? "failed" : "ran",
      problem: failed ? safeMessage(first) : undefined,
      tone: failed ? "bad" : "good",
    };
  });

  const handoff = runData[HANDOFF_NODE]?.[0];
  const reachedDaniel = Boolean(handoff) && !handoff?.error;

  const status = toStatus(execution.status);
  const startedMs = Date.parse(execution.startedAt);
  const stoppedMs = execution.stoppedAt ? Date.parse(execution.stoppedAt) : NaN;

  return {
    status,
    plain: RECAP_STATUS_PLAIN[status],
    executionId: execution.id,
    startedAtMs: Number.isNaN(startedMs) ? undefined : startedMs,
    tookMs:
      Number.isNaN(startedMs) || Number.isNaN(stoppedMs)
        ? undefined
        : stoppedMs - startedMs,
    nodes,
    failedNode: error?.node?.name ?? nodes.find((n) => n.state === "failed")?.name,
    failedBecause: error?.message ? shorten(error.message) : undefined,
    reachedDaniel,
    searchIncomplete: false,
  };
}

function toStatus(raw: string): RecapStatus {
  if (raw === "success") return "success";
  if (raw === "waiting") return "waiting";
  if (raw === "running" || raw === "new") return "running";
  // "error", "crashed" and "canceled" all mean the same thing to a person
  // looking at this page: the lead did not get through.
  return "error";
}

/**
 * A node's error message, trimmed and stripped of anything sensitive.
 *
 * n8n puts request URLs into some messages, and a URL can carry a token. Cut
 * the message at the first thing that looks like one rather than trusting it.
 */
function safeMessage(run: RunDatum | undefined): string | undefined {
  const raw = run?.error?.message ?? run?.error?.description;
  return raw ? shorten(raw) : undefined;
}

function shorten(message: string): string {
  const cleaned = message
    .replace(/https?:\/\/\S+/g, "a web address")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "a long code")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}…` : cleaned;
}
