import type { ReactNode } from "react";
import { ArrowRightIcon, CheckIcon, MailIcon } from "@/components/icons";
import { site } from "@/lib/site";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1200px] px-4 md:px-6 ${className}`}>{children}</div>;
}

export function Overline({ children, className = "text-link" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] leading-4 font-medium tracking-[0.4em] md:text-xs md:tracking-[0.45em] ${className}`}>{children}</span>;
}

export function SectionHeading({ overline, title, intro, id }: { overline: string; title: string; intro?: string; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[680px] flex-col gap-2.5 md:gap-3">
        <Overline>{overline}</Overline>
        <h2 id={id} className="m-0 font-display text-[26px] leading-8 font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">
          {title}
        </h2>
      </div>
      {intro && <p className="m-0 hidden max-w-[420px] text-muted md:block">{intro}</p>}
    </div>
  );
}

export function CheckList({ items, className = "" }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={`m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] leading-[22px] md:gap-3 md:text-base md:leading-6 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-snow md:gap-3">
          <CheckIcon size={22} strokeWidth={2.25} className="flex-none text-salsify" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function TechPill({ children }: { children: ReactNode }) {
  return <span className="rounded bg-surface px-2 py-1 text-xs leading-4 text-midnight">{children}</span>;
}

export const buttonRiver =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-river px-[22px] font-medium text-midnight no-underline hover:bg-river-hover";
export const buttonGhostDark =
  "inline-flex min-h-12 items-center justify-center rounded-lg border border-white/35 px-[22px] font-medium text-white no-underline hover:bg-white/8";
export const buttonMidnight =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-midnight px-[18px] font-medium text-white no-underline hover:bg-midnight-hover";

export function CtaBand({ title, text, secondary = true }: { title: string; text: string; secondary?: boolean }) {
  return (
    <section className="px-4 pb-10 md:px-6 md:pb-24">
      <div className="on-dark mx-auto flex max-w-[1200px] flex-col gap-3.5 rounded-xl bg-midnight px-5 py-7 text-white md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-8 md:rounded-2xl md:p-[clamp(32px,5vw,64px)]">
        <div className="flex min-w-0 flex-col gap-3 md:flex-[1_1_460px]">
          <h2 className="m-0 font-display text-2xl leading-[30px] font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">{title}</h2>
          <p className="m-0 text-[15px] leading-[22px] text-mist md:text-base md:leading-6">{text}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <a href="#quote" className={`${buttonRiver} min-h-[52px] md:min-h-12`}>Get my free quote</a>
          {secondary && (
            <a href={`mailto:${site.email}`} className={buttonGhostDark}>{site.email}</a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Sticky quote bar shown on phones only. Pages that use it add bottom padding on mobile. */
export function MobileQuoteBar({ label = "Get my free quote" }: { label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t border-line bg-white/97 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,51,0.08)] backdrop-blur md:hidden">
      <a href="#quote" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-midnight font-medium text-white no-underline">
        {label}
        <ArrowRightIcon size={18} />
      </a>
      <a href={`mailto:${site.email}`} aria-label="Email Ledobiz" className="inline-flex size-12 flex-none items-center justify-center rounded-lg border border-control text-midnight">
        <MailIcon size={20} />
      </a>
    </div>
  );
}
