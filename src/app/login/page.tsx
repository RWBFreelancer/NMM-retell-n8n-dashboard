import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Sign in — Ninja Ops" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ninja Ops</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to see the calls and the recaps.
        </p>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <ThemeToggle />
    </main>
  );
}
