import "server-only";

/**
 * Retell REST client. SERVER ONLY.
 *
 * The API key must never reach the browser. `server-only` makes the build
 * fail if a client component ever imports this file.
 *
 * READ-ONLY. See dashboard/CLAUDE.md rule 1. Only the endpoints on the
 * allow-list below can be called. Anything that creates, changes, or
 * publishes an agent is refused here, not just avoided by habit.
 */

const DEFAULT_BASE = "https://api.retellai.com";

/**
 * Every call this dashboard is allowed to make. A path not on this list is
 * refused. `POST` appears only for list-calls, which is a read that happens
 * to use POST because it carries a filter body.
 */
const ALLOWED: ReadonlyArray<{ method: "GET" | "POST"; pattern: RegExp }> = [
  { method: "POST", pattern: /^\/v3\/list-calls$/ },
  { method: "GET", pattern: /^\/v2\/get-call\/[\w-]+$/ },
  { method: "GET", pattern: /^\/get-agent\/[\w-]+$/ },
  { method: "GET", pattern: /^\/list-agent-versions\/[\w-]+$/ },
  { method: "GET", pattern: /^\/v2\/list-phone-numbers$/ },
];

export class RetellError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** A sentence the dashboard can show a person. */
    readonly plain: string,
  ) {
    super(message);
    this.name = "RetellError";
  }
}

function config() {
  const key = process.env.RETELL_API_KEY;
  const base = process.env.RETELL_BASE_URL || DEFAULT_BASE;
  if (!key) {
    throw new RetellError(
      "RETELL_API_KEY is not set",
      500,
      "The Retell key is missing. Add RETELL_API_KEY in the Vercel project settings, then reload.",
    );
  }
  return { key, base: base.replace(/\/+$/, "") };
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const allowed = ALLOWED.some(
    (rule) => rule.method === method && rule.pattern.test(path),
  );
  if (!allowed) {
    // A wiring mistake, not a user error. Fail loudly.
    throw new RetellError(
      `Refused: ${method} ${path} is not a read-only Retell endpoint`,
      500,
      "That action is not allowed. This dashboard can only read from Retell.",
    );
  }

  const { key, base } = config();

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new RetellError(
      `Network error calling ${path}`,
      502,
      "We could not reach Retell. Check the internet connection, then try again.",
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RetellError(
      `Retell ${res.status} on ${path}: ${text.slice(0, 300)}`,
      res.status,
      plainForStatus(res.status),
    );
  }

  return (await res.json()) as T;
}

function plainForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "Retell would not accept our key. Check RETELL_API_KEY in the Vercel project settings.";
  }
  if (status === 404) return "Retell has no record of that.";
  if (status === 429) {
    return "We asked Retell for too much too fast. Wait a moment, then try again.";
  }
  if (status >= 500) return "Retell is having trouble right now. Try again shortly.";
  return "Retell refused that request.";
}

/* ------------------------------------------------------------------ *
 * Types. Only the parts the dashboard reads.
 * ------------------------------------------------------------------ */

export type CallAnalysis = {
  call_summary?: string;
  user_sentiment?: string;
  call_successful?: boolean;
  in_voicemail?: boolean;
  custom_analysis_data?: Record<string, unknown>;
};

export type CallCost = {
  combined_cost?: number; // cents
  total_duration_seconds?: number;
  product_costs?: Array<{ product: string; cost: number; unit_price?: number }>;
};

export type Latency = {
  e2e?: LatencyStat;
  llm?: LatencyStat;
  tts?: LatencyStat;
  asr?: LatencyStat;
};

export type LatencyStat = {
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  min?: number;
  max?: number;
  num?: number;
};

export type TranscriptTurn = {
  role: "agent" | "user" | string;
  content: string;
  words?: Array<{ word: string; start?: number; end?: number }>;
};

export type RetellCall = {
  call_id: string;
  agent_id: string;
  agent_name?: string;
  agent_version?: number;
  call_status?: string;
  call_type?: string;
  direction?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  recording_url?: string;
  public_log_url?: string;
  transcript?: string;
  transcript_object?: TranscriptTurn[];
  call_analysis?: CallAnalysis;
  call_cost?: CallCost;
  latency?: Latency;
  collected_dynamic_variables?: Record<string, unknown>;
  custom_sip_headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export type ListCallsResponse = {
  items?: RetellCall[];
  has_more?: boolean;
  pagination_key?: string;
  total?: number;
};

export type RetellAgent = {
  agent_id: string;
  agent_name?: string;
  version?: number;
  is_published?: boolean;
  voice_id?: string;
  webhook_url?: string;
  webhook_events?: string[];
  post_call_analysis_data?: Array<{
    name: string;
    type: string;
    description?: string;
    choices?: string[];
  }>;
  last_modification_timestamp?: number;
  response_engine?: { type?: string; conversation_flow_id?: string; version?: number };
};

export type PhoneNumber = {
  phone_number: string;
  phone_number_pretty?: string;
  inbound_agent_id?: string;
  outbound_agent_id?: string;
  nickname?: string;
};

/* ------------------------------------------------------------------ *
 * The five reads
 * ------------------------------------------------------------------ */

export type ListCallsInput = {
  agentId?: string;
  /** Unix milliseconds, inclusive. */
  startMs?: number;
  /** Unix milliseconds, inclusive. */
  endMs?: number;
  limit?: number;
  paginationKey?: string;
  /** Extra equality filters on the post-call analysis fields. */
  analysisEquals?: Record<string, string | number | boolean>;
};

/**
 * Filter shapes checked against the live API on 2026-09-18, because the
 * published docs and tools/callreview.py disagreed:
 *   agent_id           -> a plain array of ids
 *   start_timestamp    -> { type: "range", op: "bt", value: [fromMs, toMs] }
 *   custom_analysis_data -> an ARRAY of { key, type, op, value }
 * The reply carries `items`, `has_more` and `pagination_key`.
 */
function buildFilter(input: ListCallsInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.agentId) filter.agent_id = [input.agentId];

  if (input.startMs !== undefined || input.endMs !== undefined) {
    filter.start_timestamp = {
      type: "range",
      op: "bt",
      value: [input.startMs ?? 0, input.endMs ?? Date.now()],
    };
  }

  if (input.analysisEquals && Object.keys(input.analysisEquals).length > 0) {
    filter.custom_analysis_data = Object.entries(input.analysisEquals).map(
      ([key, value]) =>
        typeof value === "boolean"
          ? { key, type: "boolean", op: "eq", value }
          : { key, type: "enum", op: "in", value: [String(value)] },
    );
  }

  return filter;
}

export async function listCalls(input: ListCallsInput): Promise<{
  calls: RetellCall[];
  hasMore: boolean;
  paginationKey?: string;
}> {
  const filter = buildFilter(input);

  const body: Record<string, unknown> = {
    limit: Math.min(input.limit ?? 100, 1000),
    sort_order: "descending",
  };
  if (Object.keys(filter).length > 0) body.filter_criteria = filter;
  if (input.paginationKey) body.pagination_key = input.paginationKey;

  const res = await request<ListCallsResponse>("POST", "/v3/list-calls", body);
  return {
    calls: res.items ?? [],
    hasMore: Boolean(res.has_more),
    paginationKey: res.pagination_key,
  };
}

/**
 * Every matching call, following the pages for you.
 *
 * A report must count the whole range, not the first page. `maxPages` is a
 * seat belt so a wide date range cannot spin forever.
 */
export async function listAllCalls(
  input: ListCallsInput,
  maxPages = 20,
): Promise<{ calls: RetellCall[]; truncated: boolean }> {
  const out: RetellCall[] = [];
  let paginationKey: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const res = await listCalls({ ...input, limit: 100, paginationKey });
    out.push(...res.calls);
    if (!res.hasMore || !res.paginationKey) {
      return { calls: out, truncated: false };
    }
    paginationKey = res.paginationKey;
  }

  // We stopped early. The caller must say so on screen, never pretend.
  return { calls: out, truncated: true };
}

/** One call, with the transcript and the recording that the list leaves out. */
export function getCall(callId: string): Promise<RetellCall> {
  return request<RetellCall>("GET", `/v2/get-call/${encodeURIComponent(callId)}`);
}

/**
 * The live agent. This is the ONLY source of the published version number.
 * Never read a version from a file. (parent CLAUDE.md)
 */
export function getAgent(agentId: string): Promise<RetellAgent> {
  return request<RetellAgent>("GET", `/get-agent/${encodeURIComponent(agentId)}`);
}

export function listAgentVersions(agentId: string): Promise<RetellAgent[]> {
  return request<RetellAgent[]>(
    "GET",
    `/list-agent-versions/${encodeURIComponent(agentId)}`,
  );
}

export function listPhoneNumbers(): Promise<PhoneNumber[]> {
  return request<PhoneNumber[]>("GET", "/v2/list-phone-numbers");
}
