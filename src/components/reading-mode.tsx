"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

export function ReadingModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ReadingMode>("simple");
  const [ready, setReady] = useState(false);

  // Read the saved choice. A private window can throw, so guard it.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (saved === "technical" || saved === "simple") setModeState(saved);
    setReady(true);
  }, []);

  // Mirror onto <html> so plain CSS can hide technical-only bits.
  useEffect(() => {
    document.documentElement.dataset.reading = mode;
  }, [mode]);

  const setMode = useCallback((m: ReadingMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // Storage blocked. The choice still works for this page view.
    }
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
