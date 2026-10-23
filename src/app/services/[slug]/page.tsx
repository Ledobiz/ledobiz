import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, CheckIcon, ChevronRightIcon, PlusIcon } from "@/components/icons";
import { HeroBackground, ImageSlot } from "@/components/image-slot";
import { ServiceJsonLd } from "@/components/json-ld";
import { QuoteForm } from "@/components/quote-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { buttonGhostDark, buttonRiver, CheckList, Container, CtaBand, MobileQuoteBar, Overline } from "@/components/ui";
import { getService, services, serviceHref } from "@/lib/services";
import { segmentColors } from "@/lib/site";

const buildBarColors = ["bg-river", "bg-salsify", "bg-gold", "bg-midnight", "bg-river", "bg-salsify"];

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) {
    return {};
  }
  // "in Lagos, Nigeria" matches how clients search, e.g. "web development in Lagos".
  const title = `${service.title} in Lagos, Nigeria`;
  return {
    title,
    description: service.metaDescription,
    alternates: { canonical: serviceHref(service) },
    openGraph: { type: "website", url: serviceHref(service), title: `${title} · Ledobiz`, description: service.metaDescription },
    twitter: { card: "summary_large_image", title: `${title} · Ledobiz`, description: service.metaDescription },
  };
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) {
    notFound();
  }

  const otherServices = services.filter((item) => item.slug !== service.slug);

  return (
    <>
      <ServiceJsonLd service={service} />
      <SiteNav />
      <main>
        {/* Hero + quote form */}
        <section aria-labelledby="service-title" className="on-dark relative overflow-hidden bg-midnight text-white">
          <HeroBackground id={service.heroImg} />
          <div className="relative mx-auto grid max-w-[1200px] gap-4 px-4 pt-7 pb-8 md:px-6 md:pt-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:grid-rows-[auto_auto_1fr] lg:gap-x-12 lg:gap-y-6 lg:pb-20">
            <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1 lg:gap-6 lg:pt-4">
              <nav aria-label="Breadcrumb" className="flex flex-wrap gap-1.5 text-[13px] leading-[18px] text-haze md:gap-2 md:text-sm md:leading-5">
                <Link href="/" className="text-mist">Home</Link>
                <span aria-hidden="true">/</span>
                <Link href="/#services" className="hidden text-mist md:inline">Services</Link>
                <span aria-hidden="true" className="hidden md:inline">/</span>
                <span aria-current="page" className="text-white">{service.title}</span>
              </nav>
              <Overline className="text-river">{service.overline}</Overline>
              <h1 id="service-title" className="m-0 font-display text-[30px] leading-[35px] font-extrabold md:text-[42px] md:leading-[1.08] lg:text-[clamp(36px,4.6vw,54px)] lg:tracking-[-0.01em]">
                {service.headline}
              </h1>
              <p className="m-0 max-w-[560px] text-base leading-6 text-mist md:text-lg md:leading-7">
                <span className="md:hidden">{service.mobileLead}</span>
                <span className="hidden md:inline">{service.lead}</span>
              </p>
              <CheckList items={service.outcomes} />
            </div>

            <div id="quote" className="mt-1.5 scroll-mt-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0">
              <QuoteForm preset={service.preset} />
            </div>

            <div className="hidden flex-wrap gap-3 lg:col-start-1 lg:row-start-2 lg:flex">
              <a href="#quote" className={buttonRiver}>Get a free {service.quoteNoun} quote</a>
              <Link href="/#work" className={buttonGhostDark}>See our work</Link>
            </div>
          </div>
        </section>

        {/* What we build */}
        <section aria-labelledby="builds-title">
          <Container className="flex flex-col gap-5 py-12 md:gap-12 md:py-24">
            <div className="flex max-w-[680px] flex-col gap-2.5 md:gap-3">
              <Overline>{service.buildsLabel}</Overline>
              <h2 id="builds-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">{service.buildTitle}</h2>
            </div>
            <ul className="m-0 grid list-none gap-2.5 p-0 md:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] md:gap-6">
              {service.builds.map((build, index) => (
                <li key={build.title} className="flex gap-3.5 rounded-xl border border-line p-4 md:flex-col md:gap-2.5 md:rounded-2xl md:p-6">
                  <span className={`w-1 flex-none self-stretch rounded-full md:h-1 md:w-10 md:self-auto ${buildBarColors[index]}`} />
                  <span className="flex flex-col gap-1 md:gap-2.5">
                    <h3 className="m-0 font-display text-[17px] leading-[22px] font-semibold md:text-xl md:leading-7">{build.title}</h3>
                    <p className="m-0 text-sm leading-5 text-muted md:text-[15px] md:leading-[23px]">{build.text}</p>
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* Why + tech */}
        <section aria-labelledby="why-title" className="bg-surface">
          <Container className="grid gap-5 py-12 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
            <ImageSlot id={service.cardImg} className="aspect-[4/3] rounded-xl bg-white md:rounded-2xl" sizes="(min-width: 1024px) 560px, 100vw" />
            <div className="flex min-w-0 flex-col gap-5 md:gap-7">
              <div className="flex flex-col gap-2.5 md:gap-3">
                <Overline>WHY LEDOBIZ</Overline>
                <h2 id="why-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">{service.whyTitle}</h2>
              </div>
              <ul className="m-0 flex list-none flex-col gap-4 p-0 md:gap-5">
                {service.benefits.map((benefit) => (
                  <li key={benefit.title} className="flex items-start gap-3 md:gap-3.5">
                    <span className="inline-flex size-[26px] flex-none items-center justify-center rounded-full border border-line bg-white text-success md:size-7">
                      <CheckIcon size={14} strokeWidth={3} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <strong className="text-[15px] md:text-base">{benefit.title}</strong>
                      <span className="text-sm leading-5 text-muted md:text-[15px] md:leading-[23px]">{benefit.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2.5">
                <span className="hidden text-xs leading-4 font-medium tracking-[0.35em] text-muted md:block">{service.techLabel}</span>
                <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 md:gap-2">
                  {service.tech.map((tech) => (
                    <li key={tech} className="rounded-full border border-line bg-white px-2.5 py-1.5 text-[13px] leading-[18px] font-medium md:px-3 md:text-sm md:leading-5">{tech}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* Process */}
        <section aria-labelledby="steps-title">
          <Container className="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
            <div className="flex max-w-[680px] flex-col gap-2.5 md:gap-3">
              <Overline>HOW IT WORKS</Overline>
              <h2 id="steps-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">{service.stepsTitle}</h2>
            </div>
            <ol className="m-0 flex list-none flex-col p-0 md:hidden">
              {service.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex flex-none flex-col items-center">
                    <span className={`inline-flex size-9 items-center justify-center rounded-full font-display text-[13px] font-bold ${segmentColors[index]} ${index === 3 ? "text-white" : "text-midnight"}`}>0{index + 1}</span>
                    {index < service.steps.length - 1 && <span className="min-h-5 w-0.5 flex-1 bg-line" />}
                  </span>
                  <span className="flex flex-col gap-0.5 pb-5">
                    <strong className="font-display text-[17px] leading-9 font-semibold">{step.title}</strong>
                    <span className="text-sm leading-5 text-muted">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <ol className="m-0 hidden list-none grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-6 p-0 md:grid">
              {service.steps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-2 border-t-4 border-line pt-4">
                  <span className="font-display text-sm font-bold text-link">0{index + 1}</span>
                  <h3 className="m-0 font-display text-xl leading-7 font-semibold">{step.title}</h3>
                  <p className="m-0 text-[15px] leading-[23px] text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="bg-surface">
          <div className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 py-12 md:gap-8 md:px-6 md:py-24">
            <div className="flex flex-col gap-2.5 md:gap-3">
              <Overline>FAQ</Overline>
              <h2 id="faq-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">Questions about {service.short}</h2>
            </div>
            <div className="flex flex-col gap-2.5 md:gap-3">
              {service.faqs.map((faq) => (
                <details key={faq.q} className="group rounded-lg border border-line bg-white px-4 md:px-5">
                  <summary className="flex min-h-14 items-center justify-between gap-3 py-2 text-[15px] leading-[21px] font-bold md:min-h-[60px] md:gap-4 md:text-base">
                    {faq.q}
                    <PlusIcon size={20} className="flex-none transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="m-0 pb-4 text-sm leading-[21px] text-muted md:pb-5 md:text-base md:leading-6">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Other services */}
        <section aria-labelledby="others-title">
          <Container className="flex flex-col gap-3.5 pt-12 pb-6 md:gap-6 md:pt-24 md:pb-12">
            <h2 id="others-title" className="m-0 font-display text-[22px] leading-7 font-bold md:text-[28px] md:leading-9">Other services</h2>
            <ul className="m-0 flex list-none flex-col border-t border-line p-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] md:gap-3 md:border-0">
              {otherServices.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={serviceHref(other)}
                    className="flex min-h-14 items-center justify-between gap-2 border-b border-line font-medium text-midnight no-underline hover:text-link md:rounded-lg md:border md:px-4 md:hover:border-river md:hover:text-midnight"
                  >
                    {other.navLabel}
                    <ChevronRightIcon size={16} className="text-link md:hidden" />
                    <ArrowRightIcon size={16} className="hidden text-link md:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <div className="pt-6 md:pt-12">
          <CtaBand title={service.ctaTitle} text="Answer four quick questions. We reply within 24 hours with a personalised proposal." secondary={false} />
        </div>
      </main>
      <SiteFooter className="pb-[76px] md:pb-0" />
      <MobileQuoteBar label={`Get a free ${service.barNoun} quote`} />
    </>
  );
}
