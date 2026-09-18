/**
 * Make a login password, and the value that goes with it.
 *
 *   npm run hash-password                 invents a strong password for you
 *   npm run hash-password -- "your own"   uses the one you typed
 *   npm run hash-password -- --write      also writes it into .env.local
 *
 * The stored value is hex and dots. There is no `$`, no `+`, no `/` and no `=`
 * in it, so nothing can eat part of it: not a .env file, not the Vercel
 * settings box, not a shell, not a URL. That was the old bug.
 *
 * The hashing itself lives in src/lib/password-hash.mjs, the same file the app
 * uses, so what this prints is exactly what the server will accept.
 *
 * Never commit the password or the value. Never paste either into chat.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { hashPassword, makePassword } from "../src/lib/password-hash.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const given = args.find((a) => !a.startsWith("--"));

if (given && given.length < 12) {
  console.error("Too short. Use at least 12 characters, or let this invent one.");
  process.exit(1);
}

const password = given ?? makePassword();
const invented = given === undefined;
const value = await hashPassword(password);

if (invented) {
  console.log("\n=== YOUR NEW PASSWORD ===");
  console.log("Write this down NOW. It is not stored anywhere in readable form.\n");
  console.log(`    ${password}\n`);
  console.log("The dashes are part of it. It is all lower case.");
}

console.log("\n=== 1. For .env.local ===");
console.log("Copy this WHOLE line into the file:\n");
console.log(`DASHBOARD_PASSWORD_HASH=${value}`);

console.log("\n=== 2. For the Vercel settings page ===");
console.log("Name box:   DASHBOARD_PASSWORD_HASH");
console.log("Value box:  copy the ONE line below, and nothing else.");
console.log('Do NOT put "DASHBOARD_PASSWORD_HASH=" in the value box.');
console.log("Do NOT add quote marks. Do NOT add a space.\n");
console.log(value);

if (write) {
  const path = new URL("../.env.local", import.meta.url);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error("\nCannot read .env.local, so nothing was written to it.");
    console.error("Copy line 1 above into it by hand.\n");
    process.exit(1);
  }

  // Replace the existing line if there is one, otherwise add it at the end.
  // Everything else in the file is left exactly as it was.
  const line = `DASHBOARD_PASSWORD_HASH=${value}`;
  const pattern = /^DASHBOARD_PASSWORD_HASH=.*$/m;
  const updated = pattern.test(text)
    ? text.replace(pattern, line)
    : `${text.replace(/\s*$/, "")}\n${line}\n`;

  writeFileSync(path, updated, "utf8");
  console.log("\nWritten into .env.local. Restart npm run dev to pick it up.");
}

console.log("\nDo not commit it. Do not paste it into chat.\n");
