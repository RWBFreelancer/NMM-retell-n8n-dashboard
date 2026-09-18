import "server-only";
import type { RetellCall } from "./retell";
import { analysisValue, isYes } from "./stats";

/**
 * The quick filters on an agent page.
 *
 * Each one answers a question somebody actually asks: "show me the calls that
 * went wrong." They are defined once, here, so the chip, the count and the CSV
 * can never disagree about what a filter means.
 *
 * Filtering happens over the calls already loaded for the chosen date range,
 * not with a second trip to Retell. That way the page can honestly say
 * "19 of 45 calls", and two filters can be on at once.
 */

export type CallFilter = {
  /** Goes in the URL as ?f=<id>. Short, because it is typed by hand sometimes. */
  id: string;
  /** What the chip says. Plain words, never a field name. */
  label: string;
  /** One sentence, shown as a tooltip and in the explain panel. */
  means: string;
  /** The raw field behind it. Shown only in Technical mode. */
  raw: string;
  keep: (call: RetellCall) => boolean;
};

export const CALL_FILTERS: CallFilter[] = [
  {
    id: "missing",
    label: "Details missing",
    means: "The agent did not get everything Daniel needs to open a job.",
    raw: "incomplete_intake = true",
    keep: (c) => isYes(c, "incomplete_intake"),
  },
  {
    id: "needs-person",
    label: "Needs a person",
    means: "Somebody should listen to this call before anything else happens.",
    raw: "human_review_required = true",
    keep: (c) => isYes(c, "human_review_required"),
  },
  {
    id: "asked-human",
    label: "Asked for a human",
    means: "The caller asked to speak to a real person.",
    raw: "caller_requested_human = true",
    keep: (c) => isYes(c, "caller_requested_human"),
  },
  {
    id: "selling",
    label: "Somebody selling",
    means: "The caller was selling something to us, not asking for work.",
    raw: "sales_or_spam = true",
    keep: (c) => isYes(c, "sales_or_spam"),
  },
  {
    id: "wrong-number",
    label: "Wrong number",
    means: "The caller reached us by mistake. Agent A does not record this.",
    raw: "is_wrong_number = true",
    keep: (c) => isYes(c, "is_wrong_number"),
  },
  {
    id: "not-successful",
    label: "Went badly",
    means: "Retell judged that this call did not achieve what it set out to do.",
    raw: "call_analysis.call_successful = false",
    keep: (c) => c.call_analysis?.call_successful === false,
  },
  {
    id: "said-nothing",
    label: "Never said what they wanted",
    means: "Mostly hang-ups. Half of all calls land here, so it is worth a look.",
    raw: 'call_type = "unknown"',
    keep: (c) => analysisValue(c, "call_type") === "unknown",
  },
];

export function findFilter(id: string): CallFilter | undefined {
  return CALL_FILTERS.find((f) => f.id === id);
}

/**
 * Read ?f= from the URL. It can repeat, and Next hands a repeat over as an
 * array, so cope with both shapes. Unknown ids are dropped rather than
 * guessed at.
 */
export function readFilters(raw: string | string[] | undefined): CallFilter[] {
  if (raw === undefined) return [];
  const ids = Array.isArray(raw) ? raw : raw.split(",");
  return ids.map((id) => findFilter(id.trim())).filter((f): f is CallFilter => Boolean(f));
}

/** Every filter must pass. Two chips on means "both of these", not "either". */
export function applyFilters(calls: RetellCall[], filters: CallFilter[]): RetellCall[] {
  if (filters.length === 0) return calls;
  return calls.filter((call) => filters.every((f) => f.keep(call)));
}

/**
 * Find one call by its id, or by the tail of it.
 *
 * A Retell call id is long, and a person pasting one from a log often pastes a
 * fragment. Matching on "contains" is kinder and cannot match the wrong call
 * in a list this small.
 */
export function applySearch(calls: RetellCall[], search: string): RetellCall[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return calls;
  return calls.filter((c) => c.call_id.toLowerCase().includes(needle));
}
