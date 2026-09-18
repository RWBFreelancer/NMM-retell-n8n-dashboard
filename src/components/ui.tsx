import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plain, Tone } from "@/lib/plain";

/* ------------------------------------------------------------------ *
 * Card
 * ------------------------------------------------------------------ */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {children}
      </h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chip. Colour is never the only signal: every chip carries a word, and
 * a status chip also carries an icon.
 * ------------------------------------------------------------------ */

const TONE_CLASS: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  neutral: "bg-neutral-soft text-neutral",
};

const TONE_ICON: Record<Tone, typeof Info> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  info: Info,
  neutral: CircleHelp,
};

export function Chip({
  tone = "neutral",
  children,
  icon = true,
  title,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: boolean;
  title?: string;
  className?: string;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon ? <Icon aria-hidden className="h-3 w-3 shrink-0" /> : null}
      {children}
    </span>
  );
}

/** A chip built straight from a plain-English entry. */
export function PlainChip({ plain }: { plain: Plain }) {
  return (
    <Chip tone={plain.tone ?? "neutral"} title={plain.means}>
      {plain.label}
    </Chip>
  );
}

/* ------------------------------------------------------------------ *
 * Stat tile. Every number gets a sentence under it. That is the rule.
 * ------------------------------------------------------------------ */

export function StatTile({
  value,
  label,
  means,
  tone,
  sub,
}: {
  value: ReactNode;
  label: string;
  /** The plain sentence. Required, not optional. */
  means: string;
  tone?: Tone;
  /** An extra line, such as "12 of every 100 calls." */
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-3xl font-semibold tabular-nums",
          tone === "bad" && "text-bad",
          tone === "good" && "text-good",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm font-medium">{sub}</p> : null}
      <p className="mt-1 text-sm text-muted">{means}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Empty and error states. Never a blank box, never a bare code.
 * ------------------------------------------------------------------ */

export function EmptyState({
  title,
  means,
}: {
  title: string;
  means: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{means}</p>
    </div>
  );
}

export function ErrorState({
  title = "That did not load",
  plain,
}: {
  title?: string;
  plain: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bad-soft p-5">
      <p className="flex items-center gap-2 font-medium text-bad">
        <XCircle aria-hidden className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-1 text-sm text-bad">{plain}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The "What am I looking at?" panel. Closed by default.
 * ------------------------------------------------------------------ */

export function ExplainPanel({
  children,
  label = "What am I looking at?",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className="rounded-xl border border-border bg-surface-2 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium select-none">
        {label}
      </summary>
      <div className="mt-2 space-y-1 text-sm text-muted [&>p]:leading-relaxed">
        {children}
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------ *
 * The small grey twin of a plain label. Hidden in Simple mode by CSS,
 * so it works in a server component with no JavaScript.
 * ------------------------------------------------------------------ */

export function RawName({ children }: { children: ReactNode }) {
  return (
    <code className="technical-only ml-1 rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-faint">
      {children}
    </code>
  );
}
