import type { Metadata } from "next";
import { LegalContact, LegalPage } from "@/components/legal-page";
import { privacyPromises, privacySections } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Ledobiz collects, uses and protects your personal data under the Nigeria Data Protection Act 2023 and the GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      current="privacy"
      title="Privacy policy"
      meta="Last updated [DATE] · Applies to ledobiz.com and our services"
      anchorPrefix="p"
      sections={privacySections}
      intro={
        <ul className="m-0 grid max-w-[1000px] list-none grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4 p-0">
          {privacyPromises.map((promise) => (
            <li key={promise.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
              <span className={`h-1 w-8 rounded-full ${promise.color}`} />
              <strong className="font-display text-[17px] leading-[22px] font-semibold">{promise.title}</strong>
              <span className="text-sm leading-5 text-muted">{promise.text}</span>
            </li>
          ))}
        </ul>
      }
      contact={
        <LegalContact
          title="Want to see, change or delete your data?"
          text="Email us with the subject “Privacy request”. We respond within [30] days."
          href={`mailto:${site.email}?subject=Privacy%20request`}
          label="Send a privacy request"
        />
      }
    />
  );
}
