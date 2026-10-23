import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: { default: "Pay invoice", template: "%s · Ledobiz" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PayLayout({ children }: LayoutProps<"/pay">) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface print:bg-white text-[15px] leading-[22px] text-midnight">
      <header className="border-b border-line bg-white print:hidden">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-5 py-3">
          <Link href="/" aria-label="Ledobiz home"><Image src="/brand/ledobiz-logo-on-light.svg" alt="Ledobiz" width={132} height={35} priority /></Link>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Secure payment
          </span>
        </div>
      </header>
      <Suspense fallback={<PaySkeleton />}>{children}</Suspense>
    </div>
  );
}

function PaySkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading" className="mx-auto flex w-full max-w-[1080px] flex-1 flex-wrap items-start gap-6 px-5 pt-7 pb-10">
      <span className="h-[420px] flex-[1_1_380px] animate-pulse rounded-2xl bg-white" />
      <span className="h-[520px] flex-[1_1_380px] animate-pulse rounded-2xl bg-white" />
    </main>
  );
}
