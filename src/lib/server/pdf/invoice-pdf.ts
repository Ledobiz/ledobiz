import "server-only";
import { db } from "@/lib/server/db";
import { channelLabel, receiptNumber } from "@/lib/server/invoice-links";
import { providerNames } from "@/lib/server/payment-providers";
import { buildInvoicePdf, type PdfKind } from "@/lib/server/pdf/invoice-pdf-document";
import { getSettings } from "@/lib/server/settings";

export type { PdfKind };

/** Loads an invoice and renders its invoice or receipt PDF. */
export async function renderInvoicePdf(invoiceId: string, kind: PdfKind): Promise<{ filename: string; content: Buffer }> {
  const [invoice, settings, payment] = await Promise.all([
    db().invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { items: { orderBy: { position: "asc" } }, client: { include: { contacts: { orderBy: { isPrimary: "desc" } } } }, project: { select: { name: true } } },
    }),
    getSettings(),
    kind === "receipt" ? db().payment.findFirst({ where: { invoiceId, status: "SUCCESS" }, orderBy: { paidAt: "desc" } }) : null,
  ]);
  const contact = invoice.client.contacts.find((item) => item.receivesInvoices) ?? invoice.client.contacts[0] ?? null;
  const paidWith =
    payment && payment.provider !== "BANK_TRANSFER"
      ? `${payment.cardLast4 ? `Card ending ${payment.cardLast4}` : channelLabel(payment.channel) || "Online"}, via ${providerNames[payment.provider]}`
      : invoice.paymentMethod;
  return buildInvoicePdf({
    kind,
    docNumber: kind === "receipt" ? receiptNumber(invoice.number) : invoice.number,
    invoice,
    contact: contact ? { name: contact.name, email: contact.email } : null,
    paidWith,
    company: settings,
  });
}
