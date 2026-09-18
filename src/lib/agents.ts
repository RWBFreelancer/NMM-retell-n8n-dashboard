/**
 * The two agents.
 *
 * Mirrors the AGENTS registry in ../../tools/retell_client.py. The ids are
 * the only agent facts that are safe to hardcode.
 *
 * The published VERSION is never hardcoded. Pull it from GET /get-agent/{id}.
 * (parent CLAUDE.md: never trust a version number written in a file)
 */

export type AgentKey = "a" | "b";

export type AgentInfo = {
  key: AgentKey;
  /** Short name for a tab. */
  label: string;
  /** Long name, for a page heading. */
  fullLabel: string;
  agentId: string;
  /** E.164, as Retell reports it. */
  phone: string;
  /** How a person writes it. */
  phonePretty: string;
  /** True for the agent that takes real calls today. */
  live: boolean;
  /** One plain sentence about this agent's job. */
  plain: string;
};

/**
 * The ids and the phone numbers come from environment variables, not from
 * this file, because this repo is public. They are not passwords, but there
 * is no reason to publish them either.
 */
export const AGENTS: Record<AgentKey, AgentInfo> = {
  b: {
    key: "b",
    label: "Agent B",
    fullLabel: "Agent B — Framework",
    agentId: process.env.AGENT_B_ID ?? "",
    phone: process.env.AGENT_B_PHONE ?? "",
    phonePretty: prettyPhone(process.env.AGENT_B_PHONE),
    live: true,
    plain: "This one answers every real call.",
  },
  a: {
    key: "a",
    label: "Agent A",
    fullLabel: "Agent A — Current",
    agentId: process.env.AGENT_A_ID ?? "",
    phone: process.env.AGENT_A_PHONE ?? "",
    phonePretty: prettyPhone(process.env.AGENT_A_PHONE),
    live: false,
    plain: "The spare. It does the same job a different way, so the two can be compared.",
  },
};

function prettyPhone(raw: string | undefined): string {
  if (!raw) return "Number not set";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw;
}

/**
 * A missing id means the dashboard cannot read that agent at all, so say so
 * loudly rather than showing an empty page.
 */
export function missingAgentIds(): AgentKey[] {
  return AGENT_ORDER.filter((key) => !AGENTS[key].agentId);
}

/** Tab order: the live one first. */
export const AGENT_ORDER: AgentKey[] = ["b", "a"];

export function isAgentKey(value: string): value is AgentKey {
  return value === "a" || value === "b";
}

export function getAgentInfo(key: string): AgentInfo | null {
  return isAgentKey(key) ? AGENTS[key] : null;
}

/** Find which agent a call belongs to, by its agent_id. */
export function agentKeyForId(agentId: string): AgentKey | null {
  for (const key of AGENT_ORDER) {
    if (AGENTS[key].agentId === agentId) return key;
  }
  return null;
}
