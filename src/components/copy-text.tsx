"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card, CardTitle } from "./ui";

/**
 * The short version, ready to paste into a chat.
 *
 * A report nobody can forward is a report nobody reads. The text is built on
 * the server in plain sentences, so what gets pasted says the same thing the
 * screen does, including the parts that are a guess.
 *
 * The box is always visible, not hidden behind the button, because copying can
 * fail silently in a browser that blocks it and a person needs something they
 * can select by hand.
 */
export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      // Blocked, or no permission. The text is on screen to select by hand.
      setDone(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle hint="Plain sentences, ready to send to somebody.">
          The short version
        </CardTitle>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover"
        >
          {done ? (
            <>
              <Check aria-hidden className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy aria-hidden className="h-3.5 w-3.5" />
              Copy it
            </>
          )}
        </button>
      </div>

      <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 text-sm whitespace-pre-wrap">
        {text}
      </pre>
    </Card>
  );
}
