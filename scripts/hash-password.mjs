/**
 * Make the value for DASHBOARD_PASSWORD_HASH.
 *
 *   npm run hash-password -- "the password you picked"
 *
 * It prints the value twice, once shaped for a .env.local file and once bare
 * for the Vercel settings page. Use the base64 form in .env.local, because
 * Next.js treats the "$" signs in a raw bcrypt hash as variables and eats
 * part of it. Vercel substitutes nothing, so either form works there.
 *
 * Never commit the password or the hash. Never paste them into chat.
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}
if (password.length < 12) {
  console.error("Too short. Use at least 12 characters.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const b64 = Buffer.from(hash, "utf8").toString("base64");

console.log("\n=== 1. For .env.local ===");
console.log("Copy this WHOLE line into the file:\n");
console.log(`DASHBOARD_PASSWORD_HASH=${b64}`);

console.log("\n=== 2. For the Vercel settings page ===");
console.log("Name box:   DASHBOARD_PASSWORD_HASH");
console.log("Value box:  copy the ONE line below, and nothing else.");
console.log('Do NOT put "DASHBOARD_PASSWORD_HASH=" in the value box.');
console.log("Do NOT add quote marks. Do NOT add a space.\n");
console.log(b64);

console.log("\nDo not commit it. Do not paste it into chat.\n");
