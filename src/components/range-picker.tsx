"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { RANGES } from "@/lib/ranges";

export function RangePicker({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function pick(next: number) {
    const q = new URLSearchParams(params.toString());
    q.set("days", String(next));
    router.push(`${pathname}?${q.toString()}`);
  }

  return (
    <div
      role="radiogroup"
      aria-label="How far back to look"
      className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5"
    >
      {RANGES.map((r) => {
        const active = r.days === days;
        return (
          <button
            key={r.days}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(r.days)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
