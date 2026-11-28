// Repo guard: rules that tests cannot see. Runs in CI (job "verify") and locally with `npm run check:repo`.
// This repo is PUBLIC (AGENTS.md hard rules 2 and 3).
// 1. No .env file in git (only .env.example).
// 2. No data files (CSV, spreadsheets, JSONL, call exports) and no file over 5 MB.
// 3. No phone number or email address in code or docs, except fake ones (555 numbers, example.com, demo.test).
// 4. No PATCH, PUT or DELETE in src/ (read-only rule).
// 5. No "Bearer" in the browser files (.next/static), after `npm run build`.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const problems = [];
const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);

for (const f of tracked) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !/\.env\.example$/.test(f)) problems.push(`Env file in git: ${f}`);
  if (/\.(csv|xlsx|xls|parquet|jsonl|wav|mp3)$/i.test(f)) problems.push(`Data or recording file in git: ${f}`);
  if (existsSync(f) && statSync(f).size > 5 * 1024 * 1024) problems.push(`File over 5 MB: ${f}`);
}

const okEmail = /@(example\.(com|org|net)|demo\.test|users\.noreply\.github\.com)$/i;
const textFiles = tracked.filter((f) => /\.(ts|tsx|js|mjs|json|md|css|html|txt|yml|yaml)$/.test(f) && f !== "package-lock.json");
for (const f of textFiles) {
  if (!existsSync(f)) continue;
  const text = readFileSync(f, "utf8");
  for (const e of new Set(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])) {
    if (!okEmail.test(e) && !/^[^@]+@\d/.test(e)) problems.push(`${f}: email address ${e}`);
  }
  // US style phone numbers, for example (925) 555-0100 or +1 925 555 0100. 555 numbers are fake and allowed.
  for (const m of text.match(/(\+1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g) ?? []) {
    if (!/(^|\D)555(\D|$)/.test(m)) problems.push(`${f}: phone number ${m}`);
  }
}

// 4. Read-only rule (AGENTS.md hard rule 1): no write method in src/.
for (const f of tracked.filter((x) => x.startsWith("src/"))) {
  if (existsSync(f) && /\b(PATCH|PUT|DELETE)\b/.test(readFileSync(f, "utf8"))) problems.push(`${f}: has PATCH, PUT or DELETE. The dashboard is read-only.`);
}

// 5. No key in the browser files (AGENTS.md hard rule 4). Needs `npm run build` first.
if (existsSync(".next/static")) {
  const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
  for (const f of walk(".next/static").filter((x) => /\.(js|html|css|map|json)$/.test(x))) {
    if (readFileSync(f, "utf8").includes("Bearer")) problems.push(`${f}: browser file has "Bearer". A key may leak.`);
  }
} else {
  console.log("Note: .next/static not found. Run `npm run build` to also check the browser files.");
}

if (problems.length) {
  console.error(`Repo check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Repo check passed (${tracked.length} tracked files).`);
