import Link from "next/link";
import { Download } from "lucide-react";
import { AGENTS, AGENT_ORDER, type AgentKey } from "@/lib/agents";
import { listAllCalls, RetellError, type RetellCall } from "@/lib/retell";
import {
  callTypeSlices,
  compare,
  crossTabs,
  serviceReport,
  trendByDay,
  type Slice,
} from "@/lib/reports";
import { RULES_CHANGED } from "@/lib/service-categories";
import { analysisValue } from "@/lib/stats";
import {
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorState,
  ExplainPanel,
  RawName,
} from "@/components/ui";
import { ShareBar, TrendChart } from "@/components/report-charts";
import { CopyText } from "@/components/copy-text";
import { RangePicker } from "@/components/range-picker";
import { rangeLabel, readDays } from "@/lib/ranges";
import { rangeForDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Query = { days?: string; agent?: string };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const days = readDays(query.days);
  const who = query.agent === "a" || query.agent === "b" ? query.agent : "both";

  const keys: AgentKey[] = who === "both" ? AGENT_ORDER : [who];
  const missing = keys.filter((k) => !AGENTS[k].agentId);
  if (missing.length > 0) {
    return (
      <Shell days={days} who={who}>
        <ErrorState
          title="An agent is not set up"
          plain="We do not know that agent's id, so we cannot count its calls. Check the settings, then reload."
        />
      </Shell>
    );
  }

  const { startMs, endMs } = rangeForDays(days);
  // The same length of time again, ending where this one starts.
  const beforeStart = startMs - (endMs - startMs);

  const calls: RetellCall[] = [];
  const before: RetellCall[] = [];
  let truncated = false;

  try {
    // ONE AT A TIME, on purpose. Two agents across two periods, each paging
    // through its results, is up to eighty requests. Fired together, Retell
    // answers 429 "too many, too fast" and the whole page fails. Sequential is
    // slower to finish and the only version that actually works.
    for (const k of keys) {
      const nowPeriod = await listAllCalls({
        agentId: AGENTS[k].agentId,
        startMs,
        endMs,
      });
      calls.push(...nowPeriod.calls);
      truncated = truncated || nowPeriod.truncated;

      const beforePeriod = await listAllCalls({
        agentId: AGENTS[k].agentId,
        startMs: beforeStart,
        endMs: startMs,
      });
      before.push(...beforePeriod.calls);
    }
  } catch (err) {
    const plain =
      err instanceof RetellError ? err.plain : "We could not load the calls. Try again.";
    return (
      <Shell days={days} who={who}>
        <ErrorState plain={plain} />
      </Shell>
    );
  }

  calls.sort((a, b) => (b.start_timestamp ?? 0) - (a.start_timestamp ?? 0));

  if (calls.length === 0) {
    return (
      <Shell days={days} who={who}>
        <EmptyState
          title="No calls in this time"
          means={`Nothing came in during the last ${rangeLabel(days).toLowerCase()}. Try a longer time above.`}
        />
      </Shell>
    );
  }

  const types = callTypeSlices(calls);
  const service = serviceReport(calls);
  const tabs = crossTabs(calls);
  const trend = trendByDay(calls, days);

  // Same period before this one, so a number has something to mean.
  const wanted = (list: RetellCall[]) =>
    list.filter((c) => analysisValue(c, "call_type") === "service_request").length;
  const quiet = (list: RetellCall[]) =>
    list.filter((c) => analysisValue(c, "call_type") === "unknown").length;

  // No calls at all in the period before means there is nothing to compare
  // with, which is different from "no change".
  const nothingBefore = before.length === 0;
  const changes = [
    // Nobody has decided whether more calls is good or bad, so no colour.
    compare("Calls", calls.length, before.length, null, nothingBefore),
    compare("Wanted work done", wanted(calls), wanted(before), true, nothingBefore),
    compare(
      "Never said what they wanted",
      quiet(calls),
      quiet(before),
      false,
      nothingBefore,
    ),
  ];

  // The series in a fixed order, so the trend and the bar agree on colour.
  const seriesKeys = types.map((s) => s.key);
  const seriesLabels = Object.fromEntries(types.map((s) => [s.key, s.label]));
  const colorIndexes = Object.fromEntries(types.map((s) => [s.key, s.colorIndex]));
  const trendData = trend.map((d) => ({
    label: d.label,
    ...Object.fromEntries(seriesKeys.map((k) => [k, d.counts[k] ?? 0])),
  }));

  const agentPage = who === "both" ? "/agent/b" : `/agent/${who}`;

  return (
    <Shell days={days} who={who}>
      <ExplainPanel>
        <p>Two questions, answered from the calls themselves.</p>
        <p>
          <strong>What kind of calls came in.</strong> The agent decides this on
          every call, so these numbers are its own answers, not a guess.
        </p>
        <p>
          <strong>What work the caller wanted.</strong> Nobody asks the agent
          this yet, so it is worked out from the words the caller used. It is a
          guess, and the page says so.
        </p>
        <p>
          Everything counts the last {rangeLabel(days).toLowerCase()}, in
          California time.
        </p>
      </ExplainPanel>

      {truncated ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          There were more calls than we could load, so these counts cover the
          most recent 2000 only.
        </p>
      ) : null}

      {/* How this period compares with the one before */}
      <Card>
        <CardTitle hint="This period against the same length of time before it.">
          What changed
        </CardTitle>
        <ul className="space-y-1.5">
          {changes.map((c) => (
            <li key={c.label} className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-sm text-muted">{c.label}</span>
              <span className="text-lg font-semibold tabular-nums">{c.now}</span>
              <span
                className={cn(
                  "text-sm",
                  c.tone === "good" && "text-good",
                  c.tone === "bad" && "text-bad",
                  c.tone === "neutral" && "text-muted",
                )}
              >
                {c.sentence}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Report 1 */}
      <Card>
        <CardTitle hint="The agent's own answer on every call. Not a guess.">
          What kind of calls came in
        </CardTitle>

        <ShareBar slices={types} />

        <SliceTable slices={types} total={calls.length} agentPage={agentPage} days={days} />

        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          <strong className="font-medium text-foreground">
            About &ldquo;never said&rdquo;.
          </strong>{" "}
          It is usually the biggest slice, and it is mostly people who hung up
          before saying anything. It is shown on its own and never folded into
          another kind, because doing that would make the agent look better than
          it is.
        </p>
      </Card>

      <Card>
        <CardTitle hint="One column per day, split by the kind of call.">
          Calls per day
        </CardTitle>
        <TrendChart
          data={trendData}
          seriesKeys={seriesKeys}
          seriesLabels={seriesLabels}
          colorIndexes={colorIndexes}
        />
      </Card>

      {/* Report 2 */}
      <Card>
        <CardTitle hint="Worked out from the words the caller used.">
          What work did they want
        </CardTitle>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Chip tone="warn">Best guess</Chip>
          <p className="text-sm text-muted">
            {service.fromField > 0
              ? `${service.fromField} of these are the agent's own answer. The rest are guessed from what the caller said.`
              : "Every one of these is guessed from what the caller said. The agent is not asked this question yet."}
          </p>
        </div>

        <ShareBar slices={service.slices} />

        <SliceTable slices={service.slices} total={calls.length} />

        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          <strong className="font-medium text-foreground">Read this before trusting it.</strong>{" "}
          {service.noWords} of {calls.length} calls left no words to work from,
          and {service.noMatch} had words that matched none of our rules. Those
          two are shown as their own slices and are never hidden. The rules
          last changed on {RULES_CHANGED}; changing them changes the past too,
          because every report re-reads old calls through today&apos;s rules.
        </p>
      </Card>

      {/* Cross-tabs */}
      <div className="grid gap-4 lg:grid-cols-2">
        {tabs.map((tab) => (
          <Card key={tab.id}>
            <CardTitle hint={tab.means}>
              {tab.label}
              <RawName>{tab.raw}</RawName>
            </CardTitle>
            <ShareBar slices={tab.slices} />
            <SliceTable slices={tab.slices} total={calls.length} compact />
          </Card>
        ))}
      </div>

      <CopyText text={summaryText(days, who, calls.length, types, service, changes)} />

      <div>
        <a
          href={`/api/reports/export?days=${days}&agent=${who}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-hover"
        >
          <Download aria-hidden className="h-4 w-4" />
          Download these tables
        </a>
        <p className="mt-1 text-xs text-faint">
          A spreadsheet of the counts above. No caller name, number or call id
          is in it.
        </p>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function Shell({
  days,
  who,
  children,
}: {
  days: number;
  who: string;
  children: React.ReactNode;
}) {
  const choices = [
    { id: "both", label: "Both agents" },
    { id: "b", label: AGENTS.b.label },
    { id: "a", label: AGENTS.a.label },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted">
            What kind of calls came in, and what work people wanted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Which agent to count"
            className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5"
          >
            {choices.map((c) => (
              <Link
                key={c.id}
                href={`/reports?days=${days}&agent=${c.id}`}
                role="radio"
                aria-checked={who === c.id}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  who === c.id
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
          <RangePicker days={days} />
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * The same numbers as the chart, in a table.
 *
 * Not decoration. A chart that can only be read by colour is unreadable to
 * some people and unusable on a printout, so the table is always there.
 */
function SliceTable({
  slices,
  total,
  agentPage,
  days,
  compact,
}: {
  slices: Slice[];
  total: number;
  agentPage?: string;
  days?: number;
  compact?: boolean;
}) {
  return (
    <table className={cn("mt-4 w-full text-sm", compact && "mt-3")}>
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted">
          <th scope="col" className="pb-1 font-semibold">Answer</th>
          <th scope="col" className="pb-1 text-right font-semibold">Calls</th>
          <th scope="col" className="pb-1 text-right font-semibold">Share</th>
        </tr>
      </thead>
      <tbody>
        {slices.map((slice) => (
          <tr key={slice.key} className="border-t border-border">
            <td className="py-1.5">
              {agentPage && slice.filterId && days ? (
                <Link
                  href={`${agentPage}?days=${days}&f=${slice.filterId}`}
                  title={`${slice.means} Click to see these calls.`}
                  className="text-accent hover:underline"
                >
                  {slice.label}
                </Link>
              ) : (
                <span title={slice.means}>{slice.label}</span>
              )}
              {slice.key !== "(not recorded)" ? (
                <RawName>{slice.key}</RawName>
              ) : null}
            </td>
            <td className="py-1.5 text-right tabular-nums">{slice.count}</td>
            <td className="py-1.5 text-right tabular-nums">
              {Math.round(slice.share)}%
            </td>
          </tr>
        ))}
        <tr className="border-t border-border-strong font-medium">
          <td className="py-1.5">Every call</td>
          <td className="py-1.5 text-right tabular-nums">{total}</td>
          <td className="py-1.5 text-right tabular-nums">100%</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * The short version, as a few lines Rey can paste into the group chat.
 *
 * Plain sentences, no jargon, no field names, and it says out loud which part
 * is a guess.
 */
function summaryText(
  days: number,
  who: string,
  total: number,
  types: Slice[],
  service: ReturnType<typeof serviceReport>,
  changes: ReturnType<typeof compare>[],
): string {
  const whoLabel =
    who === "both" ? "Both agents" : `${AGENTS[who as AgentKey].label}`;
  const lines: string[] = [];

  lines.push(`${whoLabel}, last ${rangeLabel(days).toLowerCase()}: ${total} calls.`);
  lines.push("");
  lines.push("What kind of calls:");
  for (const slice of types.slice(0, 5)) {
    lines.push(`- ${slice.label}: ${slice.count} (${Math.round(slice.share)}%)`);
  }
  lines.push("");

  const topWork = service.slices.filter((s) => !s.isUnknown).slice(0, 3);
  if (topWork.length > 0) {
    lines.push("What work they wanted, best guess from their words:");
    for (const slice of topWork) {
      lines.push(`- ${slice.label}: ${slice.count}`);
    }
    lines.push(
      `- No words to go on: ${service.noWords}. Words that matched nothing: ${service.noMatch}.`,
    );
    lines.push("");
  }

  lines.push("Compared with the same time before:");
  for (const c of changes) lines.push(`- ${c.label}: ${c.now}. ${c.sentence}`);

  return lines.join("\n");
}
