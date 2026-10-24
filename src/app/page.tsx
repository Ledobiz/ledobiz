import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ChevronRightIcon, ExternalIcon, QuoteMarkIcon } from "@/components/icons";
import { HeroBackground, ImageSlot } from "@/components/image-slot";
import { QuoteForm } from "@/components/quote-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  buttonGhostDark,
  buttonMidnight,
  buttonRiver,
  CheckList,
  Container,
  CtaBand,
  MobileQuoteBar,
  Overline,
  SectionHeading,
  TechPill,
} from "@/components/ui";
import { services, serviceHref } from "@/lib/services";
import { heroStats, processSteps, segmentColors, site, techStrip, trustedBy, values } from "@/lib/site";
import { crestPass, projects, testimonials } from "@/lib/work";
import { HomeJsonLd } from "@/components/json-ld";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <HomeJsonLd />
      <SiteNav />
      <main>
        {/* Hero + quote form */}
        <section aria-labelledby="hero-title" className="on-dark relative overflow-hidden bg-midnight text-white">
          <HeroBackground id="IMG-01" />
          <div className="relative mx-auto grid max-w-[1200px] gap-[18px] px-4 pt-9 pb-8 md:px-6 md:pt-12 lg:grid-cols-[minmax(0,1fr)_460px] lg:grid-rows-[auto_auto_auto_auto_1fr] lg:gap-x-12 lg:gap-y-7 lg:pt-14 lg:pb-20">
            <div className="flex flex-col gap-[18px] lg:col-start-1 lg:row-start-1 lg:gap-7 lg:pt-6">
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 px-3 py-[5px] text-[11px] leading-4 font-medium tracking-[0.25em] text-tint md:gap-2.5 md:px-3.5 md:py-1.5 md:text-xs md:tracking-[0.3em]">
                <span className="size-[7px] rounded-full bg-salsify md:size-2" />
                WEB · MOBILE · DESKTOP
              </span>
              <h1 id="hero-title" className="m-0 font-display text-[34px] leading-[38px] font-extrabold tracking-[-0.01em] md:text-[44px] md:leading-[1.08] lg:text-[clamp(38px,5vw,58px)] lg:leading-[1.07]">
                Websites, mobile and desktop apps built to <span className="text-river">grow your business</span>
              </h1>
              <p className="m-0 max-w-[560px] text-base leading-6 text-mist md:text-lg md:leading-7">
                Ledobiz designs, builds and maintains custom software for startups, schools, clinics and growing enterprises. One team, from the first wireframe to launch and beyond.
              </p>
              <CheckList items={["A clear, itemised quote before any work starts", "Agile builds you can review as they progress", "Monitoring and support after launch"]} />
            </div>

            <div id="quote" className="mt-1.5 scroll-mt-4 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:mt-0">
              <QuoteForm />
            </div>

            <div className="hidden flex-wrap gap-3 lg:col-start-1 lg:row-start-2 lg:flex">
              <a href="#quote" className={buttonRiver}>
                Get my free quote
                <ArrowRightIcon size={18} />
              </a>
              <a href="#work" className={buttonGhostDark}>See our work</a>
            </div>

            <dl className="m-0 grid max-w-[560px] grid-cols-3 gap-3 pt-2 lg:col-start-1 lg:row-start-3 lg:gap-4 lg:border-t lg:border-white/15 lg:pt-6">
              {heroStats.map((stat) => (
                <div key={stat.value} className="flex flex-col-reverse gap-0.5 lg:gap-1">
                  <dt className="text-xs leading-4 text-haze lg:text-[13px] lg:leading-[18px]">{stat.label}</dt>
                  <dd className="m-0 font-display text-[22px] leading-7 font-bold lg:text-[28px] lg:leading-8">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-white/15 pt-4 text-[13px] leading-[18px] lg:col-start-1 lg:row-start-4 lg:gap-x-5 lg:gap-y-2 lg:border-0 lg:pt-0 lg:text-sm lg:leading-5">
              <span className="w-full text-haze lg:w-auto">Trusted by</span>
              {trustedBy.map((client) => (
                <span key={client} className="font-bold">{client}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Tech strip */}
        <section aria-label="Technologies we use" className="border-b border-line bg-surface">
          <div className="no-scrollbar mx-auto flex max-w-[1200px] items-center gap-5 overflow-x-auto px-4 py-3.5 whitespace-nowrap md:flex-wrap md:gap-x-7 md:gap-y-3 md:overflow-visible md:px-6 md:py-6 md:whitespace-normal">
            <span className="text-[11px] font-medium tracking-[0.25em] text-muted md:text-xs md:tracking-[0.3em]">BUILT WITH</span>
            {techStrip.map((tech) => (
              <span key={tech} className="text-sm font-medium md:text-[15px]">{tech}</span>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="services" aria-labelledby="services-title" className="scroll-mt-4">
          <Container className="flex flex-col gap-6 py-14 md:gap-12 md:py-24">
            <SectionHeading
              id="services-title"
              overline="OUR SERVICES"
              title="Software for every screen your business runs on"
              intro="Pick a service to see what we build, the tools we use and how a project runs from brief to launch."
            />
            <ul className="m-0 flex list-none flex-col gap-3 p-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] md:gap-6">
              {services.map((service) => (
                <li key={service.slug} className="flex">
                  <Link
                    href={serviceHref(service)}
                    className="group flex w-full items-center gap-3.5 rounded-xl border border-line bg-white p-3 text-midnight no-underline transition-colors hover:border-river md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:rounded-2xl md:p-0"
                  >
                    <ImageSlot id={service.cardImg} compact className="size-[84px] flex-none rounded-lg p-1 md:hidden" sizes="84px" />
                    <ImageSlot id={service.cardImg} className="hidden aspect-[4/3] border-x-0 border-t-0 md:flex" sizes="(min-width: 1200px) 384px, (min-width: 768px) 50vw, 100vw" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1 md:gap-3 md:p-6">
                      <h3 className="m-0 font-display text-[17px] leading-[22px] font-semibold md:text-xl md:leading-7">{service.title}</h3>
                      <span className="text-sm leading-5 text-muted md:hidden">{service.mobileDesc}</span>
                      <span className="hidden flex-1 text-[15px] leading-[23px] text-muted md:block">{service.cardDesc}</span>
                      <span className="hidden flex-wrap gap-1.5 md:flex">
                        {service.cardTech.map((tech) => (
                          <TechPill key={tech}>{tech}</TechPill>
                        ))}
                      </span>
                      <span className="mt-1 hidden items-center gap-1.5 text-sm font-medium text-link group-hover:underline md:inline-flex">
                        Explore {service.short}
                        <ArrowRightIcon size={16} />
                      </span>
                    </span>
                    <ChevronRightIcon size={18} className="flex-none text-link md:hidden" />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* Why Ledobiz */}
        <section aria-labelledby="why-title" className="bg-surface">
          <Container className="grid gap-6 py-14 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-x-14 lg:gap-y-8">
            <div className="flex flex-col gap-2.5 md:gap-3 lg:col-start-2 lg:row-start-1 lg:self-end">
              <Overline>WHY LEDOBIZ</Overline>
              <h2 id="why-title" className="m-0 font-display text-[26px] leading-8 font-bold md:text-[clamp(28px,3.4vw,40px)] md:leading-[1.2]">
                Built with precision. Run with reliability.
              </h2>
            </div>
            <ImageSlot id="IMG-08" className="aspect-[4/3] rounded-xl bg-white lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:aspect-[4/5] lg:max-w-[480px] lg:rounded-2xl" sizes="(min-width: 1024px) 480px, 100vw" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:gap-x-8 md:gap-y-7 lg:col-start-2 lg:row-start-2 lg:self-start">
              {values.map((value) => (
                <div key={value.title} className="flex flex-col gap-1.5 md:gap-2">
                  <span className={`h-1 w-8 rounded-full md:w-10 ${value.color}`} />
                  <h3 className="m-0 font-display text-[17px] font-semibold md:text-xl md:leading-7">{value.title}</h3>
                  <p className="m-0 text-sm leading-5 text-muted md:text-[15px] md:leading-[23px]">{value.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Process */}
        <section id="process" aria-labelledby="process-title" className="scroll-mt-4">
          <Container className="flex flex-col gap-6 py-14 md:gap-12 md:py-24">
            <SectionHeading id="process-title" overline="OUR PROCESS" title="From idea to launch in four clear steps" />
            <ol className="m-0 flex list-none flex-col p-0 md:hidden">
              {processSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex flex-none flex-col items-center">
                    <span className={`inline-flex size-9 items-center justify-center rounded-full font-display text-[13px] font-bold ${segmentColors[index]} ${index === 3 ? "text-white" : "text-midnight"}`}>
                      0{index + 1}
                    </span>
                    {index < processSteps.length - 1 && <span className="min-h-6 w-0.5 flex-1 bg-line" />}
                  </span>
                  <span className="flex flex-col gap-1 pb-6">
                    <strong className="font-display text-lg leading-9 font-semibold">{step.title}</strong>
                    <span className="text-[15px] leading-[22px] text-muted">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <ol className="m-0 hidden list-none grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-6 p-0 md:grid">
              {processSteps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
                  <span aria-hidden="true" className="flex gap-1">
                    {segmentColors.map((color, segment) => (
                      <span key={color} className={`h-1 flex-1 rounded-full ${segment <= index ? color : "bg-line"}`} />
                    ))}
                  </span>
                  <span className="font-display text-sm font-bold text-link">0{index + 1}</span>
                  <h3 className="m-0 font-display text-xl leading-7 font-semibold">{step.title}</h3>
                  <p className="m-0 text-[15px] leading-[23px] text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* Work */}
        <section id="work" aria-labelledby="work-title" className="scroll-mt-4 bg-surface">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-5 py-14 md:gap-12 md:px-6 md:py-24">
            <div className="flex flex-col gap-2.5 px-4 md:px-0">
              <SectionHeading
                id="work-title"
                overline="OUR WORK"
                title="Projects that delivered measurable results"
                intro="Real platforms we designed, built and still run for clients in healthcare and education."
              />
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted md:hidden">
                Swipe to see all {projects.length} projects
                <ArrowRightIcon size={16} />
              </span>
            </div>
            <ul className="no-scrollbar m-0 flex list-none snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:grid md:snap-none md:grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] md:gap-6 md:overflow-visible md:px-0 md:pb-0">
              {projects.map((project) => (
                <li key={project.title} className="flex w-[300px] flex-none snap-start md:w-auto">
                  <article className="flex w-full flex-col overflow-hidden rounded-xl border border-line bg-white md:rounded-2xl">
                    <ImageSlot id={project.img} className="aspect-[16/10] border-x-0 border-t-0" caption={`${project.title} screenshot · 16:10`} anchor="top" sizes="(min-width: 768px) 384px, 300px" />
                    <div className="flex flex-1 flex-col gap-2.5 p-4 md:gap-3.5 md:p-6">
                      <span className="self-start rounded bg-tint px-2 py-[3px] text-[11px] leading-4 font-medium md:py-1 md:text-xs">{project.kind}</span>
                      <h3 className="m-0 font-display text-lg leading-6 font-semibold md:text-xl md:leading-7">{project.title}</h3>
                      <p className="m-0 flex-1 text-sm leading-5 text-muted md:hidden">{project.mobileDesc}</p>
                      <p className="m-0 hidden flex-1 text-[15px] leading-[23px] text-muted md:block">{project.desc}</p>
                      <div className="hidden flex-wrap gap-1.5 md:flex">
                        {project.tech.map((tech) => (
                          <TechPill key={tech}>{tech}</TechPill>
                        ))}
                      </div>
                      <dl className="m-0 grid grid-cols-2 gap-2 border-t border-line pt-2.5 md:gap-3 md:pt-3.5">
                        {project.metrics.map((metric) => (
                          <div key={metric.label} className="flex flex-col-reverse">
                            <dt className="text-xs leading-4 text-muted md:text-[13px] md:leading-[18px]">{metric.label}</dt>
                            <dd className="m-0 font-display text-lg leading-6 font-bold md:text-[22px] md:leading-7">{metric.value}</dd>
                          </div>
                        ))}
                      </dl>
                      {project.url ? (
                        <a href={project.url} target="_blank" rel="noopener noreferrer" className="relative inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-link">
                          Visit live site
                          <ExternalIcon size={16} />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="inline-flex min-h-11 items-center text-sm text-muted">Live link coming soon</span>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {/* Crest Pass */}
            <div className="mx-4 mt-3 flex flex-col overflow-hidden rounded-xl border border-line bg-white md:mx-0 md:mt-0 md:rounded-2xl lg:flex-row">
              <ImageSlot id="IMG-12" className="aspect-[4/3] border-x-0 border-t-0 lg:flex-[1_1_380px] lg:border-r lg:border-b-0" sizes="(min-width: 1024px) 560px, 100vw" />
              <div className="flex min-w-0 flex-col justify-center gap-3 px-4 py-5 md:gap-4 md:p-10 lg:flex-[1_1_420px]">
                <span className="self-start rounded bg-gold px-2 py-[3px] text-[11px] leading-4 font-medium tracking-[0.25em] md:px-2.5 md:py-1 md:text-xs md:tracking-[0.3em]">OUR PRODUCT</span>
                <h3 className="m-0 font-display text-[22px] leading-7 font-bold md:text-[28px] md:leading-9">{crestPass.title}</h3>
                <p className="m-0 text-[15px] leading-[22px] text-muted md:hidden">{crestPass.mobileDesc}</p>
                <p className="m-0 hidden text-muted md:block">{crestPass.desc}</p>
                <div className="hidden flex-wrap gap-1.5 md:flex">
                  {crestPass.features.map((feature) => (
                    <TechPill key={feature}>{feature}</TechPill>
                  ))}
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-4">
                  <span>
                    <strong className="font-display text-xl md:text-[22px]">{crestPass.price}</strong>
                    <span className="text-sm text-muted md:text-base"> {crestPass.priceUnit}</span>
                  </span>
                  <a href={site.crestPassUrl} target="_blank" rel="noopener noreferrer" className={`${buttonMidnight} relative min-h-12 md:min-h-11 md:text-sm`}>
                    Visit crestpass.com
                    <ExternalIcon size={16} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section aria-labelledby="testimonials-title">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-5 py-14 md:gap-12 md:px-6 md:py-24">
            <div className="px-4 md:px-0">
              <SectionHeading id="testimonials-title" overline="TESTIMONIALS" title="What our clients say" />
            </div>
            <ul className="no-scrollbar m-0 flex list-none snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:grid md:snap-none md:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] md:gap-6 md:overflow-visible md:px-0 md:pb-0">
              {testimonials.map((testimonial) => (
                <li key={testimonial.name} className="flex w-[300px] flex-none snap-start md:w-auto">
                  <figure className="m-0 flex w-full flex-col gap-4 rounded-xl border border-line p-5 md:gap-5 md:rounded-2xl md:p-7">
                    <QuoteMarkIcon size={28} className="hidden text-river md:block" />
                    <blockquote className="m-0 flex-1 text-[15px] leading-[23px] md:text-[17px] md:leading-[27px]">“{testimonial.quote}”</blockquote>
                    <figcaption className="flex items-center gap-2.5 md:gap-3">
                      <span aria-hidden="true" className={`inline-flex size-10 flex-none items-center justify-center rounded-full text-[13px] font-bold text-midnight md:size-11 md:text-sm ${testimonial.color}`}>
                        {testimonial.initials}
                      </span>
                      <span className="flex flex-col">
                        <strong className="text-sm md:text-[15px]">{testimonial.name}</strong>
                        <span className="text-xs leading-4 text-muted md:text-[13px] md:leading-[18px]">{testimonial.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CtaBand title="Have a project in mind? Get a free quote today." text="Tell us what you need in about 60 seconds. We reply within 24 hours with a personalised proposal." />
      </main>
      <SiteFooter className="pb-[76px] md:pb-0" />
      <MobileQuoteBar />
    </>
  );
}
