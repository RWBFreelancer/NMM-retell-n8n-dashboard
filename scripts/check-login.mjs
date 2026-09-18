/**
 * Say why a login is refused, without printing any secret.
 *
 *   npm run check-login -- "the password you are typing"
 *
 * It reads .env.local exactly as the app does, and reports PASS or FAIL for
 * each step. It prints no key, no hash, and no password.
 */
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run check-login -- "the password you are typing"');
  process.exit(1);
}

let env = {};
try {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
} catch {
  console.error("Cannot read .env.local");
  process.exit(1);
}

let failures = 0;
function report(name, passed, detail) {
  if (!passed) failures += 1;
  console.log(`${(passed ? "PASS" : "FAIL").padEnd(5)} ${name.padEnd(40)} ${detail}`);
}

console.log("\n--- Login settings in .env.local ---\n");

const user = env.DASHBOARD_USERNAME;
report(
  "DASHBOARD_USERNAME is set",
  Boolean(user),
  user ? `${user.length} characters` : "MISSING",
);

const secret = env.AUTH_SECRET;
report(
  "AUTH_SECRET is set",
  Boolean(secret) && secret.length >= 32,
  !secret
    ? "MISSING"
    : secret.length < 32
      ? `only ${secret.length} characters, too short`
      : `${secret.length} characters`,
);

const raw = env.DASHBOARD_PASSWORD_HASH;
report(
  "DASHBOARD_PASSWORD_HASH is set",
  Boolean(raw),
  raw ? `${raw.length} characters` : "MISSING",
);

if (!raw) {
  console.log("\nAdd the hash, then run this again.\n");
  process.exit(1);
}

// The three ways people get this wrong.
const hasPrefix = raw.startsWith("DASHBOARD_PASSWORD_HASH=");
report(
  "no stray name in front of the value",
  !hasPrefix,
  hasPrefix
    ? 'The value starts with "DASHBOARD_PASSWORD_HASH=". Paste ONLY the part after the "=".'
    : "good",
);

const quoted = /^["'].*["']$/.test(raw);
report(
  "no quotes around the value",
  !quoted,
  quoted ? "Remove the quote marks." : "good",
);

let hash;
if (raw.startsWith("$2")) {
  hash = raw;
  report(
    "hash shape",
    raw.length === 60,
    raw.length === 60
      ? "raw bcrypt, full length"
      : `raw bcrypt but ${raw.length} characters, should be 60. The $ signs were eaten. Use the base64 form.`,
  );
} else {
  let decoded = "";
  try {
    decoded = Buffer.from(raw, "base64").toString("utf8");
  } catch {
    decoded = "";
  }
  hash = decoded;
  report(
    "hash shape",
    decoded.startsWith("$2") && decoded.length === 60,
    decoded.startsWith("$2")
      ? decoded.length === 60
        ? "base64, decodes to a full bcrypt hash"
        : `base64, but decodes to ${decoded.length} characters, should be 60`
      : "not a bcrypt hash and not base64 of one. Run npm run hash-password again.",
  );
}

if (hash && hash.startsWith("$2") && hash.length === 60) {
  let matches = false;
  try {
    matches = bcrypt.compareSync(password, hash);
  } catch {
    matches = false;
  }
  report(
    "the password you typed matches",
    matches,
    matches
      ? "yes"
      : "no. Either the password is different, or the hash came from a different password.",
  );
}

console.log(
  `\n${failures === 0 ? "All good. This username and password will work." : failures + " problem(s) above."}\n`,
);
process.exit(failures === 0 ? 0 : 1);
