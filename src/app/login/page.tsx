import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { loginSetupProblem } from "@/lib/login-setup";

export const metadata = { title: "Sign in — Ninja Ops" };

// The setup check reads environment variables, so this page must not be
// pre-rendered at build time with whatever values the build had.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Checked on the server, before anybody types. A sign-in cannot possibly
  // work while this is set, so say so instead of blaming the password. The
  // sentence names the setting, never a value.
  const setupProblem = loginSetupProblem();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ninja Ops</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to see the calls and the recaps.
        </p>

        {setupProblem ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn"
          >
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong className="font-semibold">This dashboard is not set up yet.</strong>{" "}
              Nobody can sign in until somebody fixes the settings on the server.{" "}
              {setupProblem}
            </span>
          </div>
        ) : null}

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <ThemeToggle />
    </main>
  );
}
