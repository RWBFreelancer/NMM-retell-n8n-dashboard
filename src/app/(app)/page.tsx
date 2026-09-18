import Link from "next/link";
import { Suspense } from "react";
import { AGENTS, AGENT_ORDER, type AgentKey } from "@/lib/agents";
import { getAgent, listAllCalls, RetellError } from "@/lib/retell";
import { listExecutions, N8nError, getWorkflow } from "@/lib/n8n";
import { summarise } from "@/lib/stats";
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

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const days = readDays(raw);

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
        {AGENT_ORDER.map((key) => (
          <Suspense key={key} fallback={<LoadingCard name={AGENTS[key].fullLabel} />}>
            <AgentCard agentKey={key} days={days} />
          </Suspense>
        ))}
      </div>

      <Suspense fallback={<LoadingCard name="The recap robot" />}>
        <RecapCard days={days} />
      </Suspense>
    </div>
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

async function AgentCard({
  agentKey,
  days,
}: {
  agentKey: AgentKey;
  days: number;
}) {
  const agent = AGENTS[agentKey];
  const { startMs, endMs } = rangeForDays(days);

  let liveVersion: number | undefined;
  let fieldCount = 0;
  let calls;
  let truncated = false;

  try {
    // The live version is ALWAYS pulled. Never read from a file.
    const [live, result] = await Promise.all([
      getAgent(agent.agentId),
      listAllCalls({ agentId: agent.agentId, startMs, endMs }),
    ]);
    liveVersion = live.version;
    fieldCount = live.post_call_analysis_data?.length ?? 0;
    calls = result.calls;
    truncated = result.truncated;
  } catch (err) {
    const plain =
      err instanceof RetellError
        ? err.plain
        : "We could not load this agent. Try again.";
    return (
      <Card>
        <CardTitle>{agent.fullLabel}</CardTitle>
        <ErrorState plain={plain} />
      </Card>
    );
  }

  const s = summarise(calls);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            <Link href={`/agent/${agentKey}`} className="hover:underline">
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

      {s.total === 0 ? (
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
            href={`/agent/${agentKey}?days=${days}`}
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

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const inRange = runs.filter(
    (r) => new Date(r.startedAt).getTime() >= cutoff,
  );
  const failed = inRange.filter((r) => r.status === "error").length;
  const ok = inRange.filter((r) => r.status === "success").length;
  const other = inRange.length - failed - ok;
  const newest = runs[0] ? new Date(runs[0].startedAt).getTime() : undefined;

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
