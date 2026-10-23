import "server-only";
import type { EmailCategory } from "@/generated/prisma/enums";
import {
  type SendResult,
  sendFeedbackRequest,
  sendOverdueReminder,
  sendPaymentReminder,
  sendQuoteFollowUp,
  sendSupportRenewal,
  sendWeeklyUpdate,
} from "@/lib/server/client-emails";
import { db } from "@/lib/server/db";
import { isProviderConfigured } from "@/lib/server/payment-providers";
import { getSettings } from "@/lib/server/settings";

/**
 * The daily email run (called by the cron endpoint, or "Run now" in Settings).
 * Every check looks at the email history first, so running it twice in a day sends nothing new.
 */

export type RunSummary = { ranAt: string; sent: Record<string, number>; skipped: string[]; errors: string[] };

const DAY = 86_400_000;
const LAGOS_OFFSET = 3_600_000; // West Africa Time, UTC+1, no daylight saving.
const MAX_PER_RUN = 100;
// Emails saved while sending isn’t set up still count, so the history doesn't fill with daily duplicates.
const counted = { in: ["SENT" as const, "NOT_SENT" as const] };

function startOfLagosDay(date: Date): Date {
  return new Date(Math.floor((date.getTime() + LAGOS_OFFSET) / DAY) * DAY - LAGOS_OFFSET);
}

export function isLagosFriday(date: Date): boolean {
  return new Date(date.getTime() + LAGOS_OFFSET).getUTCDay() === 5;
}

const labels: Partial<Record<EmailCategory, string>> = {
  QUOTE_FOLLOW_UP: "Quote follow-ups",
  PROJECT_UPDATE: "Weekly updates",
  PAYMENT_REMINDER: "Payment reminders",
  PAYMENT_OVERDUE: "Overdue reminders",
  FEEDBACK_REQUEST: "Feedback requests",
  SUPPORT_RENEWAL: "Support renewals",
};

export async function runDailyEmails(now = new Date()): Promise<RunSummary> {
  const settings = await getSettings();
  const today = startOfLagosDay(now);
  const online = isProviderConfigured("PAYSTACK") || isProviderConfigured("FLUTTERWAVE");
  const summary: RunSummary = { ranAt: now.toISOString(), sent: {}, skipped: [], errors: [] };
  let total = 0;

  async function attempt(category: EmailCategory, what: string, send: () => Promise<SendResult | "skipped-behind">): Promise<void> {
    if (total >= MAX_PER_RUN) {
      summary.skipped.push(`${what}: daily limit of ${MAX_PER_RUN} reached, will send tomorrow`);
      return;
    }
    try {
      const result = await send();
      if (result === "skipped-behind") {
        summary.skipped.push(`${what}: behind schedule, so no automatic update. Send a deadline email instead.`);
      } else if (!result) {
        summary.skipped.push(`${what}: no contact email`);
      } else if (result.status === "FAILED") {
        summary.errors.push(`${what}: ${result.error ?? "the email server rejected it"}`);
      } else {
        total += 1;
        const label = labels[category] ?? category;
        summary.sent[label] = (summary.sent[label] ?? 0) + 1;
      }
    } catch (cause) {
      console.error(`Scheduled email failed: ${what}`, cause);
      summary.errors.push(`${what}: ${cause instanceof Error ? cause.message : "unexpected error"}`);
    }
  }

  // Quote follow-up: 5 days after our reply, if they haven't answered (up to 30 days).
  if (settings.autoQuoteFollowUp) {
    const quotes = await db().quoteRequest.findMany({
      where: { status: "REPLIED", repliedAt: { lte: new Date(now.getTime() - 5 * DAY), gte: new Date(now.getTime() - 30 * DAY) }, emails: { none: { category: "QUOTE_FOLLOW_UP", status: counted } } },
      select: { id: true, reference: true, clientId: true, repliedAt: true },
    });
    for (const quote of quotes) {
      const answered = quote.clientId ? await db().email.count({ where: { clientId: quote.clientId, direction: "INBOUND", createdAt: { gt: quote.repliedAt! } } }) : 0;
      if (answered === 0) {
        await attempt("QUOTE_FOLLOW_UP", `Quote ${quote.reference}`, () => sendQuoteFollowUp(quote.id));
      }
    }
  }

  // Weekly progress update: Fridays, ongoing projects with no update in the last 5 days.
  if (settings.autoWeeklyUpdates && isLagosFriday(now)) {
    const projects = await db().project.findMany({
      where: { status: "ONGOING", emails: { none: { category: "PROJECT_UPDATE", status: counted, createdAt: { gte: new Date(now.getTime() - 5 * DAY) } } } },
      select: { id: true, name: true },
    });
    for (const project of projects) {
      await attempt("PROJECT_UPDATE", project.name, () => sendWeeklyUpdate(project.id));
    }
  }

  // Payment reminder: invoices due in the next 1–3 days, sent at least 2 days ago.
  if (settings.autoPaymentReminders) {
    const invoices = await db().invoice.findMany({
      where: {
        status: "SENT",
        dueDate: { gte: new Date(today.getTime() + DAY), lt: new Date(today.getTime() + 4 * DAY) },
        sentAt: { lte: new Date(now.getTime() - 2 * DAY) },
        emails: { none: { category: "PAYMENT_REMINDER", status: counted } },
      },
      select: { id: true, number: true },
    });
    for (const invoice of invoices) {
      await attempt("PAYMENT_REMINDER", `Invoice ${invoice.number}`, () => sendPaymentReminder(invoice.id, online));
    }
  }

  // Overdue: the day after the due date, then weekly, at most 6 times.
  if (settings.autoOverdueReminders) {
    const invoices = await db().invoice.findMany({
      where: { status: "SENT", dueDate: { lt: today } },
      select: { id: true, number: true, emails: { where: { category: "PAYMENT_OVERDUE", status: counted }, orderBy: { createdAt: "desc" }, select: { createdAt: true } } },
    });
    for (const invoice of invoices) {
      const last = invoice.emails[0]?.createdAt;
      if (invoice.emails.length >= 6 || (last && last.getTime() > now.getTime() - 7 * DAY + 2 * 3_600_000)) {
        continue;
      }
      await attempt("PAYMENT_OVERDUE", `Invoice ${invoice.number}`, () => sendOverdueReminder(invoice.id, online, invoice.emails.length));
    }
  }

  // Feedback request: 14 days after launch (up to 45 days).
  if (settings.autoFeedbackRequests) {
    const projects = await db().project.findMany({
      where: { status: "COMPLETED", deliveredAt: { lte: new Date(now.getTime() - 14 * DAY), gte: new Date(now.getTime() - 45 * DAY) }, emails: { none: { category: "FEEDBACK_REQUEST", status: counted } } },
      select: { id: true, name: true },
    });
    for (const project of projects) {
      await attempt("FEEDBACK_REQUEST", project.name, () => sendFeedbackRequest(project.id));
    }
  }

  // Support plan: when a project's free fixes end, and a week before each renewal.
  if (settings.autoSupportRenewals) {
    const endedFree = await db().project.findMany({
      where: {
        freeSupportUntil: { gte: new Date(today.getTime() - 3 * DAY), lt: new Date(today.getTime() + DAY) },
        client: { supportPlanName: { not: null } },
        emails: { none: { category: "SUPPORT_RENEWAL", status: counted } },
      },
      select: { id: true, name: true, clientId: true },
    });
    for (const project of endedFree) {
      await attempt("SUPPORT_RENEWAL", `${project.name} (free fixes ended)`, () => sendSupportRenewal(project.clientId, "free-ended", project.id));
    }
    const renewing = await db().client.findMany({
      where: {
        supportPlanName: { not: null },
        supportPlanUntil: { gte: now, lte: new Date(now.getTime() + 7 * DAY) },
        emails: { none: { category: "SUPPORT_RENEWAL", status: counted, createdAt: { gte: new Date(now.getTime() - 20 * DAY) } } },
      },
      select: { id: true, company: true },
    });
    for (const client of renewing) {
      await attempt("SUPPORT_RENEWAL", `${client.company} (plan renews)`, () => sendSupportRenewal(client.id, "renewal"));
    }
  }

  await db().settings.update({ where: { id: "default" }, data: { automationLastRun: summary } });
  return summary;
}

export function readRunSummary(value: unknown): RunSummary | null {
  if (!value || typeof value !== "object" || !("ranAt" in value)) {
    return null;
  }
  return value as RunSummary;
}
