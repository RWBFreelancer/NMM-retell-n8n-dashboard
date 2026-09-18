import type { RecapMatch } from "@/lib/correlate";
import { Card, CardTitle, Chip } from "./ui";
import { ago, duration } from "@/lib/format";

/**
 * Did this lead reach Daniel?
 *
 * The one question the dashboard was built to answer, so it gets a whole panel
 * and a headline, not a chip in a corner. A server component: there is nothing
 * to click and nothing to remember.
 */
export function RecapPanel({ recap }: { recap: RecapMatch }) {
  const headline = recap.reachedDaniel
    ? "Yes. Daniel got this one."
    : recap.status === "none"
      ? recap.searchIncomplete
        ? "We cannot tell."
        : "No. Nothing ran for this call."
      : recap.status === "error"
        ? "No. The recap broke before Daniel got it."
        : "Not yet. The recap is still going.";

  const tone = recap.reachedDaniel
    ? "good"
    : recap.searchIncomplete
      ? "warn"
      : recap.status === "running" || recap.status === "waiting"
        ? "info"
        : "bad";

  return (
    <Card>
      <CardTitle hint="The robot that emails Robert and hands the lead to Daniel.">
        Did this reach Daniel?
      </CardTitle>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={tone}>
          {recap.searchIncomplete ? "Not checked" : recap.plain.label}
        </Chip>
        <p className="text-base font-semibold">{headline}</p>
      </div>

      <p className="mt-1 text-sm text-muted">
        {recap.searchIncomplete
          ? "This is not an answer either way. It only means we could not look."
          : recap.plain.means}
      </p>

      {recap.status === "none" ? (
        recap.searchIncomplete ? (
          // We did not finish looking. Saying "nothing ran" here would be a
          // lie, and it is the kind of lie that sends somebody hunting for a
          // fault that is not there.
          <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            <strong className="font-semibold">We could not check this one.</strong>{" "}
            {recap.whyIncomplete ??
              "We could not look through every recap run."}{" "}
            Look in n8n before acting on it.
          </p>
        ) : (
          <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
            Nothing ran after this call at all. Not even a failure. This is the
            quiet kind of problem: nobody gets an email, and nothing shows up as
            broken anywhere.
          </p>
        )
      ) : null}

      {recap.failedBecause ? (
        <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          <strong className="font-semibold">
            It stopped at &ldquo;{recap.failedNode ?? "a step"}&rdquo;.
          </strong>{" "}
          {recap.failedBecause}
        </p>
      ) : null}

      {recap.executionId ? (
        <p className="mt-3 text-sm text-muted">
          Run number {recap.executionId}
          {recap.startedAtMs ? `, started ${ago(recap.startedAtMs)}` : null}
          {recap.tookMs !== undefined ? `, took ${duration(recap.tookMs)}` : null}.
        </p>
      ) : null}

      {recap.nodes.length > 0 ? (
        <details className="mt-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium select-none">
            Every step the robot took ({recap.nodes.length})
          </summary>
          <ol className="mt-2 space-y-1">
            {recap.nodes.map((node) => (
              <li
                key={node.name}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                {/* A step name is the n8n node's own name. It is the thing a
                    person types into n8n to find it, so it stays as it is. */}
                <span className="text-muted">{node.name}</span>
                <span className="flex items-center gap-2">
                  {node.problem ? (
                    <span className="text-xs text-bad">{node.problem}</span>
                  ) : null}
                  <Chip tone={node.tone} icon={false}>
                    {node.state === "failed" ? "Broke" : "Done"}
                  </Chip>
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </Card>
  );
}
