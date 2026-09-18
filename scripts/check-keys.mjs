/**
 * Prove the two API keys work, read-only.
 *
 *   npm run check-keys
 *
 * Prints status codes and counts only. It never prints a key, a caller name,
 * a phone number, or an address.
 */
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(`Cannot read ${path}. Copy .env.example to .env.local first.`);
    process.exit(1);
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv(new URL("../.env.local", import.meta.url));
const ok = (b) => (b ? "PASS" : "FAIL");
let failures = 0;

function report(name, passed, detail) {
  if (!passed) failures += 1;
  console.log(`${ok(passed).padEnd(5)} ${name.padEnd(34)} ${detail}`);
}

/* ---------------- Retell ---------------- */

const retellBase = (env.RETELL_BASE_URL || "https://api.retellai.com").replace(
  /\/+$/,
  "",
);
const retellHeaders = {
  Authorization: `Bearer ${env.RETELL_API_KEY}`,
  "Content-Type": "application/json",
};

console.log("\n--- Retell ---");

// 1. Can we read the agents?
for (const [label, id] of [
  ["Agent B", env.AGENT_B_ID],
  ["Agent A", env.AGENT_A_ID],
]) {
  try {
    const res = await fetch(`${retellBase}/get-agent/${id}`, {
      headers: retellHeaders,
    });
    if (!res.ok) {
      report(`read ${label}`, false, `HTTP ${res.status}`);
      continue;
    }
    const a = await res.json();
    const fields = (a.post_call_analysis_data || []).length;
    report(
      `read ${label}`,
      true,
      `live version ${a.version}, published ${a.is_published}, ${fields} analysis fields`,
    );
  } catch (e) {
    report(`read ${label}`, false, `network error: ${e.message}`);
  }
}

// 2. Can we list calls?
try {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const res = await fetch(`${retellBase}/v3/list-calls`, {
    method: "POST",
    headers: retellHeaders,
    body: JSON.stringify({
      limit: 100,
      sort_order: "descending",
      filter_criteria: {
        agent_id: [env.AGENT_B_ID],
        start_timestamp: { type: "range", op: "bt", value: [since, Date.now()] },
      },
    }),
  });
  if (!res.ok) {
    report("list calls (Agent B, 7 days)", false, `HTTP ${res.status}`);
  } else {
    const body = await res.json();
    const calls = body.items || [];
    report(
      "list calls (Agent B, 7 days)",
      true,
      `${calls.length} call(s) returned`,
    );
    if (calls.length > 0) {
      const withAnalysis = calls.filter(
        (c) => c.call_analysis?.custom_analysis_data,
      ).length;
      report(
        "calls carry analysis fields",
        withAnalysis > 0,
        `${withAnalysis} of ${calls.length} have custom_analysis_data`,
      );
    }
  }
} catch (e) {
  report("list calls (Agent B, 7 days)", false, `network error: ${e.message}`);
}

// 3. Is the key write-capable? We WANT this to fail.
//    A read-only key should be refused. Uses a fake id so nothing can change.
try {
  const res = await fetch(`${retellBase}/update-agent/agent_read_only_probe`, {
    method: "PATCH",
    headers: retellHeaders,
    body: JSON.stringify({ agent_name: "probe" }),
  });
  const refusedForPermission = res.status === 401 || res.status === 403;
  report(
    "key cannot write (403 wanted)",
    refusedForPermission,
    refusedForPermission
      ? `HTTP ${res.status} - write refused, good`
      : `HTTP ${res.status} - not a permission refusal. The key may allow writes.`,
  );
} catch (e) {
  report("key cannot write (403 wanted)", false, `network error: ${e.message}`);
}

/* ---------------- n8n ---------------- */

console.log("\n--- n8n ---");

const n8nBase = (env.N8N_BASE_URL || "").replace(/\/+$/, "");
const n8nHeaders = { "X-N8N-API-KEY": env.N8N_API_KEY, Accept: "application/json" };

try {
  const res = await fetch(`${n8nBase}/api/v1/workflows/${env.N8N_WORKFLOW_ID}`, {
    headers: n8nHeaders,
  });
  if (!res.ok) {
    report("read the recap workflow", false, `HTTP ${res.status}`);
  } else {
    const w = await res.json();
    report(
      "read the recap workflow",
      true,
      `"${w.name}", active=${w.active}, ${(w.nodes || []).length} nodes`,
    );
  }
} catch (e) {
  report("read the recap workflow", false, `network error: ${e.message}`);
}

try {
  const res = await fetch(
    `${n8nBase}/api/v1/executions?workflowId=${env.N8N_WORKFLOW_ID}&limit=20&includeData=false`,
    { headers: n8nHeaders },
  );
  if (!res.ok) {
    report("list recent runs", false, `HTTP ${res.status}`);
  } else {
    const body = await res.json();
    const runs = body.data || [];
    const bad = runs.filter((r) => r.status === "error").length;
    report(
      "list recent runs",
      true,
      `${runs.length} run(s), ${bad} failed`,
    );
  }
} catch (e) {
  report("list recent runs", false, `network error: ${e.message}`);
}

console.log(
  `\n${failures === 0 ? "All checks passed." : failures + " check(s) failed."}\n`,
);
process.exit(failures === 0 ? 0 : 1);
