import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAgentInfo, agentKeyForId } from "@/lib/agents";
import { getCall, RetellError, type TranscriptTurn } from "@/lib/retell";
import {
  costRows,
  fieldGroups,
  speedRows,
  warnings,
} from "@/lib/call-detail";
import {
  Card,
  CardTitle,
  Chip,
  ErrorState,
  ExplainPanel,
  RawName,
} from "@/components/ui";
import { CallRecording, type Turn } from "@/components/call-recording";
import { FieldGroups } from "@/components/field-groups";
import { RecapPanel } from "@/components/recap-panel";
import { findRecap } from "@/lib/correlate";
import { CALL_STATUS_PLAIN, DISCONNECT_PLAIN, SENTIMENT_PLAIN, plainOr } from "@/lib/plain";
import { dateTime, duration, money, phoneMasked } from "@/lib/format";
import { readDays } from "@/lib/ranges";

export const dynamic = "force-dynamic";

export default async function CallDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; id: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { key, id } = await params;
  const agent = getAgentInfo(key);
  if (!agent) notFound();

  const days = readDays((await searchParams).days);
  const backHref = `/agent/${key}?days=${days}`;

  let call;
  try {
    call = await getCall(id);
  } catch (err) {
    const plain =
      err instanceof RetellError
        ? err.plain
        : "We could not load this call. Try again.";
    return (
      <Shell backHref={backHref} title="That call would not load">
        <ErrorState plain={plain} />
      </Shell>
    );
  }

  // A call id is guessable in theory, and the two agents belong to different
  // views. Refuse to show one agent's call under the other's heading rather
  // than quietly mislabelling it.
  const owner = agentKeyForId(call.agent_id);
  if (owner && owner !== agent.key) {
    return (
      <Shell backHref={backHref} title="That call belongs to the other agent">
        <ErrorState
          title="Wrong agent"
          plain={`This call was taken by ${getAgentInfo(owner)?.fullLabel ?? "the other agent"}. Open it from that agent's list.`}
        />
      </Shell>
    );
  }

  // Matching the call to its recap run means opening a few n8n runs, so it is
  // done once here and handed down.
  const recap = await findRecap(call);

  const groups = fieldGroups(call);
  const problems = warnings(call);
  const speeds = speedRows(call);
  const costs = costRows(call);
  const turns = toTurns(call.transcript_object, call.transcript);

  const status = plainOr(CALL_STATUS_PLAIN, call.call_status);
  const ended = plainOr(DISCONNECT_PLAIN, call.disconnection_reason);
  const mood = plainOr(SENTIMENT_PLAIN, call.call_analysis?.user_sentiment);

  return (
    <Shell
      backHref={backHref}
      title={dateTime(call.start_timestamp)}
      subtitle={`${agent.fullLabel} · ${phoneMasked(call.from_number)} · ${duration(call.duration_ms)}`}
      badges={
        <>
          <Chip tone={ended.tone ?? "neutral"} title={ended.means}>
            {ended.label}
          </Chip>
          <Chip tone={status.tone ?? "neutral"} title={status.means}>
            {status.label}
          </Chip>
          <Chip tone={mood.tone ?? "neutral"} title={mood.means}>
            Caller sounded: {mood.label}
          </Chip>
          <Chip tone="info" icon={false} title="The agent version that took this call">
            Version {call.agent_version ?? "?"}
          </Chip>
        </>
      }
    >
      <p className="text-sm text-muted">
        <RawName>{call.call_id}</RawName>
      </p>

      <ExplainPanel>
        <p>This is one call, from start to finish.</p>
        <p>
          Play the recording, or click the time on any line to jump straight to
          that moment.
        </p>
        <p>
          Below that is everything the agent wrote down afterwards. Names and
          numbers start hidden.
        </p>
        <p>
          Red and amber boxes at the top are the only things you must read. If
          there are none, the call was fine.
        </p>
        <p>
          At the bottom is the answer to the big one: did this lead reach
          Daniel?
        </p>
      </ExplainPanel>

      {problems.length > 0 ? (
        <Card>
          <CardTitle hint="These change what somebody should do next.">
            Worth knowing
          </CardTitle>
          <ul className="space-y-1.5">
            {problems.map((w, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <Chip tone={w.tone}>{w.label}</Chip>
                <span className="text-sm text-muted">{w.means}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="rounded-xl bg-good-soft px-3 py-2 text-sm text-good">
          Nothing on this call needs anybody&apos;s attention.
        </p>
      )}

      <Card>
        <CardTitle hint="What was said, and the recording of it.">
          The call itself
        </CardTitle>
        <CallRecording recordingUrl={call.recording_url} turns={turns} />
      </Card>

      <FieldGroups groups={groups} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle hint="How long the agent took to answer, on a normal turn.">
            Reply speed
          </CardTitle>
          {speeds.length === 0 ? (
            <p className="text-sm text-muted">
              This call was too short to measure.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="pb-1 font-semibold">Part</th>
                    <th scope="col" className="pb-1 text-right font-semibold">Usually</th>
                    <th scope="col" className="pb-1 text-right font-semibold">Slowest</th>
                  </tr>
                </thead>
                <tbody>
                  {speeds.map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className="py-1.5 text-muted" title={row.means}>
                        {row.label}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        <Chip tone={row.tone} icon={false}>{row.typical}</Chip>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-muted">
                        {row.slowest}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted">
                &quot;Usually&quot; is the middle: half the replies were faster.
                &quot;Slowest&quot; is the slow one in ten. On the phone, more
                than two seconds of silence sounds broken.
              </p>
            </>
          )}
        </Card>

        <Card>
          <CardTitle hint="What Retell charged for this one call.">
            What it cost
          </CardTitle>
          <p className="text-3xl font-semibold tabular-nums">
            {money(call.call_cost?.combined_cost)}
          </p>
          {costs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Retell did not break this one down.
            </p>
          ) : (
            <dl className="mt-3 space-y-1 text-sm">
              {costs.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="text-muted" title={row.means}>{row.label}</dt>
                  <dd className="tabular-nums">{row.amount}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>

      <RecapPanel recap={recap} />
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
 * Layout and shaping
 * ------------------------------------------------------------------ */

function Shell({
  backHref,
  title,
  subtitle,
  badges,
  children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to the call list
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
        {badges ? (
          <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

/**
 * Turn Retell's transcript into lines a person reads.
 *
 * The start time comes off the first word of the turn, which is the only place
 * Retell puts one. When a call has no word timings, the lines still show; they
 * just cannot jump the player.
 *
 * If the structured transcript is missing entirely, the plain text one is used
 * as a single block rather than showing nothing.
 */
function toTurns(
  objectTurns: TranscriptTurn[] | undefined,
  plainText: string | undefined,
): Turn[] {
  if (objectTurns && objectTurns.length > 0) {
    return objectTurns.map((t) => {
      const start = t.words?.[0]?.start;
      return {
        who: t.role === "agent" ? ("agent" as const) : ("caller" as const),
        said: t.content,
        startSec: typeof start === "number" ? start : undefined,
        startLabel: typeof start === "number" ? clock(start) : undefined,
      };
    });
  }

  // No speaker-by-speaker version. The plain one holds BOTH voices in a
  // single block, so it must not be labelled as the caller: that would put
  // everything the agent said into the caller's mouth.
  if (plainText && plainText.trim()) {
    return [{ who: "unknown", said: plainText.trim() }];
  }

  return [];
}

/** 42 seconds becomes "0:42". */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
