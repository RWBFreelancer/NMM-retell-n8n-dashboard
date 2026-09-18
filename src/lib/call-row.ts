/**
 * One row of the call table, ready to render.
 *
 * Plain data only: strings, numbers and booleans. No functions, no Date. The
 * server page builds these and hands them to a client component, so anything
 * in here must survive being turned into JSON.
 *
 * This file is NOT server-only on purpose: the table component needs the type,
 * and the CSV route needs the same shape, so both agree on what a row is.
 */

export type CallRow = {
  callId: string;
  startMs?: number;
  /** "Tue 17 Sep, 2:45 pm" */
  when: string;
  /** "(805) 555-0134" */
  fromFull: string;
  /** "(805) •••-••34" */
  fromMasked: string;
  /** "2m 14s" */
  length: string;
  durationMs: number;
  /** Plain label plus the raw code, so Technical mode can show both. */
  callType: Cell;
  urgency: Cell;
  serviceRequest: Cell;
  detailsMissing: Cell;
  ended: Cell;
  /** "$0.07" */
  cost: string;
  costCents: number;
};

export type Cell = {
  /** What Simple mode shows. Always words. */
  label: string;
  /** The raw code, for Technical mode and for the CSV. "" when nothing saved. */
  raw: string;
  /** One sentence, for the title attribute. */
  means: string;
  tone: "good" | "warn" | "bad" | "info" | "neutral";
};

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

export const CSV_HEADERS = [
  "call_id",
  "started_pacific",
  "from_number",
  "duration_seconds",
  "call_type",
  "urgency",
  "service_request",
  "incomplete_intake",
  "disconnection_reason",
  "cost_usd",
] as const;

/**
 * Turn rows into CSV text.
 *
 * `masked` keeps the caller's number hidden, and it defaults to hidden
 * everywhere it is offered. A spreadsheet gets emailed and forwarded, so the
 * safe choice has to be the easy one. (dashboard/CLAUDE.md rule 3)
 *
 * The CSV carries the RAW code, not the plain label, because a spreadsheet is
 * for counting and sorting. The plain label lives on screen.
 */
export function rowsToCsv(rows: CallRow[], masked: boolean): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.callId,
        r.when,
        masked ? r.fromMasked : r.fromFull,
        Math.round(r.durationMs / 1000),
        r.callType.raw,
        r.urgency.raw,
        r.serviceRequest.raw,
        r.detailsMissing.raw,
        r.ended.raw,
        (r.costCents / 100).toFixed(2),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // A trailing newline, so the file ends the way tools expect.
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Quote a cell for CSV, and refuse to let a spreadsheet run it as a formula.
 *
 * A cell starting with = + - or @ is executed by Excel and Google Sheets. None
 * of our values should start that way, but a caller-typed field could, so the
 * apostrophe goes in front rather than trusting the data.
 */
function csvCell(value: string | number): string {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}
