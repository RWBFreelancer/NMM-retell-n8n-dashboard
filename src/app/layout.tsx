import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ninja Ops",
  description:
    "One screen for both voice agents and the recap workflow: what callers wanted, and whether each lead reached Daniel.",
  robots: { index: false, follow: false },
  // Lets Rey add it to a phone home screen and open it like an app.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ninja Ops", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

// Runs before the first paint, so the page never flashes the wrong detail
// level. next-themes does the same job for the light/dark class.
const READING_MODE_SCRIPT = `
try {
  var m = localStorage.getItem('ninja-reading-mode');
  document.documentElement.dataset.reading = m === 'technical' ? 'technical' : 'simple';
} catch (e) {
  document.documentElement.dataset.reading = 'simple';
}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-reading="simple"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: READING_MODE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
