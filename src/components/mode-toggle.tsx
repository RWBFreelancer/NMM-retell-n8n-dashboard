"use client";

import { BookOpen, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReadingMode } from "./reading-mode";

const OPTIONS = [
  {
    value: "simple",
    label: "Simple",
    Icon: BookOpen,
    title: "Plain words only. No technical names.",
  },
  {
    value: "technical",
    label: "Technical",
    Icon: Wrench,
    title: "Also show the real field names, the raw codes, and raw JSON.",
  },
] as const;

export function ModeToggle() {
  const { mode, setMode } = useReadingMode();

  return (
    <div
      role="radiogroup"
      aria-label="How much detail to show"
      className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon, title }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={title}
            onClick={() => setMode(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
