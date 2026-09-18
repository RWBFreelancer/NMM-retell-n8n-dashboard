import "server-only";
import type { RetellCall } from "./retell";
import { analysisValue } from "./stats";
import { FIELDS, FIELD_GROUPS, fieldLabel, type FieldSpec } from "./fields";
import {
  COST_PRODUCT_PLAIN,
  NEXT_ACTION_PLAIN,
  plainOr,
  prettify,
  type Tone,
} from "./plain";
import { money } from "./format";

/**
 * Everything the call detail page shows, worked out on the server.
 *
 * The page and its client components get plain data: strings, numbers, tones.
 * No code lookup, no counting rule and no formatting decision happens in the
 * browser, so Simple mode cannot leak a raw field name by accident.
 */

export type FieldRow = {
  name: string;
  label: string;
  means: string;
  /** What Simple mode shows. Always words. */
  value: string;
  /** The raw value, for Technical mode. "" when nothing was saved. */
  raw: string;
  /** True when the value is a chip, false when it is a paragraph of text. */
  isChip: boolean;
  tone: Tone;
  /** Hidden until the person asks to see it. */
  personal: boolean;
};

export type FieldGroupRows = {
  id: string;
  label: string;
  means: string;
  rows: FieldRow[];
};

/**
 * Group the analysis fields for one call.
 *
 * A field the agent never wrote is left out completely. Agent A writes 34 of
 * the 37, so three rows would otherwise sit empty on every Agent A call and
 * look like a fault.
 */
export function fieldGroups(call: RetellCall): FieldGroupRows[] {
  const data = call.call_analysis?.custom_analysis_data ?? {};

  return FIELD_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    means: group.means,
    rows: FIELDS.filter((f) => f.group === group.id)
      .filter((f) => f.name in data)
      .map((f) => fieldRow(f, analysisValue(call, f.name))),
  })).filter((g) => g.rows.length > 0);
}

function fieldRow(spec: FieldSpec, raw: string | undefined): FieldRow {
  const base = {
    name: spec.name,
    label: spec.label,
    means: spec.means,
    raw: raw ?? "",
    personal: Boolean(spec.personal),
  };

  // The agent wrote the field but left it empty. That is a real answer: it
  // means nothing was said. It is never dressed up as anything else.
  if (raw === undefined) {
    return { ...base, value: "Nothing was said", isChip: true, tone: "neutral" };
  }

  if (spec.kind === "choice") {
    const plain = plainOr(spec.choices ?? {}, raw);
    return {
      ...base,
      value: plain.label,
      means: plain.soWhat ? `${plain.means} ${plain.soWhat}` : plain.means,
      isChip: true,
      tone: plain.tone ?? "neutral",
    };
  }

  if (spec.kind === "yesno") {
    return { ...base, ...yesNo(spec, raw), isChip: true };
  }

  if (spec.kind === "list") {
    const names = raw
      .split(/[,;]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) {
      return { ...base, value: "Nothing was said", isChip: true, tone: "neutral" };
    }
    // The agent writes raw field names here, so turn each one into its label.
    return {
      ...base,
      value: names.map(fieldLabel).join(", "),
      isChip: false,
      tone: "warn",
    };
  }

  // Free text. The word "unknown" is the agent's way of saying nothing was
  // given, so it must not look like a real answer.
  if (/^(unknown|none|n\/a|null)$/i.test(raw.trim())) {
    return { ...base, value: "Nothing was said", isChip: true, tone: "neutral" };
  }

  // Sometimes the agent writes a bare code into a field meant for a sentence.
  // `recommended_next_action` does it with `human_review`, because its own
  // instruction offers that word as an example. Seen in real calls both as the
  // whole value and as the opening word of a sentence.
  const token = raw.trim();
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(token)) {
    const plain = plainOr(NEXT_ACTION_PLAIN, token);
    return {
      ...base,
      value: plain.label,
      means: plain.soWhat ? `${plain.means} ${plain.soWhat}` : plain.means,
      isChip: true,
      tone: plain.tone ?? "neutral",
    };
  }

  return { ...base, value: plainProse(raw), isChip: false, tone: "neutral" };
}

/**
 * Take any leftover code out of a sentence the agent wrote.
 *
 * The agent sometimes drops a bare code into prose, for example
 * "human_review, caller hung up before providing information". A code must
 * never reach the screen in Simple mode, so each one becomes words: its own
 * plain label if we have one, otherwise the field's label, otherwise just the
 * same word with the underscores taken out. Nothing is deleted and nothing is
 * invented. Technical mode still shows the untouched value underneath.
 *
 * Only a bare lower-case snake_case word is touched. A VIN, a model name and
 * an ordinary sentence all pass through unchanged.
 */
function plainProse(raw: string): string {
  return raw.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) => {
    const known = NEXT_ACTION_PLAIN[token];
    if (known) return known.label;
    return fieldLabel(token);
  });
}

/**
 * Read a yes / no / could-not-tell answer.
 *
 * The agents disagree on the words. Agent B answers `yes|no|unknown` for
 * `service_request`; Agent A answers `true|false` for the same field. Both are
 * handled here rather than in every caller.
 */
function yesNo(
  spec: FieldSpec,
  raw: string,
): { value: string; tone: Tone; means: string } {
  const v = raw.trim().toLowerCase();

  if (v === "yes" || v === "true") {
    return {
      value: spec.yesLabel ?? "Yes",
      tone: spec.yesTone ?? "good",
      means: spec.means,
    };
  }
  if (v === "no" || v === "false") {
    return { value: spec.noLabel ?? "No", tone: "neutral", means: spec.means };
  }
  if (v === "unknown") {
    return {
      value: "Could not tell",
      tone: "warn",
      means: "Too little was said for the agent to answer this one.",
    };
  }
  // Something we have not seen. Show it rather than hide it.
  return { value: prettify(raw), tone: "neutral", means: spec.means };
}

/* ------------------------------------------------------------------ *
 * The problem chips at the top
 * ------------------------------------------------------------------ */

export type Warning = { label: string; means: string; tone: Tone };

/**
 * The things somebody should see before reading anything else.
 *
 * Only real problems go here. A page full of chips teaches people to ignore
 * chips, so a calm call shows none at all.
 */
export function warnings(call: RetellCall): Warning[] {
  const out: Warning[] = [];
  const yes = (field: string) => {
    const v = analysisValue(call, field)?.toLowerCase();
    return v === "yes" || v === "true";
  };

  const missing = listOf(call, "missing_required_fields");
  if (missing.length > 0) {
    out.push({
      label: `Missing: ${missing.map(fieldLabel).join(", ")}`,
      means: "Daniel needs these and the agent did not get them.",
      tone: "bad",
    });
  }

  const uncertain = listOf(call, "uncertain_fields");
  if (uncertain.length > 0) {
    out.push({
      label: `Shaky: ${uncertain.map(fieldLabel).join(", ")}`,
      means: "The agent wrote these down but was not confident about them.",
      tone: "warn",
    });
  }

  if (yes("human_review_required")) {
    out.push({
      label: "Somebody should listen to this",
      means: "The agent asked for a person to check the call.",
      tone: "warn",
    });
  }
  if (yes("caller_requested_human")) {
    out.push({
      label: "The caller asked for a person",
      means: "They did not want to talk to the agent.",
      tone: "warn",
    });
  }
  if (yes("roadside_or_safety_concern")) {
    out.push({
      label: "Somebody may be stranded or unsafe",
      means: "The caller described a roadside or safety problem.",
      tone: "bad",
    });
  }
  if (yes("do_not_auto_create_job")) {
    out.push({
      label: "Do not open a job from this",
      means: "The agent flagged that this must not become a job by itself.",
      tone: "warn",
    });
  }
  if (call.call_analysis?.in_voicemail) {
    out.push({
      label: "This reached an answering machine",
      means: "No person was on the other end.",
      tone: "neutral",
    });
  }
  if (call.call_analysis?.call_successful === false) {
    out.push({
      label: "Retell judged this call a failure",
      means: "It did not achieve what it set out to do.",
      tone: "bad",
    });
  }

  return out;
}

function listOf(call: RetellCall, field: string): string[] {
  const raw = analysisValue(call, field);
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Reply speed and cost
 * ------------------------------------------------------------------ */

export type SpeedRow = {
  label: string;
  means: string;
  /** "1.3s" */
  typical: string;
  /** "3.1s" */
  slowest: string;
  tone: Tone;
};

/**
 * How fast the agent replied.
 *
 * p50 is the middle: half the replies were faster. p90 is the slow tail: one
 * reply in ten was slower than this. Those two answer "is it usually quick?"
 * and "does it ever hang?", which is all anybody actually wants to know.
 */
export function speedRows(call: RetellCall): SpeedRow[] {
  const parts: Array<[string, string, keyof NonNullable<RetellCall["latency"]>]> = [
    ["Whole reply", "From the caller stopping to the agent starting to speak.", "e2e"],
    ["Thinking", "Working out what to say.", "llm"],
    ["Speaking", "Turning the words into a voice.", "tts"],
    ["Hearing", "Turning the caller's speech into text.", "asr"],
  ];

  const rows: SpeedRow[] = [];
  for (const [label, means, key] of parts) {
    const stat = call.latency?.[key];
    if (!stat?.p50) continue;
    rows.push({
      label,
      means,
      typical: seconds(stat.p50),
      slowest: seconds(stat.p90 ?? stat.max),
      // Over two seconds of silence feels broken to a caller on the phone.
      tone: key === "e2e" ? (stat.p50 > 2000 ? "bad" : stat.p50 > 1200 ? "warn" : "good") : "neutral",
    });
  }
  return rows;
}

function seconds(ms?: number): string {
  if (ms === undefined) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export type CostRow = { label: string; means: string; amount: string };

/** The bill for this call, one line per thing, biggest first. */
export function costRows(call: RetellCall): CostRow[] {
  const parts = call.call_cost?.product_costs ?? [];
  return [...parts]
    .sort((a, b) => b.cost - a.cost)
    .map((p) => {
      const plain = plainOr(COST_PRODUCT_PLAIN, p.product);
      return { label: plain.label, means: plain.means, amount: money(p.cost) };
    });
}
