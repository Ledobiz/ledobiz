import { type Service, serviceHref, services } from "@/lib/services";
import { site } from "@/lib/site";

/**
 * Structured data (schema.org JSON-LD) so Google understands who we are, where we work and what we sell.
 * Check changes with https://search.google.com/test/rich-results.
 */

type Thing = Record<string, unknown>;

const absolute = (path: string) => new URL(path, site.url).toString();
const organizationId = absolute("/#organization");

function JsonLd({ data }: { data: Thing }) {
  // Escaping "<" keeps the JSON from closing the script tag early.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const organization: Thing = {
  "@type": "ProfessionalService",
  "@id": organizationId,
  name: site.name,
  legalName: site.legalName,
  slogan: site.tagline,
  description: site.description,
  url: site.url,
  logo: absolute("/brand/ledobiz-logo-email.png"),
  image: absolute("/opengraph-image"),
  email: site.email,
  address: site.offices.map((office) => ({ "@type": "PostalAddress", streetAddress: office.street, addressLocality: office.locality, addressRegion: office.region, addressCountry: "NG" })),
  identifier: { "@type": "PropertyValue", propertyID: "CAC RC number", value: site.rcNumber },
  areaServed: [{ "@type": "Country", name: "Nigeria" }, "Worldwide"],
  knowsAbout: ["Web development", "Mobile app development", "Desktop software", "Cloud and DevOps", "API development", "Software security"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Software development services",
    itemListElement: services.map((service) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: service.title, url: absolute(serviceHref(service)) } })),
  },
};

export function HomeJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [organization, { "@type": "WebSite", "@id": absolute("/#website"), name: site.name, url: site.url, inLanguage: "en-NG", publisher: { "@id": organizationId } }],
      }}
    />
  );
}

export function ServiceJsonLd({ service }: { service: Service }) {
  const url = absolute(serviceHref(service));
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Service",
            "@id": `${url}#service`,
            name: service.title,
            serviceType: service.title,
            description: service.metaDescription,
            url,
            provider: { "@id": organizationId, "@type": "ProfessionalService", name: site.name, url: site.url },
            areaServed: [{ "@type": "Country", name: "Nigeria" }, "Worldwide"],
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: site.url },
              { "@type": "ListItem", position: 2, name: "Services", item: absolute("/#services") },
              { "@type": "ListItem", position: 3, name: service.title, item: url },
            ],
          },
          {
            "@type": "FAQPage",
            mainEntity: service.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
          },
        ],
      }}
    />
  );
}
