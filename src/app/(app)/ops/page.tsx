import { getWorkflow, listExecutions, N8nError, type Execution } from "@/lib/n8n";
import {
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorState,
  ExplainPanel,
  StatTile,
} from "@/components/ui";
import { RangePicker } from "@/components/range-picker";
import { RECAP_STATUS_PLAIN, type RecapStatus } from "@/lib/plain";
import { rangeLabel, readDays } from "@/lib/ranges";
import { ago, dateTime, duration, percent, rangeForDays } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The recap robot, run by run.
 *
 * The agent pages answer "what did the caller want". This one answers "is the
 * thing that tells Daniel still working". A run that broke is the only reason
 * a good lead disappears, so failures are shown first and never hidden behind
 * a total.
 */
export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const days = readDays((await searchParams).days);

  let runs: Execution[];
  let workflowName: string;
  let active: boolean;
  let nodeCount: number;

  try {
    const [list, workflow] = await Promise.all([
      listExecutions({ limit: 250 }),
      getWorkflow(),
    ]);
    runs = list.data ?? [];
    workflowName = workflow.name;
    active = workflow.active;
    nodeCount = workflow.nodes?.length ?? 0;
  } catch (err) {
    const plain =
      err instanceof N8nError ? err.plain : "We could not reach n8n. Try again.";
    return (
      <Shell days={days}>
        <ErrorState plain={plain} />
      </Shell>
    );
  }

  // Reading the clock goes through rangeForDays, not Date.now() here, so the
  // window is worked out the same way as on every other page.
  const { startMs } = rangeForDays(days);
  const inRange = runs.filter((r) => Date.parse(r.startedAt) >= startMs);

  const failed = inRange.filter((r) => statusOf(r) === "error");
  const ok = inRange.filter((r) => statusOf(r) === "success");
  const busy = inRange.filter(
    (r) => statusOf(r) === "running" || statusOf(r) === "waiting",
  );

  const newest = runs[0] ? Date.parse(runs[0].startedAt) : undefined;
  // 250 is the most n8n will hand over in one go. If the range is full, the
  // counts below are a floor, not a total, and the page has to say so.
  const capped = runs.length >= 250 && inRange.length === runs.length;

  return (
    <Shell days={days}>
      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <Chip tone="good">Switched on</Chip>
        ) : (
          <Chip tone="bad">Switched OFF</Chip>
        )}
        <p className="text-sm text-muted">
          {workflowName}
          <span className="technical-only"> · {nodeCount} steps</span>
          {newest ? ` · last run ${ago(newest)}` : null}
        </p>
      </div>

      <ExplainPanel>
        <p>
          After every call, a robot writes the recap, emails Robert, and hands
          the lead to Daniel.
        </p>
        <p>Each line below is one run of that robot. One call, one run.</p>
        <p>
          A run that broke means a lead did not get through. Those are listed
          first.
        </p>
        <p>
          To find out which call a run belongs to, open the call and look at the
          bottom of its page.
        </p>
        <p>
          Everything counts the last {rangeLabel(days).toLowerCase()}.
        </p>
      </ExplainPanel>

      {!active ? (
        <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
          <strong className="font-semibold">The robot is switched off.</strong>{" "}
          No call is being turned into a recap, and Daniel is getting nothing.
          Somebody needs to switch it on in n8n.
        </p>
      ) : null}

      {inRange.length === 0 ? (
        <EmptyState
          title="No recaps ran"
          means={`Nothing ran in the last ${rangeLabel(days).toLowerCase()}. If calls came in during that time, that is a problem worth chasing.`}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              value={ok.length}
              label="Reached Daniel"
              means="The recap finished and the lead went on."
              tone="good"
              sub={`${percent(ok.length, inRange.length)} of ${inRange.length} runs`}
            />
            <StatTile
              value={failed.length}
              label="Did not reach Daniel"
              means="The recap started but broke part way. Daniel never got these."
              tone={failed.length > 0 ? "bad" : undefined}
              sub={
                failed.length === 0
                  ? "None. Good."
                  : "Listed below. Open each one in n8n."
              }
            />
            <StatTile
              value={busy.length}
              label="Still going"
              means="Runs that have not finished yet."
            />
          </div>

          {capped ? (
            <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
              n8n only hands over 250 runs at a time, and it gave us 250. There
              were more in this time than the numbers above count.
            </p>
          ) : null}

          {failed.length > 0 ? (
            <Card>
              <CardTitle hint="Each of these is a lead Daniel never received.">
                Runs that broke
              </CardTitle>
              <RunList runs={failed} />
            </Card>
          ) : null}

          <Card>
            <CardTitle hint="Newest first.">
              Every run ({inRange.length})
            </CardTitle>
            <RunList runs={inRange} />
          </Card>
        </>
      )}
    </Shell>
  );
}

function Shell({
  days,
  children,
}: {
  days: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">The recap robot</h1>
          <p className="text-sm text-muted">
            Whether every call is still reaching Daniel.
          </p>
        </div>
        <RangePicker days={days} />
      </div>
      {children}
    </div>
  );
}

function RunList({ runs }: { runs: Execution[] }) {
  return (
    <ul className="divide-y divide-border">
      {runs.map((run) => {
        const status = statusOf(run);
        const plain = RECAP_STATUS_PLAIN[status];
        const startedMs = Date.parse(run.startedAt);
        const stoppedMs = run.stoppedAt ? Date.parse(run.stoppedAt) : NaN;
        const took =
          Number.isNaN(startedMs) || Number.isNaN(stoppedMs)
            ? undefined
            : stoppedMs - startedMs;

        return (
          <li
            key={run.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
          >
            <span className="text-sm">
              {dateTime(startedMs)}
              <span className="technical-only ml-2 font-mono text-[11px] text-faint">
                run {run.id}
              </span>
            </span>
            <span className="flex items-center gap-3">
              {took !== undefined ? (
                <span className="text-xs tabular-nums text-muted">
                  took {duration(took)}
                </span>
              ) : null}
              <Chip tone={plain.tone ?? "neutral"} title={plain.means}>
                {plain.label}
              </Chip>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * n8n has more words for "it went wrong" than a person needs.
 * "error", "crashed" and "canceled" all mean the lead did not get through.
 */
function statusOf(run: Execution): RecapStatus {
  if (run.status === "success") return "success";
  if (run.status === "waiting") return "waiting";
  if (run.status === "running" || run.status === "new") return "running";
  return "error";
}
