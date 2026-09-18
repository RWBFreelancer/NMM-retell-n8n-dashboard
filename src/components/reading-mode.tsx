"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useHydrated } from "@/lib/use-hydrated";

export type ReadingMode = "simple" | "technical";

const STORAGE_KEY = "ninja-reading-mode";

type Ctx = {
  mode: ReadingMode;
  setMode: (m: ReadingMode) => void;
  /** True once the browser value has been read, so we can avoid a flash. */
  ready: boolean;
};

const ReadingModeContext = createContext<Ctx>({
  mode: "simple",
  setMode: () => {},
  ready: false,
});

/**
 * The saved choice lives in the browser, outside React, so React reads it with
 * the tool meant for that: useSyncExternalStore. Setting state inside an
 * effect would work too, but it renders the whole tree twice on every load and
 * React now warns about it.
 *
 * A second tab changing the setting fires a storage event, so both tabs agree.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A private window can refuse storage entirely, so every read is guarded. */
function readSaved(): ReadingMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "technical" ? "technical" : "simple";
  } catch {
    return "simple";
  }
}

// The server has no browser storage to read, so it always says "simple",
// which is what the no-flash script in layout.tsx puts on <html> too.
const readOnServer = (): ReadingMode => "simple";

export function ReadingModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useSyncExternalStore(subscribe, readSaved, readOnServer);
  const ready = useHydrated();

  // Mirror onto <html> so plain CSS can hide technical-only bits.
  useEffect(() => {
    document.documentElement.dataset.reading = mode;
  }, [mode]);

  const setMode = useCallback((m: ReadingMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // Storage blocked. Nothing is saved, but the change still shows.
    }
    // localStorage does not tell the tab that wrote it, so tell it ourselves.
    for (const l of listeners) l();
  }, []);

  return (
    <ReadingModeContext.Provider value={{ mode, setMode, ready }}>
      {children}
    </ReadingModeContext.Provider>
  );
}

export function useReadingMode() {
  return useContext(ReadingModeContext);
}

/** Show its children only in Technical mode. */
export function TechnicalOnly({ children }: { children: React.ReactNode }) {
  const { mode } = useReadingMode();
  if (mode !== "technical") return null;
  return <>{children}</>;
}
