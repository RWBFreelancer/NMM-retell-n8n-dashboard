/**
 * Make the value for DASHBOARD_PASSWORD_HASH.
 *
 *   npm run hash-password -- "the password you picked"
 *
 * It prints two lines. Use the base64 one in .env.local, because Next.js
 * treats the "$" signs in a raw bcrypt hash as variables and eats part of it.
 * Use either one in the Vercel settings page, which does not substitute.
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

console.log("\nFor .env.local (safe from the $ problem):\n");
console.log(`DASHBOARD_PASSWORD_HASH=${b64}`);
console.log("\nFor the Vercel settings page, either that line or this hash:\n");
console.log(hash);
console.log("\nDo not commit it. Do not paste it into chat.\n");
