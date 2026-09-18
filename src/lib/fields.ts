import { prettify, type Plain, type Tone } from "./plain";
import {
  CALL_TYPE_PLAIN,
  CONFIDENCE_PLAIN,
  CUSTOMER_PLAIN,
  DRIVABLE_PLAIN,
  URGENCY_PLAIN,
} from "./plain";

/**
 * The post-call analysis fields, in plain English.
 *
 * Agent B writes 37 of these after every call. Agent A writes 34: it has no
 * `is_wrong_number`, `wrong_number_certain` or `follow_up_reason`. A field the
 * agent did not write is skipped entirely, never shown as an empty row.
 *
 * Checked against the live agents on 2026-09-18 with `GET /get-agent/{id}`,
 * not copied from a file. Two surprises worth knowing:
 *
 *  - `service_request` answers `yes|no|unknown` on Agent B but `true|false` on
 *    Agent A. Both shapes are handled.
 *  - `roadside_or_safety_concern` and `is_wrong_number` are enums whose choices
 *    are the words "true" and "false", not real booleans.
 *
 * Longer definitions, and what real calls actually returned, are in the parent
 * repo at `docs/handoff-field-dictionary.md`.
 */

export type FieldGroup = "caller" | "job" | "place" | "flags" | "quality";

export type FieldKind =
  /** Free text the caller said. */
  | "text"
  /** One of a fixed set of answers. Uses `choices`. */
  | "choice"
  /** Yes, no, or could not tell. Covers yes/no, true/false and blank. */
  | "yesno"
  /** Free text holding a comma-separated list of field names. */
  | "list";

export type FieldSpec = {
  /** The raw name, as Retell writes it. Shown only in Technical mode. */
  name: string;
  /** What a person reads. Never the raw name. */
  label: string;
  /** One sentence saying what this field is. */
  means: string;
  group: FieldGroup;
  kind: FieldKind;
  /** For `choice`: the plain words for each answer. */
  choices?: Record<string, Plain>;
  /** For `yesno`: what a "yes" should be called, when "Yes" is too bland. */
  yesLabel?: string;
  /** For `yesno`: what a "no" should be called. */
  noLabel?: string;
  /** For `yesno`: the colour a "yes" deserves. A yes is not always good news. */
  yesTone?: Tone;
  /** A caller's name, number or address. Hidden until somebody asks. */
  personal?: boolean;
};

export const FIELD_GROUPS: Array<{
  id: FieldGroup;
  label: string;
  means: string;
}> = [
  {
    id: "quality",
    label: "The short version",
    means: "What the agent made of this call, and how sure it was.",
  },
  {
    id: "caller",
    label: "Who called",
    means: "Who rang, and how to ring them back.",
  },
  {
    id: "job",
    label: "The vehicle and the problem",
    means: "What needs fixing.",
  },
  {
    id: "place",
    label: "Where, and how soon",
    means: "Where the vehicle is, and how urgent it is.",
  },
  {
    id: "flags",
    label: "Things to watch",
    means: "Answers that change what somebody should do next.",
  },
];

export const FIELDS: FieldSpec[] = [
  /* ---------------- The short version ---------------- */
  {
    name: "plain_english_summary",
    label: "What happened",
    means: "The agent's own three-sentence recap of the call.",
    group: "quality",
    kind: "text",
  },
  {
    name: "recommended_next_action",
    label: "What to do next",
    means: "The agent's suggestion for the team. A suggestion, never a decision.",
    group: "quality",
    kind: "text",
  },
  {
    name: "call_type",
    label: "What kind of call",
    means: "The single best description of why this person rang.",
    group: "quality",
    kind: "choice",
    choices: CALL_TYPE_PLAIN,
  },
  {
    name: "ai_confidence",
    label: "How sure the agent was",
    means: "The agent's own confidence in the notes it wrote.",
    group: "quality",
    kind: "choice",
    choices: CONFIDENCE_PLAIN,
  },
  {
    name: "incomplete_intake",
    label: "Details missing",
    means: "Whether the agent failed to get everything Daniel needs.",
    group: "quality",
    kind: "yesno",
    yesLabel: "Yes, something is missing",
    noLabel: "No, it is all there",
    yesTone: "bad",
  },
  {
    name: "missing_required_fields",
    label: "Which details are missing",
    means: "The things the agent needed and did not get.",
    group: "quality",
    kind: "list",
  },
  {
    name: "uncertain_fields",
    label: "Which details are shaky",
    means: "Things the agent wrote down but is not confident about.",
    group: "quality",
    kind: "list",
  },

  /* ---------------- Who called ---------------- */
  {
    name: "caller_name",
    label: "Name",
    means: "The name the caller gave.",
    group: "caller",
    kind: "text",
    personal: true,
  },
  {
    name: "company_name",
    label: "Company",
    means: "The company the caller said they are with.",
    group: "caller",
    kind: "text",
    personal: true,
  },
  {
    name: "caller_id_number",
    label: "Number they rang from",
    means: "The number the phone company said the call came from.",
    group: "caller",
    kind: "text",
    personal: true,
  },
  {
    name: "preferred_callback_number",
    label: "Best number to ring back",
    means: "The number the caller asked us to use.",
    group: "caller",
    kind: "text",
    personal: true,
  },
  {
    name: "caller_id_matches_preferred_callback_number",
    label: "Same as the number they rang from",
    means: "Whether the callback number matches the one they rang from.",
    group: "caller",
    kind: "yesno",
    yesTone: "good",
  },
  {
    name: "can_text_preferred_callback_number",
    label: "Can we text it",
    means: "Whether the caller said a text message would reach them.",
    group: "caller",
    kind: "yesno",
    yesTone: "good",
  },
  {
    name: "callback_number_note",
    label: "Note about ringing back",
    means: "Anything the caller said about when or how to reach them.",
    group: "caller",
    kind: "text",
    personal: true,
  },
  {
    name: "new_or_existing_customer",
    label: "New or returning",
    means: "Whether we have worked for this caller before.",
    group: "caller",
    kind: "choice",
    choices: CUSTOMER_PLAIN,
  },

  /* ---------------- The vehicle and the problem ---------------- */
  {
    name: "service_request",
    label: "Asked for work",
    means: "Whether the caller asked us to fix or service something.",
    group: "job",
    kind: "yesno",
    yesLabel: "Yes, they want work done",
    noLabel: "No, they do not",
    yesTone: "good",
  },
  {
    name: "vehicle_or_equipment",
    label: "What needs fixing",
    means: "The vehicle or machine the caller talked about.",
    group: "job",
    kind: "text",
  },
  {
    name: "year_make_model_unit",
    label: "Year, make and model",
    means: "The vehicle described the way the caller said it.",
    group: "job",
    kind: "text",
  },
  {
    name: "vehicle_year",
    label: "Year",
    means: "The vehicle's year, on its own.",
    group: "job",
    kind: "text",
  },
  {
    name: "vehicle_make",
    label: "Make",
    means: "Who built the vehicle.",
    group: "job",
    kind: "text",
  },
  {
    name: "vehicle_model",
    label: "Model",
    means: "The vehicle's model name.",
    group: "job",
    kind: "text",
  },
  {
    name: "vehicle_vin",
    label: "VIN",
    means: "The vehicle's serial number. Seventeen letters and digits.",
    group: "job",
    kind: "text",
    // A VIN identifies one vehicle and, through it, its owner. It belongs
    // with the name and the address, not with the make and model.
    personal: true,
  },
  {
    name: "issue_summary",
    label: "What is wrong with it",
    means: "The problem, in the caller's own words.",
    group: "job",
    kind: "text",
  },
  {
    // NOT LIVE YET. Robert has not approved this field, and no agent writes
    // it. It is written here so that the day it does exist, it appears with
    // proper wording and no code change. Its answers are deliberately read as
    // free text: nobody has decided what the choices are, and inventing them
    // here would be a guess. (parent CLAUDE.md rule 12)
    name: "service_category",
    label: "Kind of work",
    means: "The sort of job this is, such as brakes or a battery.",
    group: "job",
    kind: "text",
  },
  {
    name: "drivable_or_usable_status",
    label: "Does it still run",
    means: "Whether the vehicle can still be driven or used.",
    group: "job",
    kind: "choice",
    choices: DRIVABLE_PLAIN,
  },

  /* ---------------- Where, and how soon ---------------- */
  {
    name: "location_city",
    label: "Town",
    means: "The town the vehicle is in.",
    group: "place",
    kind: "text",
  },
  {
    name: "location_zip",
    label: "Postcode",
    means: "The ZIP code the caller gave.",
    group: "place",
    kind: "text",
  },
  {
    name: "full_address",
    label: "Full address",
    means: "The whole address, when the caller gave one.",
    group: "place",
    kind: "text",
    personal: true,
  },
  {
    name: "urgency",
    label: "How soon",
    means: "How quickly the caller needs this done.",
    group: "place",
    kind: "choice",
    choices: URGENCY_PLAIN,
  },
  {
    name: "roadside_or_safety_concern",
    label: "Stranded or unsafe",
    means: "Whether somebody is stuck at the roadside or in danger.",
    group: "place",
    kind: "yesno",
    yesLabel: "Yes, somebody is stuck",
    noLabel: "No",
    yesTone: "bad",
  },

  /* ---------------- Things to watch ---------------- */
  {
    name: "human_review_required",
    label: "Needs a person",
    means: "Whether somebody should listen before anything else happens.",
    group: "flags",
    kind: "yesno",
    yesLabel: "Yes, somebody should listen",
    noLabel: "No",
    yesTone: "warn",
  },
  {
    name: "caller_requested_human",
    label: "Asked for a human",
    means: "Whether the caller asked to speak to a real person.",
    group: "flags",
    kind: "yesno",
    yesLabel: "Yes, they asked",
    noLabel: "No",
    yesTone: "warn",
  },
  {
    name: "sales_or_spam",
    label: "Somebody selling",
    means: "Whether the caller was selling something to us.",
    group: "flags",
    kind: "yesno",
    yesLabel: "Yes, a sales call",
    noLabel: "No",
    yesTone: "neutral",
  },
  {
    name: "existing_customer_follow_up",
    label: "Chasing an old job",
    means: "Whether this is an existing customer following up on past work.",
    group: "flags",
    kind: "yesno",
    yesTone: "info",
  },
  {
    name: "do_not_auto_create_job",
    label: "Do not open a job",
    means: "Whether this call must NOT turn into a job by itself.",
    group: "flags",
    kind: "yesno",
    yesLabel: "Yes, hold it back",
    noLabel: "No, it can go through",
    yesTone: "warn",
  },
  {
    name: "is_wrong_number",
    label: "Wrong number",
    means: "Whether the caller reached us by mistake. Agent A does not record this.",
    group: "flags",
    kind: "yesno",
    yesLabel: "Yes, wrong number",
    noLabel: "No",
    yesTone: "neutral",
  },
  {
    name: "wrong_number_certain",
    label: "Sure it was a wrong number",
    means: "How certain the agent is about that. Agent A does not record this.",
    group: "flags",
    kind: "yesno",
    yesTone: "neutral",
  },
  {
    name: "follow_up_reason",
    label: "Why they are following up",
    means: "What the old job was about. Agent A does not record this.",
    group: "flags",
    kind: "text",
  },
];

/** Every field in one group, in the order they should appear. */
export function fieldsInGroup(group: FieldGroup): FieldSpec[] {
  return FIELDS.filter((f) => f.group === group);
}

export function findField(name: string): FieldSpec | undefined {
  return FIELDS.find((f) => f.name === name);
}

/**
 * Turn a raw field name into something readable.
 *
 * Used for a name that turns up inside `missing_required_fields`, which is a
 * list of raw names written by the agent. If the agent ever invents one we do
 * not know, say the raw name rather than hiding it.
 */
export function fieldLabel(name: string): string {
  return findField(name)?.label ?? prettify(name);
}
