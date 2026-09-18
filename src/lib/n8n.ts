import "server-only";

/**
 * n8n public API client. SERVER ONLY.
 *
 * READ-ONLY. The recap workflow is changed with the Python tools in the
 * parent repo, behind the approval ladder. This dashboard only looks.
 */

const ALLOWED: ReadonlyArray<{ method: "GET"; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/v1\/executions(\?.*)?$/ },
  { method: "GET", pattern: /^\/api\/v1\/executions\/\d+(\?.*)?$/ },
  { method: "GET", pattern: /^\/api\/v1\/workflows\/[\w-]+$/ },
];

export class N8nError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly plain: string,
  ) {
    super(message);
    this.name = "N8nError";
  }
}

function config() {
  const key = process.env.N8N_API_KEY;
  const base = process.env.N8N_BASE_URL;
  if (!key || !base) {
    throw new N8nError(
      "N8N_API_KEY or N8N_BASE_URL is not set",
      500,
      "The n8n settings are missing. Add N8N_API_KEY and N8N_BASE_URL in the Vercel project settings.",
    );
  }
  return { key, base: base.replace(/\/+$/, "") };
}

export function workflowId(): string {
  const id = process.env.N8N_WORKFLOW_ID;
  if (!id) {
    throw new N8nError(
      "N8N_WORKFLOW_ID is not set",
      500,
      "We do not know which n8n workflow to watch. Add N8N_WORKFLOW_ID in the Vercel project settings.",
    );
  }
  return id;
}

async function request<T>(path: string): Promise<T> {
  if (!ALLOWED.some((rule) => rule.pattern.test(path))) {
    throw new N8nError(
      `Refused: GET ${path} is not a read-only n8n endpoint`,
      500,
      "That action is not allowed. This dashboard can only read from n8n.",
    );
  }

  const { key, base } = config();

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: { "X-N8N-API-KEY": key, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new N8nError(
      `Network error calling ${path}`,
      502,
      "We could not reach n8n. Check that the n8n address is right, then try again.",
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new N8nError(
      `n8n ${res.status} on ${path}: ${text.slice(0, 300)}`,
      res.status,
      plainForStatus(res.status),
    );
  }

  return (await res.json()) as T;
}

function plainForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "n8n would not accept our key. Check N8N_API_KEY in the Vercel project settings. n8n keys can expire.";
  }
  if (status === 404) return "n8n has no record of that.";
  if (status >= 500) return "n8n is having trouble right now. Try again shortly.";
  return "n8n refused that request.";
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** What n8n calls an execution: one run of the recap workflow. */
export type Execution = {
  id: number;
  finished: boolean;
  mode: string;
  status: "success" | "error" | "running" | "waiting" | "canceled" | "crashed" | string;
  startedAt: string;
  stoppedAt?: string | null;
  workflowId: string;
  data?: ExecutionData;
};

export type ExecutionData = {
  resultData?: {
    runData?: Record<string, RunDatum[]>;
    lastNodeExecuted?: string;
    error?: { message?: string; node?: { name?: string } };
  };
};

export type RunDatum = {
  startTime?: number;
  executionTime?: number;
  executionStatus?: string;
  error?: { message?: string; description?: string };
  data?: {
    main?: Array<Array<{ json?: Record<string, unknown> }> | null>;
  };
};

export type ExecutionList = {
  data: Execution[];
  nextCursor?: string | null;
};

export type Workflow = {
  id: string;
  name: string;
  active: boolean;
  updatedAt?: string;
  nodes?: Array<{ name: string; type: string; disabled?: boolean }>;
};

/* ------------------------------------------------------------------ *
 * The three reads
 * ------------------------------------------------------------------ */

export type ListExecutionsInput = {
  limit?: number;
  cursor?: string;
  status?: "success" | "error" | "waiting";
};

export function listExecutions(
  input: ListExecutionsInput = {},
): Promise<ExecutionList> {
  const q = new URLSearchParams();
  q.set("workflowId", workflowId());
  q.set("limit", String(Math.min(input.limit ?? 100, 250)));
  q.set("includeData", "false");
  if (input.cursor) q.set("cursor", input.cursor);
  if (input.status) q.set("status", input.status);
  return request<ExecutionList>(`/api/v1/executions?${q.toString()}`);
}

/** One run, node by node. Big payload, so only fetch it on a detail view. */
export function getExecution(id: number | string): Promise<Execution> {
  return request<Execution>(`/api/v1/executions/${id}?includeData=true`);
}

export function getWorkflow(): Promise<Workflow> {
  return request<Workflow>(`/api/v1/workflows/${workflowId()}`);
}
