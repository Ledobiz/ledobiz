/** Formatting helpers shared by admin server and client components. */

const symbols: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  GHS: "GH₵",
  KES: "KSh ",
  ZAR: "R",
  AED: "AED ",
};

export const supportedCurrencies = Object.keys(symbols);

type DecimalLike = { toNumber(): number } | number | string | null | undefined;

/** Converts Prisma Decimals, strings and numbers to a plain number. */
export function num(value: DecimalLike): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value) || 0;
  }
  return value.toNumber();
}

export function money(value: DecimalLike, currency = "NGN", options: { decimals?: boolean } = {}): string {
  const amount = num(value);
  const showDecimals = options.decimals ?? false;
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : Number.isInteger(amount) ? 0 : 2,
  });
  return `${amount < 0 ? "−" : ""}${symbols[currency] ?? `${currency} `}${formatted}`;
}

/** Short form for dashboards: ₦18.5M, $24k. */
export function moneyShort(value: DecimalLike, currency = "NGN"): string {
  const amount = num(value);
  const abs = Math.abs(amount);
  const symbol = symbols[currency] ?? `${currency} `;
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${symbol}${trim(abs / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${symbol}${trim(abs / 1_000_000)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}${symbol}${trim(abs / 1000)}k`;
  }
  return money(amount, currency);
}

function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
const shortDateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

export function formatDate(value: Date | string | null | undefined): string {
  return value ? dateFormat.format(new Date(value)) : "—";
}

export function formatShortDate(value: Date | string | null | undefined): string {
  return value ? shortDateFormat.format(new Date(value)) : "—";
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const DAY = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

/** "in 4h", "3h overdue" relative to a due time. */
export function dueLabel(due: Date, now: Date): { text: string; overdue: boolean; soon: boolean } {
  const diffHours = Math.round((due.getTime() - now.getTime()) / 3_600_000);
  if (diffHours < 0) {
    const late = Math.abs(diffHours);
    return { text: late >= 48 ? `Overdue by ${Math.round(late / 24)} days` : `Overdue by ${late}h`, overdue: true, soon: false };
  }
  return { text: diffHours >= 48 ? `Due in ${Math.round(diffHours / 24)} days` : `Due in ${diffHours}h`, overdue: false, soon: diffHours <= 6 };
}

export const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  PROJECT_LEAD: "Project lead",
  FINANCE: "Finance",
  MEMBER: "Member",
};
