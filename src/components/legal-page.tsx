import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Overline } from "@/components/ui";
import type { LegalSection } from "@/lib/legal";

type LegalPageProps = {
  current: "terms" | "privacy";
  title: string;
  meta: string;
  intro: ReactNode;
  sections: LegalSection[];
  anchorPrefix: string;
  contact: ReactNode;
};

const tabs = [
  { key: "terms", href: "/terms", label: "Terms and conditions" },
  { key: "privacy", href: "/privacy", label: "Privacy policy" },
] as const;

export function LegalPage({ current, title, meta, intro, sections, anchorPrefix, contact }: LegalPageProps) {
  return (
    <>
      <SiteNav quoteHref="/#quote" />
      <main>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-10 pb-9 md:px-6 md:pt-12 md:pb-10">
            <nav aria-label="Breadcrumb" className="flex gap-2 text-sm leading-5 text-muted">
              <Link href="/" className="text-link">Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{title}</span>
            </nav>
            <nav aria-label="Legal pages" className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = tab.key === current;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium no-underline ${
                      active ? "border-midnight bg-midnight text-white" : "border-control bg-white text-midnight hover:border-midnight"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
            <Overline>LEGAL</Overline>
            <h1 className="m-0 font-display text-[clamp(32px,4vw,44px)] leading-[1.15] font-bold">{title}</h1>
            <p className="m-0 text-sm leading-5 text-muted">{meta}</p>
            {intro}
          </div>
        </header>

        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-12 px-4 pt-14 pb-20 md:px-6">
          <nav aria-label="On this page" className="flex w-full flex-col gap-0.5 rounded-2xl bg-surface p-4 md:max-w-[300px] md:flex-[1_1_240px]">
            <span className="px-2.5 pt-1 pb-2 text-xs leading-4 font-medium tracking-[0.35em] text-muted">ON THIS PAGE</span>
            {sections.map((section, index) => (
              <a
                key={section.title}
                href={`#${anchorPrefix}${index + 1}`}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm leading-5 text-muted no-underline hover:bg-white hover:text-midnight"
              >
                <span className="min-w-5 font-bold text-link">{index + 1}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <article className="flex max-w-[760px] min-w-0 flex-[999_1_560px] flex-col gap-10 text-base leading-[26px]">
            {sections.map((section, index) => (
              <section key={section.title} id={`${anchorPrefix}${index + 1}`} className="flex scroll-mt-6 flex-col gap-3.5">
                <h2 className="m-0 font-display text-2xl leading-8 font-bold">
                  <span className="text-link">{index + 1}.</span> {section.title}
                </h2>
                {section.paras?.map((para) => (
                  <p key={para} className="m-0 text-body">{para}</p>
                ))}
                {section.list && (
                  <ul className="m-0 flex flex-col gap-2 pl-[22px] text-body">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.after?.map((para) => (
                  <p key={para} className="m-0 text-body">{para}</p>
                ))}
              </section>
            ))}
            {contact}
          </article>
        </div>
      </main>
      <SiteFooter quoteHref="/#quote" />
    </>
  );
}

export function LegalContact({ title, text, href, label }: { title: string; text: string; href: string; label: string }) {
  return (
    <aside className="on-dark flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-midnight p-7 text-white">
      <div className="flex flex-[1_1_280px] flex-col gap-1.5">
        <strong className="font-display text-xl leading-7 font-semibold">{title}</strong>
        <span className="text-[15px] leading-[22px] text-mist">{text}</span>
      </div>
      <a href={href} className="inline-flex min-h-12 items-center rounded-lg bg-river px-5 font-medium text-midnight no-underline hover:bg-river-hover">
        {label}
      </a>
    </aside>
  );
}
