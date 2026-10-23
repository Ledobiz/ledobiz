"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ChevronRightIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { services, serviceHref } from "@/lib/services";
import { site } from "@/lib/site";

type SiteNavProps = {
  /** Where "Get a free quote" points. Pages with a quote form use "#quote". */
  quoteHref?: string;
};

export function SiteNav({ quoteHref = "#quote" }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);
  const linkClass = "py-3 text-[15px] font-medium text-mist no-underline hover:text-white hover:underline";
  const mobileLinkClass = "flex min-h-12 items-center justify-between rounded-lg px-2 text-base font-medium text-white no-underline hover:bg-white/5";

  return (
    <header className="on-dark border-b border-white/10 bg-midnight text-white">
      <div className="mx-auto flex min-h-12 max-w-[1200px] items-center justify-between gap-8 px-4 py-3 md:px-6">
        <Link href="/" aria-label="Ledobiz home" className="inline-flex flex-none" onClick={close}>
          <Image src={site.logo} alt="Ledobiz" width={150} height={40} unoptimized priority className="block h-8 w-[120px] object-cover md:h-10 md:w-[150px]" />
        </Link>

        <nav aria-label="Main" className="hidden flex-wrap items-center gap-x-6 gap-y-1 nav:flex">
          <Link href="/#services" className={linkClass}>Services</Link>
          <Link href="/#work" className={linkClass}>Our work</Link>
          <Link href="/#process" className={linkClass}>Process</Link>
          <a href={`mailto:${site.email}`} className={linkClass}>Contact</a>
          <a href={quoteHref} className="inline-flex min-h-11 items-center rounded-lg bg-river px-[18px] text-[15px] font-medium text-midnight no-underline hover:bg-river-hover">
            Get a free quote
          </a>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-white/25 text-white nav:hidden"
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>

      {open && (
        <nav id={menuId} aria-label="Mobile" className="flex flex-col gap-1 border-t border-white/10 px-4 pt-2 pb-6 nav:hidden">
          <span className="px-2 pt-3 pb-1 text-[11px] leading-4 font-medium tracking-[0.35em] text-haze">SERVICES</span>
          {services.map((service) => (
            <Link key={service.slug} href={serviceHref(service)} onClick={close} className={mobileLinkClass}>
              {service.navLabel}
              <ChevronRightIcon size={16} className="text-river" />
            </Link>
          ))}
          <span className="my-2 h-px bg-white/10" />
          <Link href="/#work" onClick={close} className={mobileLinkClass}>Our work</Link>
          <Link href="/#process" onClick={close} className={mobileLinkClass}>Process</Link>
          <a href={`mailto:${site.email}`} className={mobileLinkClass}>{site.email}</a>
          <a href={quoteHref} onClick={close} className="mt-3 flex min-h-[52px] items-center justify-center rounded-lg bg-river text-base font-medium text-midnight no-underline hover:bg-river-hover">
            Get my free quote
          </a>
          <span className="mt-2 text-center text-[13px] leading-[18px] text-haze">Free and no obligation · reply within 24 hours</span>
        </nav>
      )}
    </header>
  );
}
