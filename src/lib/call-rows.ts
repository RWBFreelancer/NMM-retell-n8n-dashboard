import "server-only";
import type { RetellCall } from "./retell";
import { analysisValue } from "./stats";
import type { Cell, CallRow } from "./call-row";
import {
  CALL_TYPE_PLAIN,
  DISCONNECT_PLAIN,
  URGENCY_PLAIN,
  YES_NO_PLAIN,
  plainOr,
  type Plain,
} from "./plain";
import { dateTime, duration, money, phoneMasked, phonePretty } from "./format";

/**
 * Turn Retell's calls into table rows.
 *
 * Every code becomes plain English HERE, on the server, so the table component
 * holds no lookup table and the CSV route holds no formatting. One row builder,
 * two consumers, no chance of the screen and the spreadsheet disagreeing.
 */
export function buildRows(calls: RetellCall[]): CallRow[] {
  return calls.map((call) => ({
    callId: call.call_id,
    startMs: call.start_timestamp,
    when: dateTime(call.start_timestamp),
    fromFull: phonePretty(call.from_number),
    fromMasked: phoneMasked(call.from_number),
    length: duration(call.duration_ms),
    durationMs: call.duration_ms ?? 0,
    callType: cell(CALL_TYPE_PLAIN, analysisValue(call, "call_type")),
    urgency: cell(URGENCY_PLAIN, analysisValue(call, "urgency")),
    serviceRequest: cell(YES_NO_PLAIN, analysisValue(call, "service_request")),
    detailsMissing: detailsMissingCell(call),
    ended: cell(DISCONNECT_PLAIN, call.disconnection_reason),
    cost: money(call.call_cost?.combined_cost),
    costCents: call.call_cost?.combined_cost ?? 0,
  }));
}

function cell(map: Record<string, Plain>, raw: string | undefined): Cell {
  const plain = plainOr(map, raw);
  return {
    label: plain.label,
    raw: raw ?? "",
    means: plain.soWhat ? `${plain.means} ${plain.soWhat}` : plain.means,
    tone: plain.tone ?? "neutral",
  };
}

/**
 * "Details missing" reads backwards from the raw field, on purpose.
 *
 * `incomplete_intake = yes` is bad news, so the chip must be the alarming
 * colour when the answer is yes, and the calm one when it is no. Reusing the
 * generic yes/no colours would paint the bad case green.
 */
function detailsMissingCell(call: RetellCall): Cell {
  const raw = analysisValue(call, "incomplete_intake");
  if (raw === undefined) {
    return {
      label: "Not recorded",
      raw: "",
      means: "Nothing was saved here for this call.",
      tone: "neutral",
    };
  }
  if (raw === "yes" || raw === "true") {
    return {
      label: "Yes, missing",
      raw,
      means: "The agent did not get everything Daniel needs to open a job.",
      tone: "bad",
    };
  }
  if (raw === "no" || raw === "false") {
    return {
      label: "All there",
      raw,
      means: "The agent captured everything Daniel needs.",
      tone: "good",
    };
  }
  return {
    label: "Could not tell",
    raw,
    means: "Too little was said for the agent to answer.",
    tone: "warn",
  };
}
