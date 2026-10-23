export const projectTypes = [
  { id: "web", label: "Website or web app", hint: "Sites, portals, SaaS" },
  { id: "mobile", label: "Mobile app", hint: "iOS and Android" },
  { id: "desktop", label: "Desktop software", hint: "Windows, macOS, Linux" },
  { id: "consult", label: "Not sure yet", hint: "Help me choose" },
] as const;

export type ProjectType = (typeof projectTypes)[number]["id"];

export const currencies = [
  { code: "NGN", label: "₦ NGN · Nigerian naira" },
  { code: "USD", label: "$ USD · US dollar" },
  { code: "GBP", label: "£ GBP · British pound" },
  { code: "EUR", label: "€ EUR · Euro" },
  { code: "CAD", label: "$ CAD · Canadian dollar" },
  { code: "GHS", label: "₵ GHS · Ghanaian cedi" },
  { code: "KES", label: "KSh KES · Kenyan shilling" },
  { code: "ZAR", label: "R ZAR · South African rand" },
  { code: "AED", label: "AED · UAE dirham" },
] as const;

export type CurrencyCode = (typeof currencies)[number]["code"];

export const budgetRanges: Record<CurrencyCode, readonly [string, string, string, string]> = {
  NGN: ["Under ₦5M", "₦5M – ₦15M", "₦15M – ₦40M", "₦40M+"],
  USD: ["Under $3k", "$3k – $10k", "$10k – $25k", "$25k+"],
  GBP: ["Under £2.5k", "£2.5k – £8k", "£8k – £20k", "£20k+"],
  EUR: ["Under €3k", "€3k – €10k", "€10k – €25k", "€25k+"],
  CAD: ["Under CA$4k", "CA$4k – CA$14k", "CA$14k – CA$35k", "CA$35k+"],
  GHS: ["Under GH₵40k", "GH₵40k – GH₵130k", "GH₵130k – GH₵320k", "GH₵320k+"],
  KES: ["Under KSh 400k", "KSh 400k – 1.3M", "KSh 1.3M – 3.2M", "KSh 3.2M+"],
  ZAR: ["Under R55k", "R55k – R180k", "R180k – R450k", "R450k+"],
  AED: ["Under AED 11k", "AED 11k – 37k", "AED 37k – 92k", "AED 92k+"],
};

export const NOT_SURE_BUDGET = "Not sure yet";

export function budgetOptions(currency: CurrencyCode): string[] {
  return [...budgetRanges[currency], NOT_SURE_BUDGET];
}

export const timelines = ["As soon as possible", "1 – 3 months", "3 – 6 months", "Flexible"] as const;

export const features = [
  "User accounts",
  "Online payments",
  "Admin dashboard",
  "Booking",
  "Integrations and APIs",
  "Content management",
  "Reports and analytics",
  "Notifications",
] as const;

export const DETAILS_MAX_LENGTH = 1000;

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

const countryCurrency: Record<string, CurrencyCode> = {
  NG: "NGN", US: "USD", GB: "GBP", CA: "CAD", GH: "GHS", KE: "KES", ZA: "ZAR", AE: "AED",
  // Euro area, plus the countries that use the euro without being members.
  AT: "EUR", BE: "EUR", BG: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR", FR: "EUR", GR: "EUR", HR: "EUR",
  IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR", LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
  AD: "EUR", MC: "EUR", ME: "EUR", SM: "EUR", VA: "EUR", XK: "EUR",
};

/** The currency for a two-letter country code (from the visitor's IP), falling back to USD. */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  return countryCurrency[(country ?? "").toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in budgetRanges;
}

export function isProjectType(value: unknown): value is ProjectType {
  return projectTypes.some((type) => type.id === value);
}

export type ContactFields = { name: string; email: string; phone: string };

export function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Enter your full name.";
  }
  if (trimmed.length < 2) {
    return "Your name needs at least 2 characters.";
  }
  if (trimmed.length > 120) {
    return "Your name must be 120 characters or fewer.";
  }
  return "";
}

export function validateEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Enter your email so we can send your quote.";
  }
  if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Enter a valid email address, like name@company.com.";
  }
  return "";
}

export function validatePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed && !/^\+?[0-9\s\-()]{7,20}$/.test(trimmed)) {
    return "Enter a valid phone number with country code, like +234 803 123 4567.";
  }
  return "";
}

export type QuoteRequest = {
  type: ProjectType;
  currency: CurrencyCode;
  budget: string;
  timeline: string;
  features: string[];
  details: string;
  name: string;
  email: string;
  phone: string;
  company: string;
};

export type QuoteResponse = { ok: true; reference: string } | { ok: false; errors: Record<string, string> };

/** Server-side validation of a full quote request. Returns field errors, empty when valid. */
export function validateQuoteRequest(body: Record<string, unknown>): {
  errors: Record<string, string>;
  data?: QuoteRequest;
} {
  const errors: Record<string, string> = {};
  const text = (key: string): string => (typeof body[key] === "string" ? (body[key] as string) : "");

  if (!isProjectType(body.type)) {
    errors.type = "Choose the option that best fits your project.";
  }
  if (!isCurrencyCode(body.currency)) {
    errors.currency = "Choose a supported currency.";
  }
  const budget = text("budget");
  if (isCurrencyCode(body.currency) && !budgetOptions(body.currency).includes(budget)) {
    errors.budget = "Choose a budget range, or pick “Not sure yet”.";
  }
  const timeline = text("timeline");
  if (!(timelines as readonly string[]).includes(timeline)) {
    errors.timeline = "Choose when you would like to launch.";
  }
  const chosenFeatures = Array.isArray(body.features) ? body.features : [];
  if (!chosenFeatures.every((feature) => (features as readonly unknown[]).includes(feature))) {
    errors.features = "Choose features from the list.";
  }
  const details = text("details");
  if (details.length > DETAILS_MAX_LENGTH) {
    errors.details = `Keep your project details to ${DETAILS_MAX_LENGTH} characters.`;
  }
  const nameError = validateName(text("name"));
  if (nameError) {
    errors.name = nameError;
  }
  const emailError = validateEmail(text("email"));
  if (emailError) {
    errors.email = emailError;
  }
  const phoneError = validatePhone(text("phone"));
  if (phoneError) {
    errors.phone = phoneError;
  }
  if (text("company").length > 160) {
    errors.company = "Company name must be 160 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    data: {
      type: body.type as ProjectType,
      currency: body.currency as CurrencyCode,
      budget,
      timeline,
      features: chosenFeatures as string[],
      details: details.trim(),
      name: text("name").trim(),
      email: text("email").trim(),
      phone: text("phone").trim(),
      company: text("company").trim(),
    },
  };
}
