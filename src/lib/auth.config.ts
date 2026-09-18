import type { NextAuthConfig } from "next-auth";

/**
 * The edge-safe half of the auth setup.
 *
 * middleware.ts runs on the edge runtime, which cannot load bcrypt. So the
 * password check lives in auth.ts and this file holds only the route rules.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  trustHost: true,
  callbacks: {
    /**
     * One rule: you must be signed in for everything except the login page
     * and the auth endpoints themselves. Applied by middleware.ts.
     */
    authorized({ auth, request }) {
      const signedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/api/auth")) return true;
      if (pathname === "/login") return true;

      return signedIn;
    },
  },
  providers: [], // filled in by auth.ts, which runs on Node
};
