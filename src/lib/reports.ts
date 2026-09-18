import "server-only";
import type { RetellCall } from "./retell";
import { analysisValue } from "./stats";
import {
  SERVICE_BUCKETS,
  bucketFor,
  bucketMeans,
  NO_MATCH,
  NO_WORDS,
} from "./service-categories";
import {
  CALL_TYPE_PLAIN,
  CUSTOMER_PLAIN,
  DISCONNECT_PLAIN,
  DRIVABLE_PLAIN,
  URGENCY_PLAIN,
  YES_NO_PLAIN,
  plainOr,
  type Plain,
} from "./plain";
import { dayKey } from "./format";

/**
 * The counting behind the Reports page.
 *
 * Three rules hold everywhere in this file, and breaking any one of them makes
 * the report lie:
 *
 *  1. Every bucket total adds back to the number of calls. Nothing is dropped
 *     to tidy a chart.
 *  2. "Never said" and "Not recorded" are separate buckets and are never
 *     folded into anything. On real calls "never said" is the BIGGEST bucket,
 *     about half, and hiding it would make the agent look far better than it is.
 *  3. A guess is labelled a guess.
 */

export type Slice = {
  key: string;
  label: string;
  means: string;
  count: number;
  /** 0 to 100, rounded only for display. */
  share: number;
  /** Which palette slot. "unknown" always gets the grey, in every chart. */
  isUnknown: boolean;
  /**
   * Which hue this answer owns, fixed for the life of the answer.
   *
   * NOT its position in the sorted list. Colour has to follow the thing, not
   * its rank, or changing the date range repaints every slice and the reader
   * has to relearn the chart. -1 means "use the grey".
   */
  colorIndex: number;
  /** Query that opens the call list showing these calls, when one exists. */
  filterId?: string;
};

/* ------------------------------------------------------------------ *
 * Report 1: what kind of calls came in
 * ------------------------------------------------------------------ */

/** Buckets that always take the grey, so the eye learns the colour once. */
const GREY_KEYS = new Set(["unknown", "(not recorded)", NO_WORDS.id, NO_MATCH.id]);

export function callTypeSlices(calls: RetellCall[]): Slice[] {
  return countInto(calls, (c) => analysisValue(c, "call_type"), CALL_TYPE_PLAIN, {
    unknown: "said-nothing",
  });
}

export type CrossTab = {
  id: string;
  label: string;
  means: string;
  /** The raw field, for Technical mode. */
  raw: string;
  slices: Slice[];
};

/**
 * The other enums, all just counting. No new cost, no new call to anybody.
 */
export function crossTabs(calls: RetellCall[]): CrossTab[] {
  return [
    {
      id: "urgency",
      label: "How soon they needed it",
      means: "How quickly the caller said the work was needed.",
      raw: "urgency",
      slices: countInto(calls, (c) => analysisValue(c, "urgency"), URGENCY_PLAIN),
    },
    {
      id: "customer",
      label: "New or returning",
      means: "Whether we had worked for the caller before.",
      raw: "new_or_existing_customer",
      slices: countInto(
        calls,
        (c) => analysisValue(c, "new_or_existing_customer"),
        CUSTOMER_PLAIN,
      ),
    },
    {
      id: "drivable",
      label: "Does it still run",
      means: "Whether the vehicle could still be driven.",
      raw: "drivable_or_usable_status",
      slices: countInto(
        calls,
        (c) => analysisValue(c, "drivable_or_usable_status"),
        DRIVABLE_PLAIN,
      ),
    },
    {
      id: "missing",
      label: "Details missing",
      means: "Whether the agent got everything Daniel needs.",
      raw: "incomplete_intake",
      slices: countInto(
        calls,
        (c) => analysisValue(c, "incomplete_intake"),
        YES_NO_PLAIN,
        { yes: "missing", true: "missing" },
      ),
    },
    {
      id: "needs-person",
      label: "Needs a person",
      means: "Whether somebody should listen to the call.",
      raw: "human_review_required",
      slices: countInto(
        calls,
        (c) => analysisValue(c, "human_review_required"),
        YES_NO_PLAIN,
        { yes: "needs-person", true: "needs-person" },
      ),
    },
    {
      id: "selling",
      label: "Somebody selling",
      means: "Whether the caller was selling something to us.",
      raw: "sales_or_spam",
      slices: countInto(calls, (c) => analysisValue(c, "sales_or_spam"), YES_NO_PLAIN, {
        yes: "selling",
        true: "selling",
      }),
    },
    {
      id: "ended",
      label: "How the call ended",
      means: "Why each call finished.",
      raw: "disconnection_reason",
      slices: countInto(calls, (c) => c.disconnection_reason, DISCONNECT_PLAIN),
    },
  ];
}

/**
 * Count calls by one answer, turning each into plain words.
 *
 * `filterIds` maps an answer to a quick-filter id on the agent page, so a
 * slice can be clicked through to the calls behind it.
 */
function countInto(
  calls: RetellCall[],
  pick: (c: RetellCall) => string | undefined,
  plainMap: Record<string, Plain>,
  filterIds: Record<string, string> = {},
): Slice[] {
  // The fixed hue order: the order the answers are written in plain.ts. An
  // answer keeps its colour however the counts come out.
  const order = Object.keys(plainMap);
  const counts = new Map<string, number>();
  for (const call of calls) {
    // A blank answer and the answer "unknown" mean different things, so they
    // must never share a bucket. Blank becomes "(not recorded)".
    const key = pick(call) ?? "(not recorded)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = calls.length;
  return [...counts.entries()]
    .map(([key, count]) => {
      const plain =
        key === "(not recorded)"
          ? {
              label: "Not recorded",
              means: "Nothing at all was saved here for these calls.",
            }
          : plainOr(plainMap, key);
      const isUnknown = GREY_KEYS.has(key);
      const at = order.indexOf(key);
      return {
        key,
        label: plain.label,
        means: plain.means,
        count,
        share: total ? (count / total) * 100 : 0,
        isUnknown,
        // An answer we have never seen goes to the end of the fixed order
        // rather than stealing a hue that already belongs to something else.
        colorIndex: isUnknown ? -1 : at >= 0 ? at : order.length,
        filterId: filterIds[key],
      };
    })
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ *
 * Report 2: what work did they want
 * ------------------------------------------------------------------ */

export type ServiceReport = {
  slices: Slice[];
  /** How many calls the agent answered itself, once that field exists. */
  fromField: number;
  /** How many were guessed from the caller's words. */
  fromWords: number;
  /** How many had no words at all. */
  noWords: number;
  /** How many had words that matched no rule. */
  noMatch: number;
};

export function serviceReport(calls: RetellCall[]): ServiceReport {
  const counts = new Map<string, { label: string; count: number }>();
  let fromField = 0;
  let fromWords = 0;

  for (const call of calls) {
    const text = [
      analysisValue(call, "issue_summary"),
      analysisValue(call, "vehicle_or_equipment"),
      analysisValue(call, "year_make_model_unit"),
    ]
      .filter(Boolean)
      .join(" ");

    const result = bucketFor(analysisValue(call, "service_category"), text);
    if (result.source === "field") fromField += 1;
    if (result.source === "words") fromWords += 1;

    const row = counts.get(result.id) ?? { label: result.label, count: 0 };
    row.count += 1;
    counts.set(result.id, row);
  }

  const total = calls.length;
  const order = SERVICE_BUCKETS.map((b) => b.id);
  const slices: Slice[] = [...counts.entries()]
    .map(([key, row]) => {
      const isUnknown = GREY_KEYS.has(key);
      const at = order.indexOf(key);
      return {
        key,
        label: row.label,
        means: bucketMeans(key),
        count: row.count,
        share: total ? (row.count / total) * 100 : 0,
        isUnknown,
        colorIndex: isUnknown ? -1 : at >= 0 ? at : order.length,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    slices,
    fromField,
    fromWords,
    noWords: counts.get(NO_WORDS.id)?.count ?? 0,
    noMatch: counts.get(NO_MATCH.id)?.count ?? 0,
  };
}

/* ------------------------------------------------------------------ *
 * Calls per day, stacked by kind
 * ------------------------------------------------------------------ */

export type TrendDay = {
  /** "2026-09-17" */
  day: string;
  /** "17 Sep" */
  label: string;
  total: number;
  /** One count per call type, keyed the same way as the slices. */
  counts: Record<string, number>;
};

export function trendByDay(calls: RetellCall[], days: number): TrendDay[] {
  const byDay = new Map<string, Record<string, number>>();

  for (const call of calls) {
    if (!call.start_timestamp) continue;
    const key = dayKey(call.start_timestamp);
    const type = analysisValue(call, "call_type") ?? "(not recorded)";
    const row = byDay.get(key) ?? {};
    row[type] = (row[type] ?? 0) + 1;
    byDay.set(key, row);
  }

  // Every day in the range appears, including the quiet ones. A missing day
  // on a line chart reads as "no data", which is not the same as "no calls".
  const out: TrendDay[] = [];
  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (let i = days - 1; i >= 0; i -= 1) {
    const ms = now - i * oneDay;
    const key = dayKey(ms);
    const counts = byDay.get(key) ?? {};
    out.push({
      day: key,
      label: shortDay(key),
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      counts,
    });
  }
  return out;
}

function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(d)} ${months[Number(m) - 1] ?? ""}`;
}

/* ------------------------------------------------------------------ *
 * This period against the one before it
 * ------------------------------------------------------------------ */

export type Change = {
  label: string;
  now: number;
  before: number;
  /** A whole sentence, because a bare arrow tells nobody anything. */
  sentence: string;
  tone: "good" | "bad" | "neutral";
};

/**
 * Compare two equal periods.
 *
 * `higherIsBetter` is stated per row rather than guessed, and `null` means
 * nobody has decided. More service calls is good news; more calls with details
 * missing is not; more calls in total is neither, so it gets no colour at all.
 * Painting a number red is a judgement, and the page should not make one
 * nobody asked for.
 */
export function compare(
  label: string,
  now: number,
  before: number,
  higherIsBetter: boolean | null,
  /**
   * True when the whole period before this one had no calls at all. Then there
   * is nothing to compare with, and saying "384 more than before" is a silly
   * answer dressed up as an insight. Agent B has only existed for a few
   * months, so any 90-day comparison hits this.
   */
  nothingBefore = false,
  unit = "",
): Change {
  if (nothingBefore) {
    return {
      label,
      now,
      before,
      sentence:
        "Nothing to compare with: there were no calls at all in the same length of time before this.",
      tone: "neutral",
    };
  }

  const diff = now - before;
  const word = diff > 0 ? "more" : "fewer";
  const sentence =
    diff === 0
      ? `The same as the time before (${before}${unit}).`
      : `${Math.abs(diff)}${unit} ${word} than the same length of time before it (${before}${unit}).`;

  const tone: Change["tone"] =
    diff === 0 || higherIsBetter === null
      ? "neutral"
      : (diff > 0) === higherIsBetter
        ? "good"
        : "bad";

  return { label, now, before, sentence, tone };
}
