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
