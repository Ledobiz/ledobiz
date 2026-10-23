import "server-only";
import { randomBytes } from "node:crypto";
import { money } from "@/lib/admin/format";
import { db } from "@/lib/server/db";
import { sendPaymentFailed, sendReceiptEmail, sendTransferPending, sendWelcome } from "@/lib/server/client-emails";
import { notifyTeam } from "@/lib/server/mailer";
import { createCheckout, type OnlineProvider, providerNames, ProviderError, verifyTransaction, type VerifiedTransaction } from "@/lib/server/payment-providers";
import { getSettings } from "@/lib/server/settings";
import { appUrl, channelLabel, invoiceTotal } from "@/lib/server/invoice-links";
import type { Attachment } from "@/lib/server/rich-email";

export { appUrl, channelLabel, ensurePayToken, invoiceTotal, paymentLink, receiptNumber } from "@/lib/server/invoice-links";

function newReference(): string {
  return `LDZ-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export type StartResult = { ok: true; url: string } | { ok: false; error: string };

/** Creates a pending payment and returns the provider's hosted checkout URL. */
export async function startOnlinePayment(token: string, provider: OnlineProvider, receiptEmail: string): Promise<StartResult> {
  const invoice = await db().invoice.findUnique({ where: { payToken: token }, include: { items: true, client: { include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } } } } });
  if (!invoice || invoice.status !== "SENT") {
    return { ok: false, error: invoice?.status === "PAID" ? "This invoice is already paid." : "This invoice can’t be paid online." };
  }
  const amount = invoiceTotal(invoice);
  const reference = newReference();
  await db().payment.create({ data: { invoiceId: invoice.id, provider, reference, amount, currency: invoice.currency, receiptEmail } });
  try {
    const url = await createCheckout(provider, {
      reference,
      amount,
      currency: invoice.currency,
      email: receiptEmail,
      name: invoice.client.contacts[0]?.name ?? invoice.client.company,
      description: `Invoice ${invoice.number}`,
      returnUrl: `${appUrl()}/api/payments/callback?provider=${provider.toLowerCase()}&ref=${encodeURIComponent(reference)}`,
      logoUrl: `${appUrl()}/icon.svg`,
    });
    return { ok: true, url };
  } catch (cause) {
    console.error(`${providerNames[provider]} checkout failed`, cause);
    await db().payment.update({ where: { reference }, data: { status: "FAILED", failureReason: "We couldn’t open the checkout." } });
    return { ok: false, error: `We couldn’t open ${providerNames[provider]} just now. Please try again, or choose another way to pay.` };
  }
}

/**
 * Asks the provider what happened to a payment and records it. Safe to call many times
 * (redirect, webhook, page refresh): the invoice is only marked paid and the receipt only sent once.
 */
export async function confirmPayment(reference: string): Promise<{ status: "SUCCESS" | "PENDING" | "FAILED"; token: string | null }> {
  const payment = await db().payment.findUnique({ where: { reference }, include: { invoice: { select: { payToken: true } } } });
  if (!payment || payment.provider === "BANK_TRANSFER") {
    return { status: "FAILED", token: payment?.invoice.payToken ?? null };
  }
  if (payment.status === "SUCCESS") {
    return { status: "SUCCESS", token: payment.invoice.payToken };
  }

  let result: VerifiedTransaction;
  try {
    result = await verifyTransaction(payment.provider, reference);
  } catch (cause) {
    // The provider may not know the transaction yet (e.g. the client closed the checkout early).
    if (!(cause instanceof ProviderError)) {
      console.error("Payment verification failed", cause);
    }
    return { status: payment.status === "FAILED" ? "FAILED" : "PENDING", token: payment.invoice.payToken };
  }

  if (result.status === "SUCCESS" && (result.currency !== payment.currency || result.amount + 0.005 < Number(payment.amount))) {
    console.error(`Payment ${reference} amount mismatch: expected ${payment.amount} ${payment.currency}, got ${result.amount} ${result.currency}`);
    await db().payment.update({ where: { reference }, data: { status: "FAILED", failureReason: "The amount paid didn’t match the invoice. Please contact us.", providerTransactionId: result.providerTransactionId } });
    await notifyTeam((await getSettings()).quoteNotifyEmails, `Payment ${reference} needs checking`, `The provider reported ${result.amount} ${result.currency} for a payment of ${payment.amount} ${payment.currency}. Check it in ${providerNames[payment.provider]} before marking the invoice paid.`).catch(() => undefined);
    return { status: "FAILED", token: payment.invoice.payToken };
  }

  const updated = await db().payment.updateMany({
    where: { reference, status: { not: result.status } },
    data: { status: result.status, providerTransactionId: result.providerTransactionId, channel: result.channel, cardLast4: result.cardLast4, paidAt: result.paidAt, failureReason: result.failureReason },
  });
  // Tell the client once when their bank declined (not when they simply closed the checkout).
  if (result.status === "FAILED" && result.declined && updated.count === 1) {
    await sendPaymentFailed(payment.id).catch((cause: unknown) => console.error("Payment failed email failed", cause));
  }
  if (result.status === "SUCCESS") {
    await settleInvoice(payment.invoiceId, {
      paidAt: result.paidAt ?? new Date(),
      method: `${providerNames[payment.provider]}${result.channel ? ` · ${channelLabel(result.channel)}` : ""}`,
      reference,
      receiptEmail: payment.receiptEmail,
    });
  }
  return { status: result.status, token: payment.invoice.payToken };
}


/** The first payment on a project is the deposit: welcome the client, once, if that's switched on. */
async function maybeSendWelcome(projectId: string, userId: string | null): Promise<void> {
  const settings = await getSettings();
  if (!settings.autoWelcome) {
    return;
  }
  const [paidCount, welcomed] = await Promise.all([
    db().invoice.count({ where: { projectId, status: "PAID" } }),
    db().email.count({ where: { projectId, category: "WELCOME", status: { in: ["SENT", "NOT_SENT"] } } }),
  ]);
  if (paidCount === 1 && welcomed === 0) {
    await sendWelcome(projectId, userId).catch((cause: unknown) => console.error("Welcome email failed", cause));
  }
}

/** Marks an invoice paid once and emails the receipt. Returns false if it was already paid. */
export async function settleInvoice(invoiceId: string, payment: { paidAt: Date; method: string; reference: string | null; receiptEmail?: string | null; userId?: string | null; sendReceipt?: boolean; attachPdf?: boolean; attachments?: Attachment[] }): Promise<boolean> {
  const flipped = await db().invoice.updateMany({
    where: { id: invoiceId, status: { not: "PAID" } },
    data: { status: "PAID", paidAt: payment.paidAt, paymentMethod: payment.method, paymentReference: payment.reference },
  });
  if (flipped.count === 0) {
    return false;
  }
  const invoice = await db().invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { projectId: true, number: true } });
  if (invoice.projectId) {
    await db().activity.create({ data: { projectId: invoice.projectId, userId: payment.userId ?? null, message: `Invoice ${invoice.number} paid${payment.userId ? "" : ` online (${payment.method})`}` } });
  }
  if (payment.sendReceipt !== false) {
    await sendReceiptEmail(invoiceId, payment.receiptEmail ?? null, payment.userId ?? null, payment.attachPdf, payment.attachments).catch((cause: unknown) => console.error("Receipt email failed", cause));
  }
  if (invoice.projectId) {
    await maybeSendWelcome(invoice.projectId, payment.userId ?? null);
  }
  if (!payment.userId) {
    const settings = await getSettings();
    await notifyTeam(settings.quoteNotifyEmails, `Invoice ${invoice.number} paid online`, `Paid by ${payment.method}, reference ${payment.reference}.\n\n${appUrl()}/admin/finances/invoices/${invoiceId}`).catch(() => undefined);
  }
  return true;
}

/** The client says they paid by transfer to our account; the finance team confirms it in the dashboard. */
export async function recordBankTransferClaim(token: string, receiptEmail: string): Promise<boolean> {
  const invoice = await db().invoice.findUnique({ where: { payToken: token }, include: { items: true, client: { select: { company: true } } } });
  if (!invoice || invoice.status !== "SENT") {
    return false;
  }
  const existing = await db().payment.findFirst({ where: { invoiceId: invoice.id, provider: "BANK_TRANSFER", status: "PENDING" } });
  if (!existing) {
    const claim = await db().payment.create({ data: { invoiceId: invoice.id, provider: "BANK_TRANSFER", reference: newReference(), amount: invoiceTotal(invoice), currency: invoice.currency, receiptEmail } });
    await sendTransferPending(claim.id).catch((cause: unknown) => console.error("Transfer pending email failed", cause));
    const settings = await getSettings();
    await notifyTeam(
      settings.quoteNotifyEmails,
      `${invoice.client.company} says they paid ${invoice.number} by bank transfer`,
      `Check the bank account for ${money(invoiceTotal(invoice), invoice.currency, { decimals: true })} with reference ${invoice.number}, then mark the invoice paid:\n\n${appUrl()}/admin/finances/invoices/${invoice.id}\n\nReceipt email: ${receiptEmail}`,
    ).catch(() => undefined);
  }
  return true;
}
