import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

/**
 * One shared login. There is no user database.
 *
 * The username sits in DASHBOARD_USERNAME and the password is compared
 * against the bcrypt hash in DASHBOARD_PASSWORD_HASH. Never store, log, or
 * return the plain password.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");

        const expectedUser = process.env.DASHBOARD_USERNAME;
        const expectedHash = readHash(process.env.DASHBOARD_PASSWORD_HASH);

        // Misconfigured is the same as wrong. Never fall open.
        if (!expectedUser || !expectedHash) {
          console.error(
            "Login is not set up: DASHBOARD_USERNAME or DASHBOARD_PASSWORD_HASH is missing.",
          );
          return null;
        }
        if (!username || !password) return null;

        // Always run the hash compare, even when the username is wrong, so
        // the reply takes the same time either way.
        const passwordOk = await bcrypt.compare(password, expectedHash);
        const userOk = timingSafeEqual(username, expectedUser);

        if (!passwordOk || !userOk) return null;

        return { id: "dashboard-user", name: expectedUser };
      },
    }),
  ],
});

/**
 * Read the password hash, in either shape.
 *
 * A bcrypt hash looks like `$2b$12$...`. In a .env file, Next.js treats `$2b`
 * as a variable to substitute, so a raw hash arrives 8 characters short and
 * every login fails. Base64 has no `$`, so it survives. We accept both:
 * base64 for .env.local, raw for the Vercel settings page, which does not
 * substitute anything.
 */
function readHash(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("$2")) return value; // already a real hash
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return decoded.startsWith("$2") ? decoded : undefined;
  } catch {
    return undefined;
  }
}

/** Compare two short strings without leaking their length through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
