import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { readSetting, loginSetupProblem } from "./login-setup";
import { verifyPassword } from "./password-hash.mjs";

/**
 * Raised when the deployment itself is wrong, not the typed password.
 *
 * The login page shows a different sentence for this, so a missing or
 * mistyped setting is never mistaken for a wrong password. The code is the
 * only thing that reaches the browser, and it names no value.
 */
class SetupError extends CredentialsSignin {
  code = "setup";
}

/**
 * One shared login. There is no user database.
 *
 * The username sits in DASHBOARD_USERNAME and the password is compared
 * against the hash in DASHBOARD_PASSWORD_HASH. The hashing itself lives in
 * password-hash.mjs, which the two npm scripts share. Never store, log, or
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
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");

        // Misconfigured is the same as wrong. Never fall open.
        // This message names the setting, never a value, so it is safe in the
        // Vercel logs. SetupError carries code "setup" to the login page, so
        // the person is told to check the settings, not their password.
        const setupProblem = loginSetupProblem();
        if (setupProblem) {
          console.error(`LOGIN SETUP: ${setupProblem}`);
          throw new SetupError();
        }

        const expectedUser = readSetting("DASHBOARD_USERNAME") as string;
        const expectedHash = readSetting("DASHBOARD_PASSWORD_HASH") as string;

        if (!username || !password) return null;

        // Always run the hash compare, even when the username is wrong, so
        // the reply takes the same time either way.
        const passwordOk = await verifyPassword(password, expectedHash);
        const userOk = timingSafeEqual(username, expectedUser);

        if (!passwordOk || !userOk) {
          // Says which half was wrong in the SERVER log only. The person on
          // the login page is still told nothing.
          console.error(
            `LOGIN REFUSED: username ${userOk ? "ok" : "wrong"}, password ${passwordOk ? "ok" : "wrong"}.`,
          );
          return null;
        }

        return { id: "dashboard-user", name: expectedUser };
      },
    }),
  ],
});

/** Compare two short strings without leaking their length through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
