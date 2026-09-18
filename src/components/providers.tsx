"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ReadingModeProvider } from "./reading-mode";

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session. Made lazily so it is not shared between
  // server renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReadingModeProvider>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </SessionProvider>
      </ReadingModeProvider>
    </ThemeProvider>
  );
}
