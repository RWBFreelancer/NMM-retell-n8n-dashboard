import Link from "next/link";
import { Suspense } from "react";
import { AGENTS, AGENT_ORDER, type AgentInfo, type AgentKey } from "@/lib/agents";
import { getAgent, listAllCalls, RetellError, type RetellCall } from "@/lib/retell";
import { listExecutions, N8nError, getWorkflow } from "@/lib/n8n";
import { summarise, type AgentStats } from "@/lib/stats";
import { trendByDay, callTypeSlices } from "@/lib/reports";
import {
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorState,
  ExplainPanel,
  RawName,
  StatTile,
} from "@/components/ui";
import { CompareChart, type CompareRow } from "@/components/compare-chart";
import { TrendChart } from "@/components/report-charts";
import { RangePicker } from "@/components/range-picker";
import { rangeLabel, readDays } from "@/lib/ranges";
import {
  ago,
  duration,
  money,
  outOfHundred,
  percent,
  rangeForDays,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Everything one agent card and the charts need, fetched once. */
type Loaded = {
  agent: AgentInfo;
  liveVersion?: number;
  fieldCount: number;
  calls: RetellCall[];
  stats: AgentStats;
  truncated: boolean;
  /** A sentence to show instead of the card, when the read failed. */
  problem?: string;
};

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const days = readDays(raw);

  // ONE AT A TIME. Each agent pages through its own calls, and firing both
  // together is what makes Retell answer "too many, too fast". Fetched once
  // here and shared, so the cards and the charts never ask twice.
  const loaded: Loaded[] = [];
  for (const key of AGENT_ORDER) {
    loaded.push(await loadAgent(key, days));
  }

  const withCalls = loaded.filter((l) => !l.problem);
  const anyCalls = withCalls.some((l) => l.calls.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted">
            Both agents, and whether the leads reached Daniel.
          </p>
        </div>
        <RangePicker days={days} />
      </div>

      <ExplainPanel>
        <p>This page is the quick look.</p>
        <p>
          The top two boxes are the two phone agents. Agent B answers every real
          call. Agent A is the spare.
        </p>
        <p>
          The bottom box watches the robot that emails the recap and sends the
          lead to Daniel.
        </p>
        <p>
          Everything counts the last {rangeLabel(days).toLowerCase()}, in
          California time.
        </p>
      </ExplainPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        {loaded.map((l) => (
          <AgentCard key={l.agent.key} loaded={l} days={days} />
        ))}
      </div>

      {anyCalls ? (
        <>
          <Card>
            <CardTitle hint="Both agents do the same job a different way. This is how they differ.">
              How the two compare
            </CardTitle>
            <CompareChart
              rows={compareRows(loaded)}
              counts={{
                b: loaded.find((l) => l.agent.key === "b")?.calls.length ?? 0,
                a: loaded.find((l) => l.agent.key === "a")?.calls.length ?? 0,
              }}
            />
            <p className="mt-3 text-sm text-muted">
              Only measures counted the same way share this chart. Average call
              length is a different kind of number, so it sits on the cards
              above instead of being squeezed in here.
            </p>
          </Card>

          <Card>
            <CardTitle hint="Every call on both numbers, day by day.">
              Calls per day
            </CardTitle>
            <DayChart loaded={withCalls} days={days} />
          </Card>
        </>
      ) : null}

      <Suspense fallback={<LoadingCard name="The recap robot" />}>
        <RecapCard days={days} />
      </Suspense>
    </div>
  );
}

/**
 * Read one agent: its live version, its settings, and its calls.
 *
 * A failure comes back as a sentence rather than being thrown, so one agent
 * being unreadable does not take the whole page down with it.
 */
async function loadAgent(key: AgentKey, days: number): Promise<Loaded> {
  const agent = AGENTS[key];
  const { startMs, endMs } = rangeForDays(days);
  const empty = {
    agent,
    fieldCount: 0,
    calls: [] as RetellCall[],
    stats: summarise([]),
    truncated: false,
  };

  if (!agent.agentId) {
    return {
      ...empty,
      problem: `We do not know this agent's id, so we cannot read its calls. Add AGENT_${key.toUpperCase()}_ID in the Vercel project settings, then reload.`,
    };
  }

  try {
    // The live version is ALWAYS pulled. Never read from a file.
    const live = await getAgent(agent.agentId);
    const result = await listAllCalls({ agentId: agent.agentId, startMs, endMs });
    return {
      agent,
      liveVersion: live.version,
      fieldCount: live.post_call_analysis_data?.length ?? 0,
      calls: result.calls,
      stats: summarise(result.calls),
      truncated: result.truncated,
    };
  } catch (err) {
    return {
      ...empty,
      problem:
        err instanceof RetellError
          ? err.plain
          : "We could not load this agent. Try again.",
    };
  }
}

/**
 * The three measures worth comparing.
 *
 * All three are "out of every 100 calls", so they belong on one chart. Each
 * agent is measured against its OWN call count, never against the other's:
 * Agent A takes almost no calls, so a raw count would make it look perfect.
 */
function compareRows(loaded: Loaded[]): CompareRow[] {
  const find = (key: AgentKey) => loaded.find((l) => l.agent.key === key);
  const rate = (key: AgentKey, pick: (s: AgentStats) => number) => {
    const l = find(key);
    if (!l || l.stats.total === 0) return 0;
    return (pick(l.stats) / l.stats.total) * 100;
  };

  return [
    {
      label: "Wanted work done",
      means: "Callers who asked us to fix or service something.",
      b: rate("b", (s) => s.serviceRequests),
      a: rate("a", (s) => s.serviceRequests),
    },
    {
      label: "Details missing",
      means: "Calls where the agent did not get everything Daniel needs.",
      b: rate("b", (s) => s.incomplete),
      a: rate("a", (s) => s.incomplete),
    },
    {
      label: "Needs a person",
      means: "Calls somebody should listen to before anything else happens.",
      b: rate("b", (s) => s.needsPerson),
      a: rate("a", (s) => s.needsPerson),
    },
    {
      label: "Never said why",
      means: "Callers who hung up or said nothing at all.",
      b: rate("b", (s) => s.nothingSaid),
      a: rate("a", (s) => s.nothingSaid),
    },
  ];
}

/** Calls per day, both agents together, split by the kind of call. */
function DayChart({ loaded, days }: { loaded: Loaded[]; days: number }) {
  const all = loaded.flatMap((l) => l.calls);
  const slices = callTypeSlices(all);
  const trend = trendByDay(all, days);

  const seriesKeys = slices.map((s) => s.key);
  const data = trend.map((d) => ({
    label: d.label,
    ...Object.fromEntries(seriesKeys.map((k) => [k, d.counts[k] ?? 0])),
  }));

  return (
    <TrendChart
      data={data}
      seriesKeys={seriesKeys}
      seriesLabels={Object.fromEntries(slices.map((s) => [s.key, s.label]))}
      colorIndexes={Object.fromEntries(slices.map((s) => [s.key, s.colorIndex]))}
    />
  );
}

function LoadingCard({ name }: { name: string }) {
  return (
    <Card>
      <CardTitle>{name}</CardTitle>
      <p className="text-sm text-muted">Loading…</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * One agent
 * ------------------------------------------------------------------ */

function AgentCard({ loaded, days }: { loaded: Loaded; days: number }) {
  const { agent, liveVersion, fieldCount, calls, stats: s, truncated } = loaded;

  if (loaded.problem) {
    return (
      <Card>
        <CardTitle>{agent.fullLabel}</CardTitle>
        <ErrorState plain={loaded.problem} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            <Link href={`/agent/${agent.key}`} className="hover:underline">
              {agent.fullLabel}
            </Link>
          </h2>
          <p className="text-sm text-muted">{agent.plain}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {agent.live ? (
            <Chip tone="good">Takes real calls</Chip>
          ) : (
            <Chip tone="neutral">Spare</Chip>
          )}
          <Chip tone="info" icon={false} title="Pulled from Retell just now">
            Version {liveVersion ?? "?"}
          </Chip>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted">
        {agent.phonePretty}
        <RawName>{agent.agentId}</RawName>
        <span className="technical-only"> · {fieldCount} analysis fields</span>
      </p>

      {calls.length === 0 ? (
        <EmptyState
          title="No calls in this time"
          means={`Nothing came in on this number in the last ${rangeLabel(days).toLowerCase()}.`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat value={s.total} label="Calls" />
            <MiniStat
              value={s.serviceRequests}
              label="Wanted service"
              tone="good"
            />
            <MiniStat
              value={s.nothingSaid}
              label="Said nothing"
              tone={s.nothingSaid > s.total / 2 ? "warn" : undefined}
            />
            <MiniStat value={duration(s.avgDurationMs)} label="Typical length" />
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            <Line
              label="Missing details"
              raw="incomplete_intake"
              value={`${s.incomplete} of ${s.total}`}
              note={outOfHundred(s.incomplete, s.total)}
            />
            <Line
              label="Needs a person"
              raw="human_review_required"
              value={`${s.needsPerson} of ${s.total}`}
              note={outOfHundred(s.needsPerson, s.total)}
            />
            <Line
              label="Sales calls"
              raw="sales_or_spam"
              value={`${s.salesOrSpam} of ${s.total}`}
            />
            <Line label="What it cost" value={money(s.totalCostCents)} />
            {s.replySpeedMs ? (
              <Line
                label="Reply speed"
                raw="latency.e2e.p50"
                value={`${(s.replySpeedMs / 1000).toFixed(1)}s`}
                note="How long the agent waits before it speaks."
              />
            ) : null}
          </dl>

          {truncated ? (
            <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              There were more calls than we loaded. These numbers cover the most
              recent 2000 only.
            </p>
          ) : null}

          <Link
            href={`/agent/${agent.key}?days=${days}`}
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            See every call →
          </Link>
        </>
      )}
    </Card>
  );
}

function MiniStat({
  value,
  label,
  tone,
}: {
  value: React.ReactNode;
  label: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p
        className={
          tone === "warn"
            ? "text-2xl font-semibold tabular-nums text-warn"
            : tone === "good"
              ? "text-2xl font-semibold tabular-nums text-good"
              : "text-2xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Line({
  label,
  raw,
  value,
  note,
}: {
  label: string;
  raw?: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="text-muted">
        {label}
        {raw ? <RawName>{raw}</RawName> : null}
      </dt>
      <dd className="text-right">
        <span className="font-medium tabular-nums">{value}</span>
        {note ? <span className="ml-2 text-xs text-muted">{note}</span> : null}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The recap workflow
 * ------------------------------------------------------------------ */

async function RecapCard({ days }: { days: number }) {
  let runs;
  let workflowName = "the recap workflow";
  let active = false;

  try {
    const [list, workflow] = await Promise.all([
      listExecutions({ limit: 250 }),
      getWorkflow(),
    ]);
    runs = list.data ?? [];
    workflowName = workflow.name;
    active = workflow.active;
  } catch (err) {
    const plain =
      err instanceof N8nError
        ? err.plain
        : "We could not reach n8n. Try again.";
    return (
      <Card>
        <CardTitle>The recap robot</CardTitle>
        <ErrorState plain={plain} />
      </Card>
    );
  }

  const { startMs } = rangeForDays(days);
  const inRange = runs.filter((r) => Date.parse(r.startedAt) >= startMs);
  const failed = inRange.filter((r) => r.status === "error").length;
  const ok = inRange.filter((r) => r.status === "success").length;
  const other = inRange.length - failed - ok;
  const newest = runs[0] ? Date.parse(runs[0].startedAt) : undefined;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">The recap robot</h2>
          <p className="text-sm text-muted">
            After each call it emails Robert and sends the lead to Daniel.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {active ? (
            <Chip tone="good">Switched on</Chip>
          ) : (
            <Chip tone="bad">Switched OFF</Chip>
          )}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted">
        {workflowName}
        {newest ? ` · last run ${ago(newest)}` : null}
      </p>

      {inRange.length === 0 ? (
        <EmptyState
          title="No recaps ran"
          means={`Nothing ran in the last ${rangeLabel(days).toLowerCase()}. If calls came in, that is a problem.`}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            value={ok}
            label="Reached Daniel"
            means="The recap finished and the lead went on."
            tone="good"
            sub={`${percent(ok, inRange.length)} of ${inRange.length} runs`}
          />
          <StatTile
            value={failed}
            label="Did not reach Daniel"
            means="The recap ran but broke part way. Daniel never got these."
            tone={failed > 0 ? "bad" : undefined}
            sub={failed === 0 ? "None. Good." : "Open these and read the red step."}
          />
          <StatTile
            value={other}
            label="Still going or stopped"
            means="Runs that are not finished, or were cancelled."
          />
        </div>
      )}

      <Link
        href="/ops"
        className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
      >
        See every recap run →
      </Link>
    </Card>
  );
}
