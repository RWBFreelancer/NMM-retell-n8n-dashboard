import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe: no providers, so no bcrypt here.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  /**
   * Guard everything except Next internals and static files.
   * That includes every /api route, so a logged-out request for data gets
   * bounced before it can reach Retell or n8n.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"],
};
