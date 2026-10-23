/** Pure business rules for the admin dashboard (no database access), shared by pages and tests. */
import { daysBetween, num } from "@/lib/admin/format";

type Decimalish = Parameters<typeof num>[0];

// ── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceLine = { quantity: Decimalish; rate: Decimalish };

export function invoiceTotals(items: InvoiceLine[], vatRate: Decimalish, discount: Decimalish) {
  const subtotal = items.reduce((sum, item) => sum + num(item.quantity) * num(item.rate), 0);
  const discountAmount = Math.min(Math.max(num(discount), 0), subtotal);
  const vat = round2((subtotal - discountAmount) * (num(vatRate) / 100));
  return { subtotal: round2(subtotal), discount: round2(discountAmount), vat, total: round2(subtotal - discountAmount + vat) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type InvoiceDisplayStatus = "DRAFT" | "SENT" | "OVERDUE" | "PAID" | "VOID";

export function invoiceStatus(invoice: { status: string; dueDate: Date }, now: Date): InvoiceDisplayStatus {
  if (invoice.status === "SENT" && invoice.dueDate < startOfDay(now)) {
    return "OVERDUE";
  }
  return invoice.status as InvoiceDisplayStatus;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// ── Projects ────────────────────────────────────────────────────────────────

export type MilestoneLike = {
  status: string;
  progress: number;
  plannedStart: Date;
  plannedEnd: Date;
  forecastEnd: Date | null;
  completedAt: Date | null;
};

export type Health = "ON_TRACK" | "AT_RISK" | "BEHIND" | "NOT_STARTED" | "DONE";

export type ProjectHealth = {
  health: Health;
  label: string;
  workPercent: number;
  timePercent: number;
  forecastLaunch: Date | null;
  daysLate: number;
};

/** Expected end of a milestone: actual completion, else the forecast, else the plan. */
export function milestoneEnd(milestone: MilestoneLike): Date {
  return milestone.completedAt ?? milestone.forecastEnd ?? milestone.plannedEnd;
}

/** Days a milestone is (or is forecast to be) behind its planned end. Negative means early. */
export function milestoneVariance(milestone: MilestoneLike, now: Date): number {
  const end = milestone.status !== "COMPLETED" && !milestone.forecastEnd && milestone.plannedEnd < now ? now : milestoneEnd(milestone);
  return daysBetween(milestone.plannedEnd, end);
}

export function projectHealth(
  project: { status: string; startDate: Date | null; deadline: Date | null; deliveredAt: Date | null },
  milestones: MilestoneLike[],
  now: Date,
): ProjectHealth {
  const workPercent = milestones.length
    ? Math.round(milestones.reduce((sum, m) => sum + (m.status === "COMPLETED" ? 100 : m.progress), 0) / milestones.length)
    : 0;

  let timePercent = 0;
  if (project.startDate && project.deadline && project.deadline > project.startDate) {
    timePercent = Math.round(((now.getTime() - project.startDate.getTime()) / (project.deadline.getTime() - project.startDate.getTime())) * 100);
    timePercent = Math.min(Math.max(timePercent, 0), 100);
  }

  const forecastLaunch = milestones.length
    ? new Date(Math.max(...milestones.map((m) => (m.status !== "COMPLETED" && !m.forecastEnd && m.plannedEnd < now ? now : milestoneEnd(m)).getTime())))
    : project.deadline;
  const daysLate = project.deadline && forecastLaunch ? Math.max(0, daysBetween(project.deadline, forecastLaunch)) : 0;

  if (project.status === "COMPLETED") {
    const late = project.deadline && project.deliveredAt ? daysBetween(project.deadline, project.deliveredAt) : 0;
    return { health: "DONE", label: late > 0 ? `${late} days late` : late < 0 ? `${-late} days early` : "On time", workPercent: 100, timePercent: 100, forecastLaunch: project.deliveredAt, daysLate: Math.max(late, 0) };
  }
  if (project.status === "PENDING") {
    return { health: "NOT_STARTED", label: "Not started", workPercent, timePercent: 0, forecastLaunch, daysLate: 0 };
  }
  if (daysLate > 0) {
    return { health: "BEHIND", label: `Behind by ${daysLate} day${daysLate === 1 ? "" : "s"}`, workPercent, timePercent, forecastLaunch, daysLate };
  }
  if (workPercent + 10 < timePercent) {
    return { health: "AT_RISK", label: "At risk", workPercent, timePercent, forecastLaunch, daysLate };
  }
  return { health: "ON_TRACK", label: "On track", workPercent, timePercent, forecastLaunch, daysLate };
}

// ── Clients ─────────────────────────────────────────────────────────────────

export type ClientStatus = "PROSPECT" | "ACTIVE" | "PAST";

/**
 * Active: a signed project in progress or scheduled, an active support plan, or money owed.
 * Past client: every project delivered, nothing owed, no active support plan.
 * Prospect: quoted, but nothing signed and paid yet.
 */
export function clientStatus(
  client: {
    supportPlanUntil: Date | null;
    projects: { status: string; deliveredAt: Date | null }[];
    invoices: { status: string; dueDate: Date; paidAt: Date | null }[];
  },
  now: Date,
): { status: ClientStatus; reason: string } {
  const owing = client.invoices.filter((invoice) => invoice.status === "SENT");
  const running = client.projects.filter((project) => project.status === "ONGOING");
  const scheduled = client.projects.filter((project) => project.status === "PENDING");
  const delivered = client.projects.filter((project) => project.status === "COMPLETED");
  const supportActive = client.supportPlanUntil !== null && client.supportPlanUntil > now;
  const hasPaid = client.invoices.some((invoice) => invoice.status === "PAID");

  if (running.length > 0) {
    return { status: "ACTIVE", reason: running.length === 1 ? "Project in progress" : `${running.length} projects in progress` };
  }
  if (owing.length > 0) {
    return { status: "ACTIVE", reason: `${owing.length} unpaid invoice${owing.length === 1 ? "" : "s"}` };
  }
  if (supportActive) {
    return { status: "ACTIVE", reason: "Active support plan" };
  }
  if (scheduled.length > 0) {
    return hasPaid ? { status: "ACTIVE", reason: "Project scheduled to start" } : { status: "PROSPECT", reason: "Proposal accepted · deposit not paid yet" };
  }
  if (delivered.length > 0) {
    const last = delivered.map((project) => project.deliveredAt).filter((date): date is Date => date !== null).sort((a, b) => b.getTime() - a.getTime())[0];
    const when = last ? last.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";
    return { status: "PAST", reason: `Delivered${when ? ` ${when}` : ""} · nothing owed · no support plan` };
  }
  return { status: "PROSPECT", reason: "Quote sent · nothing signed yet" };
}
