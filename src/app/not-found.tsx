import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { ErrorRing } from "@/components/error-ring";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { buttonGhostDark, buttonRiver, Overline } from "@/components/ui";
import { services, serviceHref } from "@/lib/services";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
};

const popularLinks = [
  ...services.map((service) => ({ href: serviceHref(service), label: service.navLabel, hint: service.mobileDesc })),
  { href: "/#work", label: "Our work", hint: "Recent client projects" },
  { href: `mailto:${site.email}`, label: "Contact us", hint: site.email },
];

export default function NotFound() {
  return (
    <>
      <SiteNav quoteHref="/#quote" />
      <main>
        <section className="on-dark bg-midnight text-white">
          <div className="mx-auto flex max-w-[1200px] flex-wrap-reverse items-center justify-center gap-10 px-4 pt-14 pb-16 md:px-6 md:pt-22 md:pb-24 lg:justify-between lg:gap-12">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
              <Overline className="text-river">ERROR 404</Overline>
              <h1 className="m-0 font-display text-[34px] leading-[1.1] font-extrabold md:text-[clamp(34px,4.6vw,52px)]">This page is missing a piece</h1>
              <p className="m-0 max-w-[520px] text-base leading-6 text-mist md:text-lg md:leading-7">
                The link may be broken, or the page may have moved. Head back home, or jump to one of the pages below.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/" className={buttonRiver}>
                  <ArrowLeftIcon size={18} />
                  Back to home
                </Link>
                <Link href="/#quote" className={buttonGhostDark}>Get a free quote</Link>
              </div>
              <p className="m-0 text-sm leading-5 text-haze">
                Think something should be here? Tell us at <a href={`mailto:${site.email}`} className="text-river">{site.email}</a>
              </p>
            </div>
            <ErrorRing code="404" segments={["#35a9ce", "#33cc99", "#ff9900", null]} />
          </div>
        </section>

        <section aria-labelledby="popular-title">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 pt-14 pb-20 md:px-6 md:pt-18 md:pb-24">
            <h2 id="popular-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[28px] md:leading-9">Popular pages</h2>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3 p-0">
              {popularLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="flex flex-col gap-1 rounded-xl border border-line px-5 py-[18px] text-midnight no-underline hover:border-river">
                    <span className="flex items-center justify-between gap-2 font-bold">
                      {link.label}
                      <ArrowRightIcon size={16} className="text-link" />
                    </span>
                    <span className="text-sm leading-5 text-muted">{link.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter quoteHref="/#quote" />
    </>
  );
}
