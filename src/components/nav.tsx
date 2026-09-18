"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Activity, BarChart3, LogOut, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENTS, AGENT_ORDER } from "@/lib/agents";
import { ThemeToggle } from "./theme-toggle";
import { ModeToggle } from "./mode-toggle";

const LINKS = [
  { href: "/", label: "Overview", Icon: Activity },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  { href: "/ops", label: "Recaps", Icon: Radio },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/" className="text-base font-semibold">
          Ninja Ops
        </Link>

        <nav aria-label="Sections" className="flex items-center gap-1">
          {LINKS.map(({ href, label, Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="h-5 w-px bg-border" aria-hidden />

        <nav aria-label="Agents" className="flex items-center gap-1">
          {AGENT_ORDER.map((key) => {
            const agent = AGENTS[key];
            const href = `/agent/${key}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                title={agent.plain}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                {agent.label}
                {agent.live ? (
                  <span
                    title="This one takes the real calls"
                    className="rounded-full bg-good-soft px-1.5 py-0.5 text-[10px] font-semibold text-good"
                  >
                    LIVE
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <LogOut aria-hidden className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
