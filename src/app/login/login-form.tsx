"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("callbackUrl") ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    if (result?.error) {
      // A setup fault is not a wrong password, and saying so saves hours.
      // The server names the missing setting in its own log. Nothing here
      // reveals a username, a password, or a value.
      setError(
        result.code === "setup"
          ? "This dashboard is not set up correctly, so nobody can sign in yet. " +
              "The sign-in settings on the server are missing or mistyped. " +
              "The server log names which one."
          : "That username and password did not match. Try again.",
      );
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Username</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad"
        >
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
