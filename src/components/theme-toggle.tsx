"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server does not know the chosen theme, so render the frame only
  // until the browser has told us. This avoids a wrong highlight on load.
  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
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
