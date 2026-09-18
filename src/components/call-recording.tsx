"use client";

import { useRef, useState } from "react";
import { Download, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type Turn = {
  /**
   * Who spoke. "unknown" is a real answer: when Retell sends no
   * speaker-by-speaker transcript we only have one block of text with both
   * voices in it, and guessing would put the agent's words in the caller's
   * mouth.
   */
  who: "agent" | "caller" | "unknown";
  said: string;
  /** Seconds from the start of the recording, when the words carry times. */
  startSec?: number;
  /** "0:42" */
  startLabel?: string;
};

/**
 * The recording and what was said, together.
 *
 * They are one component because the transcript can move the player. Clicking
 * a line jumps the audio to that moment, which is the fastest way to check
 * whether the agent really said what the notes claim.
 *
 * The recording address comes from Retell and carries no key of ours. It is
 * still a real customer's voice, so it is never written to a file and never
 * put in a link that leaves this page.
 */
export function CallRecording({
  recordingUrl,
  turns,
}: {
  recordingUrl?: string;
  turns: Turn[];
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playingAt, setPlayingAt] = useState<number | null>(null);

  function jumpTo(seconds: number) {
    const el = audio.current;
    if (!el) return;
    el.currentTime = seconds;
    setPlayingAt(seconds);
    void el.play().catch(() => {
      // The browser can refuse to play until the person clicks the player
      // itself. Moving the position still worked, so there is nothing to say.
    });
  }

  return (
    <div className="space-y-4">
      {recordingUrl ? (
        <div className="space-y-2">
          {/* A phone call has no captions to offer, so the usual caption
              rule does not apply. The words are written out below instead. */}
          <audio
            ref={audio}
            controls
            preload="none"
            src={recordingUrl}
            className="w-full"
          >
            Your browser cannot play audio.
          </audio>
          <a
            href={recordingUrl}
            download
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <Download aria-hidden className="h-4 w-4" />
            Save the recording
          </a>
        </div>
      ) : (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          There is no recording for this call.
        </p>
      )}

      {turns.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          Nobody said anything, so there is nothing written down.
        </p>
      ) : (
        <ol className="space-y-2">
          {turns.map((turn, i) => {
            const canJump =
              Boolean(recordingUrl) && typeof turn.startSec === "number";
            return (
              <li
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2",
                  turn.who === "agent" ? "bg-accent-soft" : "bg-surface-2",
                  playingAt !== null &&
                    playingAt === turn.startSec &&
                    "ring-2 ring-ring",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {turn.who === "agent"
                      ? "The agent"
                      : turn.who === "caller"
                        ? "The caller"
                        : "Both voices, not split up"}
                  </span>
                  {canJump ? (
                    <button
                      type="button"
                      onClick={() => jumpTo(turn.startSec as number)}
                      title="Play the recording from here"
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-accent hover:bg-surface-hover"
                    >
                      <Play aria-hidden className="h-3 w-3" />
                      {turn.startLabel}
                    </button>
                  ) : turn.startLabel ? (
                    <span className="text-xs text-faint">{turn.startLabel}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">
                  {turn.said}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
