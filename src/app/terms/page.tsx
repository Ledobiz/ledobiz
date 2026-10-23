import type { Metadata } from "next";
import { CheckIcon } from "@/components/icons";
import { LegalContact, LegalPage } from "@/components/legal-page";
import { termsSections, termsSummary } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms that apply when you use ledobiz.com, request a quote or work with Ledobiz Technologies Limited.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      current="terms"
      title="Terms and conditions"
      meta="Last updated [DATE] · Effective [DATE]"
      anchorPrefix="t"
      sections={termsSections}
      intro={
        <div className="flex max-w-[820px] flex-col gap-3 rounded-2xl border border-line bg-white p-6">
          <strong className="font-display text-lg leading-6 font-semibold">The short version</strong>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] leading-[22px]">
            {termsSummary.map((item) => (
              <li key={item} className="flex gap-2.5">
                <CheckIcon size={20} strokeWidth={2.25} className="mt-px flex-none text-success" />
                {item}
              </li>
            ))}
          </ul>
          <span className="text-[13px] leading-[18px] text-muted">This summary is for convenience. The full terms below are what apply.</span>
        </div>
      }
      contact={
        <LegalContact
          title="Questions about these terms?"
          text="Email us and we will reply within 24 hours."
          href={`mailto:${site.email}`}
          label={site.email}
        />
      }
    />
  );
}
