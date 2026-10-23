import type { Tone } from "@/components/admin/ui";
import type { ClientStatus, Health, InvoiceDisplayStatus } from "@/lib/admin/domain";

export const healthTone: Record<Health, Tone> = {
  ON_TRACK: "ok",
  AT_RISK: "warn",
  BEHIND: "bad",
  NOT_STARTED: "neutral",
  DONE: "ok",
};

export const invoiceTone: Record<InvoiceDisplayStatus, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  OVERDUE: "bad",
  PAID: "ok",
  VOID: "neutral",
};

export const invoiceLabel: Record<InvoiceDisplayStatus, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting payment",
  OVERDUE: "Overdue",
  PAID: "Paid",
  VOID: "Void",
};

export const quoteTone: Record<string, Tone> = { NEW: "info", REPLIED: "neutral", WON: "ok", LOST: "bad" };
export const quoteLabel: Record<string, string> = { NEW: "New", REPLIED: "Replied", WON: "Won", LOST: "Lost" };

export const clientTone: Record<ClientStatus, Tone> = { ACTIVE: "ok", PROSPECT: "info", PAST: "neutral" };
export const clientLabel: Record<ClientStatus, string> = { ACTIVE: "Active", PROSPECT: "Prospect", PAST: "Past client" };

export const projectStatusLabel: Record<string, string> = { PENDING: "Pending", ONGOING: "Ongoing", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const milestoneStatusLabel: Record<string, string> = { PENDING: "Pending", ONGOING: "Ongoing", COMPLETED: "Completed" };

export const projectTypeLabel: Record<string, string> = {
  web: "Website or web app",
  mobile: "Mobile app",
  desktop: "Desktop software",
  consult: "Not sure yet",
};
