import { Nav } from "@/components/nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-6 text-xs text-faint">
        Read-only. This dashboard never changes an agent or the recap workflow.
      </footer>
    </>
  );
}
