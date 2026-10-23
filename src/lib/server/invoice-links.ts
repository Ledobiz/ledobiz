import "server-only";
import { randomBytes } from "node:crypto";
import { type InvoiceLine, invoiceTotals } from "@/lib/admin/domain";
import { db } from "@/lib/server/db";
import { site } from "@/lib/site";

/** Public base URL for links in emails and provider redirects. */
export function appUrl(): string {
  return (process.env.APP_URL || site.url).replace(/\/+$/, "");
}

export function paymentLink(token: string): string {
  return `${appUrl()}/pay/${token}`;
}

/** Receipts reuse the invoice's number: INV-2026-0014 → RCPT-2026-0014. */
export function receiptNumber(invoiceNumber: string): string {
  const match = invoiceNumber.match(/(\d{4}-\d+|\d+)$/);
  return `RCPT-${match ? match[1] : invoiceNumber}`;
}

/** Returns the invoice's payment-page token, creating one the first time it's needed. */
export async function ensurePayToken(invoiceId: string): Promise<string> {
  const invoice = await db().invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { payToken: true } });
  if (invoice.payToken) {
    return invoice.payToken;
  }
  const payToken = randomBytes(24).toString("base64url");
  await db().invoice.update({ where: { id: invoiceId }, data: { payToken } });
  return payToken;
}

export function invoiceTotal(invoice: { items: InvoiceLine[]; vatRate: Parameters<typeof invoiceTotals>[1]; discount: Parameters<typeof invoiceTotals>[2] }): number {
  return invoiceTotals(invoice.items, invoice.vatRate, invoice.discount).total;
}

export function channelLabel(channel: string | null): string {
  if (!channel) {
    return "";
  }
  const labels: Record<string, string> = { card: "Card", bank: "Bank", bank_transfer: "Bank transfer", banktransfer: "Bank transfer", ussd: "USSD", mobile_money: "Mobile money", mobilemoneyghana: "Mobile money", account: "Bank account", qr: "QR" };
  return labels[channel.toLowerCase()] ?? channel.replace(/[_-]/g, " ");
}
