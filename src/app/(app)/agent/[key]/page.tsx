import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Search } from "lucide-react";
import { getAgentInfo } from "@/lib/agents";
import { getAgent, listAllCalls, RetellError } from "@/lib/retell";
import { summarise } from "@/lib/stats";
import { buildRows } from "@/lib/call-rows";
import {
  CALL_FILTERS,
  applyFilters,
  applySearch,
  readFilters,
} from "@/lib/call-filters";
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ExplainPanel,
  RawName,
} from "@/components/ui";
import { CallTable } from "@/components/call-table";
import { RangePicker } from "@/components/range-picker";
import { rangeLabel, readDays } from "@/lib/ranges";
import { duration, money, rangeForDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** How many rows one page of the table holds. */
const PER_PAGE = 50;

type Query = {
  days?: string;
  f?: string | string[];
  q?: string;
  page?: string;
};

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Query>;
}) {
  const { key } = await params;
  const agent = getAgentInfo(key);
  if (!agent) notFound();

  const query = await searchParams;
  const days = readDays(query.days);
  const filters = readFilters(query.f);
  const search = (query.q ?? "").trim();

  if (!agent.agentId) {
    return (
      <Shell title={agent.fullLabel} subtitle={agent.plain} days={days}>
        <ErrorState
          title="This agent is not set up"
          plain={`We do not know this agent's id, so we cannot read its calls. Add AGENT_${key.toUpperCase()}_ID in the Vercel project settings, then reload.`}
        />
      </Shell>
    );
  }

  const { startMs, endMs } = rangeForDays(days);

  let liveVersion: number | undefined;
  let fieldCount = 0;
  let webhookUrl: string | undefined;
  let calls;
  let truncated = false;

  try {
    // The live version is ALWAYS pulled, never read from a file.
    // (parent CLAUDE.md: never trust a version number written anywhere)
    const [live, result] = await Promise.all([
      getAgent(agent.agentId),
      listAllCalls({ agentId: agent.agentId, startMs, endMs }),
    ]);
    liveVersion = live.version;
    fieldCount = live.post_call_analysis_data?.length ?? 0;
    webhookUrl = live.webhook_url;
    calls = result.calls;
    truncated = result.truncated;
  } catch (err) {
    const plain =
      err instanceof RetellError
        ? err.plain
        : "We could not load this agent's calls. Try again.";
    return (
      <Shell title={agent.fullLabel} subtitle={agent.plain} days={days}>
        <ErrorState plain={plain} />
      </Shell>
    );
  }

  const matching = applySearch(applyFilters(calls, filters), search);
  const rows = buildRows(matching);

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const page = clampPage(query.page, pageCount);
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const s = summarise(matching);
  const narrowed = filters.length > 0 || search !== "";

  return (
    <Shell
      title={agent.fullLabel}
      subtitle={agent.plain}
      days={days}
      badges={
        <>
          {agent.live ? (
            <Chip tone="good">Takes real calls</Chip>
          ) : (
            <Chip tone="neutral">Spare</Chip>
          )}
          <Chip
            tone="info"
            icon={false}
            title="Pulled from Retell just now, never read from a file"
          >
            Version {liveVersion ?? "?"}
          </Chip>
        </>
      }
    >
      <p className="text-sm text-muted">
        {agent.phonePretty}
        <RawName>{agent.agentId}</RawName>
        <span className="technical-only">
          {" · "}
          {fieldCount} analysis fields
          {webhookUrl
            ? ` · recap goes to ${hostOf(webhookUrl)}`
            : " · no recap address set"}
        </span>
      </p>

      <ExplainPanel>
        <p>This is every call this agent took, newest first.</p>
        <p>
          Click the time on any row to open that call, hear the recording and
          read what was said.
        </p>
        <p>
          The chips below narrow the list. Turning on two chips shows only the
          calls that match both.
        </p>
        <p>
          Caller numbers start hidden, so you can show this screen to somebody
          safely. The button above the table reveals them.
        </p>
        <p>
          Everything counts the last {rangeLabel(days).toLowerCase()}, in
          California time.
        </p>
      </ExplainPanel>

      {/* Filters and search */}
      <Card>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            href={linkFor({ days, filters: [], search, page: 1 })}
            active={filters.length === 0}
            label="Every call"
            means="No filter. Show them all."
          />
          {CALL_FILTERS.map((f) => {
            const active = filters.some((on) => on.id === f.id);
            const nextIds = active
              ? filters.filter((on) => on.id !== f.id).map((on) => on.id)
              : [...filters.map((on) => on.id), f.id];
            return (
              <FilterChip
                key={f.id}
                href={linkFor({ days, filters: nextIds, search, page: 1 })}
                active={active}
                label={f.label}
                means={f.means}
                raw={f.raw}
              />
            );
          })}
        </div>

        <form
          action={`/agent/${agent.key}`}
          method="get"
          className="mt-3 flex flex-wrap gap-2"
        >
          <input type="hidden" name="days" value={days} />
          {filters.map((f) => (
            <input key={f.id} type="hidden" name="f" value={f.id} />
          ))}
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
            <span className="sr-only">Find one call by its id</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Paste a call id to find one call"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Find it
          </button>
          {search ? (
            <Link
              href={linkFor({
                days,
                filters: filters.map((f) => f.id),
                search: "",
                page: 1,
              })}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      {/* What the numbers say about the calls now showing */}
      {matching.length > 0 ? (
        <Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini
              value={String(matching.length)}
              label={narrowed ? `Calls shown, out of ${calls.length}` : "Calls"}
            />
            <Mini
              value={String(s.serviceRequests)}
              label="Wanted work done"
              tone="good"
            />
            <Mini value={duration(s.avgDurationMs)} label="Typical length" />
            <Mini value={money(s.totalCostCents)} label="What they cost" />
          </div>
        </Card>
      ) : null}

      {truncated ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          There were more calls than we could load. This page covers the most
          recent 2000 calls in that time, not all of them.
        </p>
      ) : null}

      {/* The table */}
      {calls.length === 0 ? (
        <EmptyState
          title="No calls in this time"
          means={`Nothing came in on this number in the last ${rangeLabel(
            days,
          ).toLowerCase()}. Try a longer time above.`}
        />
      ) : matching.length === 0 ? (
        <EmptyState
          title="No call matches"
          means={
            search
              ? `None of the ${calls.length} calls in this time has that id. Check the id, or clear the search.`
              : `None of the ${calls.length} calls in this time matches those chips. Switch one off to widen it.`
          }
        />
      ) : (
        <>
          <CallTable
            rows={pageRows}
            agentKey={agent.key}
            backQuery={`?days=${days}`}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Pager
              page={page}
              pageCount={pageCount}
              total={rows.length}
              hrefFor={(p) =>
                linkFor({
                  days,
                  filters: filters.map((f) => f.id),
                  search,
                  page: p,
                })
              }
            />
            <a
              href={csvHref({
                key: agent.key,
                days,
                filters: filters.map((f) => f.id),
                search,
              })}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-hover"
            >
              <Download aria-hidden className="h-4 w-4" />
              Download these {rows.length} calls
            </a>
          </div>

          <p className="text-xs text-faint">
            The download is a spreadsheet file. Caller numbers stay hidden in it,
            because a spreadsheet gets forwarded.
          </p>
        </>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
 * Layout and small pieces
 * ------------------------------------------------------------------ */

function Shell({
  title,
  subtitle,
  days,
  badges,
  children,
}: {
  title: string;
  subtitle: string;
  days: number;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {badges}
          <RangePicker days={days} />
        </div>
      </div>
      {children}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  means,
  raw,
}: {
  href: string;
  active: boolean;
  label: string;
  means: string;
  raw?: string;
}) {
  return (
    <Link
      href={href}
      title={means}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface-2 text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {label}
      {raw ? <RawName>{raw}</RawName> : null}
    </Link>
  );
}

function Mini({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "good";
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "good" && "text-good",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Pager({
  page,
  pageCount,
  total,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return (
      <p className="text-sm text-muted">
        All {total === 1 ? "1 call" : `${total} calls`} fit on one page.
      </p>
    );
  }

  return (
    <nav aria-label="Pages of calls" className="flex items-center gap-2 text-sm">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-lg border border-border px-2.5 py-1.5 font-medium transition-colors hover:bg-surface-hover"
        >
          ← Newer
        </Link>
      ) : (
        <span className="rounded-lg border border-border px-2.5 py-1.5 text-faint">
          ← Newer
        </span>
      )}

      <span className="text-muted">
        Page {page} of {pageCount}, {total} calls in all
      </span>

      {page < pageCount ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-lg border border-border px-2.5 py-1.5 font-medium transition-colors hover:bg-surface-hover"
        >
          Older →
        </Link>
      ) : (
        <span className="rounded-lg border border-border px-2.5 py-1.5 text-faint">
          Older →
        </span>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * URL building. One helper, so a chip, the pager and the search box all
 * keep every other choice the person already made.
 * ------------------------------------------------------------------ */

function buildQuery({
  days,
  filters,
  search,
  page,
}: {
  days: number;
  filters: string[];
  search: string;
  page: number;
}): URLSearchParams {
  const q = new URLSearchParams();
  q.set("days", String(days));
  for (const id of filters) q.append("f", id);
  if (search) q.set("q", search);
  if (page > 1) q.set("page", String(page));
  return q;
}

function linkFor(input: {
  days: number;
  filters: string[];
  search: string;
  page: number;
}): string {
  return `?${buildQuery(input).toString()}`;
}

function csvHref(input: {
  key: string;
  days: number;
  filters: string[];
  search: string;
}): string {
  const q = buildQuery({ ...input, page: 1 });
  q.delete("page");
  q.set("agent", input.key);
  return `/api/retell/calls/export?${q.toString()}`;
}

/** A page number outside the real range becomes the nearest real one. */
function clampPage(raw: string | undefined, pageCount: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), pageCount);
}

/** Show only the host of the recap address. The full URL can carry a token. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "an address we could not read";
  }
}
