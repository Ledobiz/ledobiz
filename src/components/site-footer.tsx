import Image from "next/image";
import Link from "next/link";
import { services, serviceHref } from "@/lib/services";
import { site } from "@/lib/site";

const COPYRIGHT_YEAR = 2026;

export function SiteFooter({ quoteHref = "#quote", className = "" }: { quoteHref?: string; className?: string }) {
  const linkClass = "text-mist no-underline hover:text-white hover:underline";
  const headingClass = "text-xs leading-4 font-medium tracking-[0.35em] text-white";

  return (
    <footer className={`on-dark bg-midnight text-[15px] leading-6 text-mist ${className}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pt-16 pb-8 md:px-6">
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          <div className="flex max-w-[360px] flex-[2_1_280px] flex-col gap-4">
            <Link href="/" aria-label="Ledobiz home" className="inline-flex self-start">
              <Image src={site.logo} alt="Ledobiz" width={180} height={48} unoptimized className="block h-12 w-[180px] object-cover" />
            </Link>
            <p className="m-0">Building digital excellence for tomorrow. Custom web, mobile and desktop software for growing businesses.</p>
          </div>

          <nav aria-label="Services" className="flex flex-[1_1_180px] flex-col gap-2.5">
            <span className={headingClass}>SERVICES</span>
            {services.map((service) => (
              <Link key={service.slug} href={serviceHref(service)} className={linkClass}>
                {service.navLabel}
              </Link>
            ))}
          </nav>

          <nav aria-label="Company" className="flex flex-[1_1_160px] flex-col gap-2.5">
            <span className={headingClass}>COMPANY</span>
            <Link href="/#work" className={linkClass}>Our work</Link>
            <Link href="/#process" className={linkClass}>Process</Link>
            <a href={site.crestPassUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>Crest Pass</a>
            <a href={quoteHref} className={linkClass}>Get a free quote</a>
          </nav>

          <div className="flex flex-[1_1_200px] flex-col gap-2.5">
            <span className={headingClass}>CONTACT</span>
            <a href={`mailto:${site.email}`} className={linkClass}>{site.email}</a>
            {site.offices.map((office) => (
              <address key={office.label} className="not-italic">
                <span className="block text-[12px] tracking-[0.08em] text-haze uppercase">{office.label}</span>
                {office.street}, {office.locality}, {office.region}
              </address>
            ))}
            <span>Remote worldwide</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-white/12 pt-6 text-[13px] leading-5 text-haze">
          <span>© {COPYRIGHT_YEAR} {site.legalName} · RC {site.rcNumber}. All rights reserved.</span>
          <span className="flex gap-5">
            <Link href="/privacy" className={linkClass}>Privacy policy</Link>
            <Link href="/terms" className={linkClass}>Terms and conditions</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
