"use client";

import Link from "next/link";
import { ArrowRightIcon, RefreshIcon } from "@/components/icons";
import { ErrorRing } from "@/components/error-ring";
import { buttonGhostDark, Overline } from "@/components/ui";
import { site } from "@/lib/site";

const helpCards = [
  { title: "Try again shortly", text: "Most issues are fixed within minutes. Refresh the page or come back a little later.", color: "bg-river" },
  {
    title: "Sending a quote request?",
    text: "Your details may not have reached us. Email your project details and we will still reply within 24 hours.",
    color: "bg-gold",
    link: { href: `mailto:${site.email}?subject=Quote%20request`, label: "Email your request" },
  },
  {
    title: "Need help now?",
    text: "Contact our team directly and mention the error reference above.",
    color: "bg-salsify",
    link: { href: `mailto:${site.email}`, label: site.email },
  },
];

/** The 500 page body, shared by error.tsx and global-error.tsx. */
export function ServerErrorContent({ reference, onRetry }: { reference?: string; onRetry: () => void }) {
  return (
    <main>
      <section className="on-dark bg-midnight text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap-reverse items-center justify-center gap-10 px-4 pt-14 pb-16 md:px-6 md:pt-22 md:pb-24 lg:justify-between lg:gap-12">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
            <Overline className="text-gold">ERROR 500</Overline>
            <h1 className="m-0 font-display text-[34px] leading-[1.1] font-extrabold md:text-[clamp(34px,4.6vw,52px)]">Something went wrong on our side</h1>
            <p className="m-0 max-w-[540px] text-base leading-6 text-mist md:text-lg md:leading-7">
              This one is our fault, not yours. Our team has been alerted and is working on a fix. Please try again in a few minutes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-river px-[22px] font-medium text-midnight hover:bg-river-hover"
              >
                <RefreshIcon size={18} />
                Try again
              </button>
              <Link href="/" className={buttonGhostDark}>Back to home</Link>
            </div>
            {reference && (
              <p className="m-0 flex flex-wrap items-center gap-2 text-sm leading-5 text-haze">
                Error reference
                <code className="rounded bg-white/10 px-2 py-0.5 font-mono text-[13px] text-white">{reference}</code>
                · include it if you contact us
              </p>
            )}
          </div>
          <ErrorRing code="500" segments={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.14)", "#ff9900", "rgba(255,255,255,0.14)"]} />
        </div>
      </section>

      <section aria-labelledby="help-title">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 pt-14 pb-20 md:px-6 md:pt-18 md:pb-24">
          <h2 id="help-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[28px] md:leading-9">While we fix it</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
            {helpCards.map((card) => (
              <div key={card.title} className="flex flex-col gap-2.5 rounded-2xl border border-line p-6">
                <span className={`h-1 w-8 rounded-full ${card.color}`} />
                <h3 className="m-0 font-display text-xl leading-7 font-semibold">{card.title}</h3>
                <p className="m-0 text-[15px] leading-[23px] text-muted">{card.text}</p>
                {card.link && (
                  <a href={card.link.href} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-link">
                    {card.link.label}
                    <ArrowRightIcon size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function errorReference(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    return error.digest;
  }
  return undefined;
}
