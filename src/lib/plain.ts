/**
 * The plain-English layer.
 *
 * Every code, status and metric shown on screen comes through here first.
 * Rule: a 10-year-old must understand it. Short sentence, active voice,
 * one idea. Never print a raw code in Simple mode.
 *
 * Change wording HERE, never in a component, so it stays consistent.
 */

export type Tone = "good" | "warn" | "bad" | "info" | "neutral";

export type Plain = {
  /** The short name, shown big. */
  label: string;
  /** One sentence saying what it means. */
  means: string;
  /** Optional: what to do about it. */
  soWhat?: string;
  /** Colour family for a chip. Colour is never the only signal. */
  tone?: Tone;
};

/** Look a code up, and never come back empty-handed. */
export function plainOr(
  map: Record<string, Plain>,
  code: string | null | undefined,
): Plain {
  if (code === null || code === undefined || code === "") {
    return {
      label: "Not recorded",
      means: "Nothing was saved here for this call.",
      tone: "neutral",
    };
  }
  const hit = map[code];
  if (hit) return hit;
  return {
    label: prettify(code),
    means:
      "We have not seen this one before, so there is no plain description yet.",
    tone: "neutral",
  };
}

/** Turn a snake_case code into readable words, as a last resort only. */
export function prettify(code: string): string {
  return code
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ *
 * How the call ended
 * ------------------------------------------------------------------ */

export const DISCONNECT_PLAIN: Record<string, Plain> = {
  user_hangup: {
    label: "Caller hung up",
    means: "The caller ended the call.",
    tone: "neutral",
  },
  agent_hangup: {
    label: "Agent ended it",
    means: "The agent finished and ended the call itself.",
    tone: "good",
  },
  call_transfer: {
    label: "Passed to a person",
    means: "The call was handed to somebody else.",
    tone: "info",
  },
  voicemail_reached: {
    label: "Hit voicemail",
    means: "An answering machine picked up, not a person.",
    tone: "neutral",
  },
  ivr_reached: {
    label: "Hit a phone menu",
    means: "A press-1-for-sales menu answered, not a person.",
    tone: "neutral",
  },
  inactivity: {
    label: "Went quiet",
    means: "Nobody said anything for a long time, so the call ended.",
    tone: "warn",
  },
  max_duration_reached: {
    label: "Ran out of time",
    means: "The call hit the longest time we allow.",
    tone: "warn",
  },
  concurrency_limit_reached: {
    label: "Too many calls at once",
    means: "We were already on the most calls our plan allows.",
    soWhat: "If this shows up often, the plan needs more lines.",
    tone: "bad",
  },
  no_concurrency_fallback: {
    label: "Too many calls, no backup",
    means: "All our lines were busy and there was nowhere to send the caller.",
    soWhat: "Check this one. The caller got nothing.",
    tone: "bad",
  },
  no_valid_payment: {
    label: "Billing problem",
    means: "Retell could not charge the account, so the call stopped.",
    soWhat: "Check the Retell billing page now.",
    tone: "bad",
  },
  scam_detected: {
    label: "Looked like a scam",
    means: "Retell thought this call was fraud and stopped it.",
    tone: "warn",
  },
  dial_busy: {
    label: "Line was busy",
    means: "We called out and got a busy tone.",
    tone: "neutral",
  },
  dial_failed: {
    label: "Call would not connect",
    means: "We tried to call out and it failed.",
    tone: "warn",
  },
  dial_no_answer: {
    label: "Nobody picked up",
    means: "We called out and nobody answered.",
    tone: "neutral",
  },
  invalid_destination: {
    label: "Bad number",
    means: "The number we tried to reach is not a real number.",
    tone: "bad",
  },
  telephony_provider_permission_denied: {
    label: "Phone company blocked it",
    means: "The phone company would not let this call through.",
    tone: "bad",
  },
  telephony_provider_unavailable: {
    label: "Phone company was down",
    means: "The phone company could not take the call.",
    tone: "bad",
  },
  sip_routing_error: {
    label: "Call routing broke",
    means: "The call got lost on its way to us.",
    tone: "bad",
  },
  marked_as_spam: {
    label: "Marked as spam",
    means: "The call was flagged as junk.",
    tone: "warn",
  },
  user_declined: {
    label: "Caller refused",
    means: "The caller would not join the call.",
    tone: "neutral",
  },
  error_llm_websocket_open: {
    label: "Agent could not start",
    means: "The brain behind the agent never connected, so it could not speak.",
    soWhat: "Listen to this one. The caller may have heard silence.",
    tone: "bad",
  },
  error_llm_websocket_lost_connection: {
    label: "Agent lost connection",
    means: "The brain behind the agent dropped out in the middle of the call.",
    soWhat: "Listen to this one.",
    tone: "bad",
  },
  error_llm_websocket_runtime: {
    label: "Agent crashed",
    means: "Something broke inside the agent while it was talking.",
    soWhat: "Listen to this one.",
    tone: "bad",
  },
  error_llm_websocket_corrupt_payload: {
    label: "Agent got bad data",
    means: "The agent received something it could not read.",
    tone: "bad",
  },
  error_no_audio_received: {
    label: "We heard nothing",
    means: "No sound came from the caller at all.",
    tone: "warn",
  },
  error_asr: {
    label: "Could not hear the words",
    means: "The part that turns speech into text broke.",
    tone: "bad",
  },
  error_retell: {
    label: "Retell broke",
    means: "Something went wrong inside Retell itself.",
    tone: "bad",
  },
  error_unknown: {
    label: "Unknown error",
    means: "The call failed and nobody recorded why.",
    tone: "bad",
  },
  error_user_not_joined: {
    label: "Caller never joined",
    means: "The caller never actually got on the call.",
    tone: "warn",
  },
  registered_call_timeout: {
    label: "Call never started",
    means: "The call was set up but nobody ever dialled in.",
    tone: "neutral",
  },
  transfer_bridged: {
    label: "Passed on, and it worked",
    means: "The call was handed to a person and they picked up.",
    tone: "good",
  },
  transfer_cancelled: {
    label: "Hand-off cancelled",
    means: "We started to pass the call on, then stopped.",
    tone: "warn",
  },
  manual_stopped: {
    label: "Somebody stopped it",
    means: "A person ended this call by hand.",
    tone: "neutral",
  },
  call_take_over: {
    label: "A person took over",
    means: "Somebody stepped in and took the call from the agent.",
    tone: "info",
  },
};

/* ------------------------------------------------------------------ *
 * Where the call is right now
 * ------------------------------------------------------------------ */

export const CALL_STATUS_PLAIN: Record<string, Plain> = {
  registered: {
    label: "Waiting to start",
    means: "The call is set up but has not begun.",
    tone: "neutral",
  },
  not_connected: {
    label: "Never connected",
    means: "The call was set up but never joined up.",
    tone: "warn",
  },
  ongoing: {
    label: "Happening now",
    means: "This call is live right now.",
    tone: "info",
  },
  ended: {
    label: "Finished",
    means: "The call is over.",
    tone: "neutral",
  },
  error: {
    label: "Broke",
    means: "Something went wrong and the call failed.",
    soWhat: "Worth a listen.",
    tone: "bad",
  },
};

/* ------------------------------------------------------------------ *
 * Did the lead reach Daniel? This is the question the dashboard exists for.
 * ------------------------------------------------------------------ */

export type RecapStatus = "success" | "error" | "running" | "waiting" | "none";

export const RECAP_STATUS_PLAIN: Record<RecapStatus, Plain> = {
  success: {
    label: "Daniel got it",
    means: "The recap ran and the lead was sent on.",
    tone: "good",
  },
  error: {
    label: "Did not reach Daniel",
    means: "The recap ran but it failed part way. Daniel never got this lead.",
    soWhat: "Open it and read which step went red.",
    tone: "bad",
  },
  running: {
    label: "Still going",
    means: "The recap started and has not finished yet.",
    tone: "info",
  },
  waiting: {
    label: "Waiting",
    means: "The recap is queued and has not started yet.",
    tone: "info",
  },
  none: {
    label: "No recap at all",
    means: "Nothing ran for this call. Not even a failure.",
    soWhat: "This is the quiet one. Check it first.",
    tone: "bad",
  },
};

/* ------------------------------------------------------------------ *
 * The numbers on the tiles
 * ------------------------------------------------------------------ */

export const METRIC_PLAIN: Record<string, Plain> = {
  calls_total: {
    label: "Calls",
    means: "How many calls came in during this time.",
  },
  calls_today: {
    label: "Calls today",
    means: "Calls since midnight, California time.",
  },
  avg_duration: {
    label: "Average call length",
    means: "How long a typical call lasted.",
  },
  total_cost: {
    label: "What it cost",
    means: "What Retell charged for these calls, added up.",
  },
  service_requests: {
    label: "Real service calls",
    means: "Callers who wanted work done on a vehicle or a machine.",
  },
  incomplete_rate: {
    label: "Missing details",
    means: "Calls where the agent did not get everything Daniel needs.",
  },
  human_review_rate: {
    label: "Needs a person",
    means: "Calls somebody should listen to before anything else happens.",
  },
  reached_daniel: {
    label: "Reached Daniel",
    means: "Leads that made it all the way to the system Daniel runs.",
  },
  no_recap: {
    label: "No recap at all",
    means: "Calls where nothing ran afterwards. The quiet failure.",
    soWhat: "This number should be zero.",
  },
  reply_speed: {
    label: "Reply speed",
    means: "How long the agent waited before it spoke, on a normal turn.",
  },
  hangup_rate: {
    label: "Hung up early",
    means: "Callers who put the phone down before saying what they wanted.",
  },
};

/* ------------------------------------------------------------------ *
 * What kind of call it was. `call_type` on the agent.
 *
 * "unknown" is a real answer here: the agent decided it could not tell,
 * usually a hang-up. It is never folded into anything else, and it never
 * shares a bucket with "(not recorded)", which means nothing was saved.
 * ------------------------------------------------------------------ */

export const CALL_TYPE_PLAIN: Record<string, Plain> = {
  service_request: {
    label: "Wants work done",
    means: "The caller asked us to fix or service a vehicle or a machine.",
    tone: "good",
  },
  roadside_urgent: {
    label: "Stuck at the roadside",
    means: "The caller was stranded or unsafe and needed help right away.",
    soWhat: "These come first.",
    tone: "bad",
  },
  existing_customer_follow_up: {
    label: "Customer following up",
    means: "Somebody we have already worked for rang about that job.",
    tone: "info",
  },
  non_service_business_message: {
    label: "Business message",
    means: "A business caller who was not selling. A supplier, or a question.",
    tone: "neutral",
  },
  sales_solicitation: {
    label: "Somebody selling",
    means: "The caller wanted to sell us something.",
    soWhat: "No action needed.",
    tone: "neutral",
  },
  unknown: {
    label: "Never said",
    means: "The caller never said what they wanted. Usually a hang-up.",
    tone: "warn",
  },
};

/* ------------------------------------------------------------------ *
 * How soon it is needed. `urgency` on the agent.
 * ------------------------------------------------------------------ */

export const URGENCY_PLAIN: Record<string, Plain> = {
  high: {
    label: "Needed now",
    means: "Today or by tomorrow morning, or somebody is stranded.",
    tone: "bad",
  },
  medium: {
    label: "Needed soon",
    means: "Within the next few days.",
    tone: "warn",
  },
  low: {
    label: "No rush",
    means: "Routine work. The timing is flexible.",
    tone: "good",
  },
  unknown: {
    label: "Never said",
    means: "The caller did not say how soon they needed it.",
    tone: "neutral",
  },
};

/* ------------------------------------------------------------------ *
 * A yes / no / unknown answer.
 *
 * The agent can answer three ways, and the three mean different things.
 * Blank is a fourth thing again, and plainOr() handles that one.
 * ------------------------------------------------------------------ */

export const YES_NO_PLAIN: Record<string, Plain> = {
  yes: { label: "Yes", means: "The agent answered yes.", tone: "good" },
  true: { label: "Yes", means: "The agent answered yes.", tone: "good" },
  no: { label: "No", means: "The agent answered no.", tone: "neutral" },
  false: { label: "No", means: "The agent answered no.", tone: "neutral" },
  unknown: {
    label: "Could not tell",
    means: "Too little was said for the agent to answer.",
    tone: "warn",
  },
};

/* ------------------------------------------------------------------ *
 * How sure the agent was about what it wrote down. `ai_confidence`.
 * ------------------------------------------------------------------ */

export const CONFIDENCE_PLAIN: Record<string, Plain> = {
  high: { label: "Sure", means: "The agent was confident in these notes.", tone: "good" },
  medium: { label: "Fairly sure", means: "The agent was reasonably confident.", tone: "warn" },
  low: {
    label: "Not sure",
    means: "The agent doubted its own notes on this call.",
    soWhat: "Worth a listen.",
    tone: "bad",
  },
};

/* ------------------------------------------------------------------ *
 * The one-line meaning of each column and each filter on the agent page.
 * A heading is a promise about what the column holds, so it lives here
 * with everything else a person reads.
 * ------------------------------------------------------------------ */

export const COLUMN_PLAIN: Record<string, Plain> = {
  when: { label: "When", means: "When the call started, California time." },
  from: { label: "Caller", means: "The number that rang in. Hidden until you unhide it." },
  length: { label: "Length", means: "How long the call lasted." },
  call_type: { label: "What they wanted", means: "The kind of call the agent decided this was." },
  urgency: { label: "How soon", means: "How quickly the caller needs the work done." },
  service_request: { label: "Asked for work", means: "Whether the caller asked us to fix something." },
  incomplete_intake: {
    label: "Details missing",
    means: "The agent did not get everything Daniel needs.",
  },
  ended: { label: "How it ended", means: "Why the call finished." },
  cost: { label: "Cost", means: "What Retell charged for this call." },
};

/* ------------------------------------------------------------------ *
 * Have we worked for this caller before? `new_or_existing_customer`.
 * ------------------------------------------------------------------ */

export const CUSTOMER_PLAIN: Record<string, Plain> = {
  new: {
    label: "New to us",
    means: "We have not worked for this caller before.",
    tone: "info",
  },
  existing: {
    label: "Already a customer",
    means: "We have worked for this caller before.",
    tone: "good",
  },
  unknown: {
    label: "Never said",
    means: "The caller did not say whether they had used us before.",
    tone: "neutral",
  },
};

/* ------------------------------------------------------------------ *
 * Can the vehicle still be driven? `drivable_or_usable_status`.
 *
 * The agent never asks this outright. It only writes it down when the
 * caller volunteers it, which is why almost every call says "never said".
 * ------------------------------------------------------------------ */

export const DRIVABLE_PLAIN: Record<string, Plain> = {
  drivable: {
    label: "Still drives",
    means: "The caller said the vehicle or machine still works.",
    tone: "good",
  },
  not_drivable: {
    label: "Cannot be driven",
    means: "The caller said it is dead, stuck, or unsafe to use.",
    soWhat: "Somebody may be stranded.",
    tone: "bad",
  },
  unknown: {
    label: "Never said",
    means: "The caller did not mention it, and the agent does not ask.",
    tone: "neutral",
  },
};

/* ------------------------------------------------------------------ *
 * How the caller sounded. Retell writes this one, not our agent.
 * ------------------------------------------------------------------ */

export const SENTIMENT_PLAIN: Record<string, Plain> = {
  Positive: { label: "Happy", means: "The caller sounded pleased.", tone: "good" },
  Neutral: { label: "Neutral", means: "The caller sounded neither happy nor cross.", tone: "neutral" },
  Negative: { label: "Unhappy", means: "The caller sounded cross or upset.", soWhat: "Worth a listen.", tone: "bad" },
  Unknown: { label: "Could not tell", means: "Too little was said to judge.", tone: "neutral" },
};

/* ------------------------------------------------------------------ *
 * What Retell charges for. One line per thing on the bill.
 * ------------------------------------------------------------------ */

export const COST_PRODUCT_PLAIN: Record<string, Plain> = {
  retell_voice_engine: { label: "Running the agent", means: "Retell's own charge for handling the call." },
  cartesia_tts_new: { label: "The voice", means: "Turning the agent's words into speech." },
  elevenlabs_tts: { label: "The voice", means: "Turning the agent's words into speech." },
  gpt_4_1: { label: "The thinking", means: "The language model that decided what to say." },
  gpt_4_1_text_testing: { label: "The thinking, text tests", means: "Model use from a typed test, not a real call." },
  llm_token_surcharge: { label: "Extra model charge", means: "Retell's markup on the language model." },
  us_twilio_telephony: { label: "The phone line", means: "Carrying the call over the phone network." },
  background_voice_cancellation: { label: "Noise removal", means: "Filtering out other voices and background noise." },
  guardrail: { label: "Safety checks", means: "Retell's checks on what the agent says." },
  knowledge_base: { label: "Looking things up", means: "Reading the agent's reference material." },
};

/* ------------------------------------------------------------------ *
 * Codes the agent sometimes writes into a free-text field.
 *
 * `recommended_next_action` is meant to hold a sentence, but the agent's own
 * instruction offers `human_review` as an example, and it sometimes writes
 * exactly that and nothing else. A bare code must never reach the screen in
 * Simple mode, so it is turned into words here like any other code.
 * ------------------------------------------------------------------ */

export const NEXT_ACTION_PLAIN: Record<string, Plain> = {
  human_review: {
    label: "A person should look at this",
    means: "The agent could not decide what to do next, so it asked for a human.",
    tone: "warn",
  },
  dispatch_roadside_tech: {
    label: "Send somebody out to the roadside",
    means: "The caller is stranded and needs help where they are.",
    tone: "bad",
  },
  call_back_to_schedule: {
    label: "Ring them back to book it in",
    means: "The caller wants work done and a time needs arranging.",
    tone: "good",
  },
  ignore: {
    label: "Nothing to do",
    means: "The agent judged that this call needs no follow-up.",
    tone: "neutral",
  },
};

/* ------------------------------------------------------------------ *
 * The steps the recap robot runs, in plain words.
 *
 * These are n8n node names. Most are already readable, so only the ones that
 * are not get an entry here. The exact node name still shows in Technical
 * mode, because that is the string somebody types into n8n to find the step.
 * ------------------------------------------------------------------ */

export const STEP_PLAIN: Record<string, Plain> = {
  "Retell call_analyzed": {
    label: "The call arrives from Retell",
    means: "Retell finished its notes and handed the call over.",
  },
  "Guard and Normalize": {
    label: "Check and tidy the answers",
    means: "Throws out anything that is not a finished call, and tidies the rest.",
  },
  "Build Daniel Payload": {
    label: "Write the hand-off for Daniel",
    means: "Puts the lead into the shape Daniel's system expects.",
  },
  "Send to Daniel": {
    label: "Send it to Daniel",
    means: "The step that actually delivers the lead. The one that matters.",
  },
  "Send Recap Email": {
    label: "Email the recap to Robert",
    means: "The write-up of the call.",
  },
  "Should Send Email?": {
    label: "Is this worth an email?",
    means: "A hang-up with nothing in it does not get emailed.",
  },
  "If Qualified Service Request": {
    label: "Is this a real service call?",
    means: "Decides whether the lead goes any further.",
  },
  "Explain Handoff Failure": {
    label: "Work out what went wrong",
    means: "Turns the failure into something a person can read.",
  },
  "Handoff Failed - Alert Rey & Daniel": {
    label: "Tell somebody it failed",
    means: "Emails Rey and Daniel that a lead did not get through.",
  },
  "Logged - No Email (Hangup)": {
    label: "Noted, no email needed",
    means: "The caller hung up with nothing to send on.",
  },
  "Logged - No SMS": {
    label: "Noted, no text message",
    means: "Text messages are switched off.",
  },
  "SMS Alert to Robert": {
    label: "Text Robert",
    means: "Switched off. No text message is ever sent.",
  },
  "Download Recording": {
    label: "Fetch the recording",
    means: "Gets the audio so it can be filed away.",
  },
  "Transcript to File": {
    label: "Turn the words into a file",
    means: "Makes a text file of what was said.",
  },
  "Attach Drive Links": {
    label: "Add the links to the files",
    means: "Puts the recording and transcript links into the recap.",
  },
};

/**
 * A readable name for a step we have no wording for.
 *
 * Node names are written by a person, so most are already plain. This only
 * has to catch a stray code inside one, so no raw code reaches Simple mode.
 */
export function stepLabel(name: string): string {
  const known = STEP_PLAIN[name];
  if (known) return known.label;
  return name.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (t) =>
    t.replace(/_+/g, " "),
  );
}
