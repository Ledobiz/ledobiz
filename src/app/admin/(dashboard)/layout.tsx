import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, SidebarSkeleton } from "@/components/admin/sidebar";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Ledobiz admin" },
  robots: { index: false, follow: false },
};

// Every admin page reads the session and live data, so navigations block on the server by design.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-sm leading-5 text-midnight nav:flex-row print:bg-white">
      <div className="contents print:hidden">
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </div>
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-12 md:px-8 print:p-0">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-5">
      <span className="h-9 w-64 animate-pulse rounded-lg bg-line" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="h-24 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <span className="h-80 animate-pulse rounded-xl bg-white" />
    </div>
  );
}
