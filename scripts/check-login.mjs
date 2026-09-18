/**
 * Say why a login is refused, without printing any secret.
 *
 *   npm run check-login -- "the password you are typing"
 *
 * It reads .env.local exactly as the app does, and reports PASS, WARN, or
 * FAIL for each step. It prints no key, no hash, and no password.
 *
 * To check what is in the Vercel settings page instead, copy the value out of
 * the box and pass it in. Nothing is sent anywhere and nothing is written to
 * disk:
 *
 *   npm run check-login -- "your password" --hash "<the value box contents>"
 *   npm run check-login -- "your password" --hash "<value>" --user "<value>"
 *
 * That is the only way to test the live settings from this computer, because
 * the server never shows them back to you.
 *
 * The password check itself comes from src/lib/password-hash.mjs, the same
 * file the app uses. This script cannot give a different answer to the server.
 */
import { readFileSync } from "node:fs";
import { hashShape, hashProblem, verifyPassword } from "../src/lib/password-hash.mjs";

const args = process.argv.slice(2);
const password = args.find((a) => !a.startsWith("--"));

function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

if (!password) {
  console.error('Usage: npm run check-login -- "the password you are typing"');
  console.error('   or: npm run check-login -- "password" --hash "<Vercel value>"');
  process.exit(1);
}

const pastedHash = flag("hash");
const pastedUser = flag("user");
const fromVercel = pastedHash !== undefined || pastedUser !== undefined;

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
  if (!fromVercel) {
    console.error("Cannot read .env.local");
    process.exit(1);
  }
}

let failures = 0;
function report(name, state, detail) {
  if (state === "FAIL") failures += 1;
  console.log(`${state.padEnd(5)} ${name.padEnd(40)} ${detail}`);
}
const pass = (n, ok, d) => report(n, ok ? "PASS" : "FAIL", d);

/**
 * Strip the three ways a paste goes wrong, exactly as src/lib/login-setup.ts
 * does. Returns the cleaned value and what had to be removed, so this tool and
 * the live server can never disagree about whether a value is usable.
 */
function readSetting(name, raw) {
  if (raw === undefined) return { value: undefined, fixed: [] };
  const fixed = [];
  let value = raw;

  if (value !== value.trim()) fixed.push("a space or a line break around it");
  value = value.trim();

  if (value.startsWith(`${name}=`)) {
    fixed.push(`the name "${name}=" in front of the value`);
    value = value.slice(name.length + 1).trim();
  }

  const quoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")));
  if (quoted) {
    fixed.push("quote marks around the value");
    value = value.slice(1, -1).trim();
  }

  return { value: value.length > 0 ? value : undefined, fixed };
}

console.log(
  fromVercel
    ? "\n--- Login settings you pasted in (the Vercel settings page) ---\n"
    : "\n--- Login settings in .env.local ---\n",
);

const userIn = pastedUser ?? env.DASHBOARD_USERNAME;
const user = readSetting("DASHBOARD_USERNAME", userIn);
pass(
  "DASHBOARD_USERNAME is set",
  Boolean(user.value),
  user.value ? `${user.value.length} characters` : "MISSING",
);
for (const f of user.fixed) {
  report("DASHBOARD_USERNAME is untidy", "WARN", `The app removes ${f}. Tidy it anyway.`);
}

if (fromVercel && pastedUser === undefined) {
  report("DASHBOARD_USERNAME", "WARN", "not pasted in, so this is the .env.local one");
}

if (!fromVercel) {
  const secret = env.AUTH_SECRET;
  pass(
    "AUTH_SECRET is set",
    Boolean(secret) && secret.length >= 32,
    !secret
      ? "MISSING"
      : secret.length < 32
        ? `only ${secret.length} characters, too short`
        : `${secret.length} characters`,
  );
} else {
  report(
    "AUTH_SECRET",
    "WARN",
    "cannot be checked from here. Confirm it exists in the Vercel list.",
  );
}

const hashIn = pastedHash ?? env.DASHBOARD_PASSWORD_HASH;
const hashSetting = readSetting("DASHBOARD_PASSWORD_HASH", hashIn);
pass(
  "DASHBOARD_PASSWORD_HASH is set",
  Boolean(hashSetting.value),
  hashSetting.value ? `${hashSetting.value.length} characters` : "MISSING",
);

if (!hashSetting.value) {
  console.log("\nAdd the value, then run this again.\n");
  process.exit(1);
}

for (const f of hashSetting.fixed) {
  report("the value is untidy", "WARN", `The app removes ${f}. Tidy it anyway.`);
}
if (hashSetting.fixed.length === 0) {
  report("the value is tidy", "PASS", "no stray name, no quotes, no spare space");
}

const value = hashSetting.value;
const shape = hashShape(value);

const SHAPE_SAYS = {
  scrypt: "the current kind. Nothing in it can be eaten.",
  bcrypt: "an old kind, still accepted. Run hash-password to move to the new one.",
  "bcrypt-base64":
    "an old kind wrapped in base64, still accepted. Run hash-password to move on.",
};

pass(
  "value shape",
  shape !== "unreadable" && shape !== "bcrypt-cut",
  SHAPE_SAYS[shape] ?? hashProblem(value),
);

if (shape !== "unreadable" && shape !== "bcrypt-cut") {
  const matches = await verifyPassword(password, value);
  pass(
    "the password you typed matches",
    matches,
    matches
      ? "yes"
      : "no. Either the password is different, or the value came from a different password.",
  );
}

console.log(
  `\n${failures === 0 ? "All good. This username and password will work." : failures + " problem(s) above."}\n`,
);
process.exit(failures === 0 ? 0 : 1);
