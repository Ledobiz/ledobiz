"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { sendAndRecord } from "@/lib/server/mailer";
import { isProviderConfigured } from "@/lib/server/payment-providers";
import { settleInvoice } from "@/lib/server/payments";
import { defaultInvoiceMessage, invoiceEmailContent } from "@/lib/server/client-emails";
import { readAttachments, type Attachment } from "@/lib/server/rich-email";
import { getSettings } from "@/lib/server/settings";
import { isBlankHtml, textToHtml } from "@/lib/rich-text";

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceResult = { ok: false; error: string; fieldErrors?: Record<string, string> };

const itemSchema = z.object({
  description: z.string().trim().min(2, "Describe each line.").max(300),
  quantity: z.coerce.number().positive("Quantity must be above zero.").max(100_000),
  rate: z.coerce.number().min(0, "Rates can’t be negative."),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Choose a client."),
  projectId: z.string().default(""),
  milestoneId: z.string().default(""),
  currency: z.string().length(3),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the issue date."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the due date."),
  vatRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0),
  notes: z.string().max(2000).default(""),
  items: z.array(itemSchema).min(1, "Add at least one line."),
  send: z.boolean().default(false),
  message: z.string().max(5000).default(""),
});

async function nextInvoiceNumber(prefix: string, year: number): Promise<string> {
  const stem = `${prefix}${year}-`;
  const last = await db().invoice.findFirst({ where: { number: { startsWith: stem } }, orderBy: { number: "desc" }, select: { number: true } });
  const sequence = last ? Number(last.number.slice(stem.length)) + 1 : 1;
  return `${stem}${String(Number.isFinite(sequence) ? sequence : 1).padStart(4, "0")}`;
}

export async function createInvoice(raw: InvoiceInput): Promise<InvoiceResult> {
  const user = await requireUser("finance");
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the invoice.", fieldErrors };
  }
  const data = parsed.data;
  if (data.dueDate < data.issueDate) {
    return { ok: false, error: "The due date can’t be before the issue date.", fieldErrors: { dueDate: "Must be on or after the issue date." } };
  }
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  if (data.discount > subtotal) {
    return { ok: false, error: "The discount is larger than the subtotal.", fieldErrors: { discount: "Too large." } };
  }
  const settings = await getSettings();

  let invoiceId = "";
  for (let attempt = 0; attempt < 3 && !invoiceId; attempt++) {
    try {
      const invoice = await db().invoice.create({
        data: {
          number: await nextInvoiceNumber(settings.invoicePrefix, Number(data.issueDate.slice(0, 4))),
          clientId: data.clientId,
          projectId: data.projectId || null,
          milestoneId: data.milestoneId || null,
          currency: data.currency,
          issueDate: new Date(`${data.issueDate}T00:00:00`),
          dueDate: new Date(`${data.dueDate}T00:00:00`),
          vatRate: data.vatRate,
          discount: data.discount,
          notes: data.notes || null,
          payToken: randomBytes(24).toString("base64url"),
          items: { create: data.items.map((item, index) => ({ ...item, position: index + 1 })) },
        },
      });
      invoiceId = invoice.id;
    } catch (cause) {
      if (!(typeof cause === "object" && cause && "code" in cause && cause.code === "P2002")) {
        throw cause;
      }
    }
  }
  if (!invoiceId) {
    return { ok: false, error: "Couldn’t reserve an invoice number. Try again." };
  }
  if (data.send) {
    const sent = await deliverInvoice(invoiceId, user.id, textToHtml(data.message), undefined, settings.attachInvoicePdf);
    if (!sent.ok) {
      redirect(`/zeus/finances/invoices/${invoiceId}?error=${encodeURIComponent(sent.error)}`);
    }
  }
  revalidatePath("/zeus/finances");
  redirect(`/zeus/finances/invoices/${invoiceId}${data.send ? "?sent=1" : ""}`);
}

/** The default invoice email. The team edits the message; the amount, lines and Pay button are added around it. */
export async function invoiceEmailText(invoiceId: string): Promise<{ subject: string; body: string }> {
  await requireUser("finance");
  const invoice = await db().invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { client: { include: { contacts: true } }, project: { select: { name: true } }, milestone: { select: { name: true } } } });
  const contact = invoice.client.contacts.find((item) => item.receivesInvoices) ?? invoice.client.contacts.find((item) => item.isPrimary) ?? invoice.client.contacts[0];
  const { subject } = await invoiceEmailContent(invoiceId, "", onlinePaymentsOn());
  return { subject, body: defaultInvoiceMessage(contact?.name ?? null, { milestoneName: invoice.milestone?.name ?? null, projectName: invoice.project?.name ?? null }) };
}

function onlinePaymentsOn(): boolean {
  return isProviderConfigured("PAYSTACK") || isProviderConfigured("FLUTTERWAVE");
}

async function deliverInvoice(invoiceId: string, userId: string, messageHtml?: string, customSubject?: string, attachPdf = false, extraAttachments: Attachment[] = []): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  const invoice = await db().invoice.findUnique({ where: { id: invoiceId }, select: { id: true, status: true, clientId: true, projectId: true } });
  if (!invoice) {
    return { ok: false, error: "This invoice no longer exists." };
  }
  if (invoice.status === "VOID" || invoice.status === "PAID") {
    return { ok: false, error: `This invoice is ${invoice.status.toLowerCase()} and can’t be sent.` };
  }
  const message = messageHtml && !isBlankHtml(messageHtml) ? messageHtml : textToHtml((await invoiceEmailText(invoiceId)).body);
  const email = await invoiceEmailContent(invoiceId, message, onlinePaymentsOn(), attachPdf);
  if (!email.to) {
    return { ok: false, error: "This client has no contact email. Add one on the client page first." };
  }
  const result = await sendAndRecord({
    to: email.to,
    cc: email.cc,
    subject: customSubject?.trim() || email.subject,
    content: email.content,
    attachments: [...email.attachments, ...extraAttachments],
    category: "INVOICE",
    fromAccounts: true,
    sentById: userId,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    invoiceId: invoice.id,
  });
  if (result.status === "FAILED") {
    return { ok: false, error: `The email server rejected the invoice: ${result.error ?? "unknown error"}.` };
  }
  await db().invoice.update({ where: { id: invoiceId }, data: { status: "SENT", sentAt: new Date() } });
  const pdfMissing = attachPdf && email.attachments.length === 0 ? "The PDF couldn’t be made, so the invoice was sent without it (the payment page link still works)." : undefined;
  return { ok: true, warning: [result.status === "NOT_SENT" ? result.error : undefined, pdfMissing].filter(Boolean).join(" ") || undefined };
}

export async function sendInvoice(invoiceId: string, raw: { subject: string; body: string; attachPdf?: boolean }, files?: FormData): Promise<{ ok: true; status: string; warning?: string } | { ok: false; error: string }> {
  const user = await requireUser("finance");
  const upload = await readAttachments(files);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }
  const result = await deliverInvoice(invoiceId, user.id, String(raw.body ?? "").slice(0, 100_000), raw.subject, raw.attachPdf === true, upload.attachments);
  revalidatePath(`/zeus/finances/invoices/${invoiceId}`);
  revalidatePath("/zeus/finances");
  return result.ok ? { ok: true, status: result.warning ? "NOT_SENT" : "SENT", warning: result.warning } : result;
}

const paidSchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the payment date."),
  paymentMethod: z.string().trim().min(2).max(60),
  paymentReference: z.string().trim().max(120).default(""),
  sendReceipt: z.boolean(),
  attachReceipt: z.boolean(),
});

export async function markInvoicePaid(invoiceId: string, _previous: { error?: string; ok?: boolean }, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser("finance");
  const parsed = paidSchema.safeParse({
    paidAt: formData.get("paidAt"),
    paymentMethod: formData.get("paymentMethod"),
    paymentReference: formData.get("paymentReference") ?? "",
    sendReceipt: formData.get("sendReceipt") === "on",
    attachReceipt: formData.get("attachReceipt") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the payment details." };
  }
  const upload = await readAttachments(formData);
  if ("error" in upload) {
    return { error: upload.error };
  }
  const claim = await db().payment.findFirst({ where: { invoiceId, provider: "BANK_TRANSFER", status: "PENDING" }, orderBy: { createdAt: "desc" } });
  const paidAt = new Date(`${parsed.data.paidAt}T12:00:00`);
  const settled = await settleInvoice(invoiceId, {
    paidAt,
    method: parsed.data.paymentMethod,
    reference: parsed.data.paymentReference || null,
    receiptEmail: claim?.receiptEmail,
    userId: user.id,
    sendReceipt: parsed.data.sendReceipt,
    attachPdf: parsed.data.attachReceipt,
    attachments: upload.attachments,
  });
  if (!settled) {
    return { error: "This invoice is already marked as paid." };
  }
  if (claim) {
    await db().payment.update({ where: { id: claim.id }, data: { status: "SUCCESS", paidAt } });
  }
  const invoice = await db().invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { projectId: true } });
  if (invoice.projectId) {
    revalidatePath(`/zeus/projects/${invoice.projectId}`);
  }
  revalidatePath(`/zeus/finances/invoices/${invoiceId}`);
  revalidatePath("/zeus/finances");
  return { ok: true };
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  await requireUser("finance");
  await db().invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
  revalidatePath(`/zeus/finances/invoices/${invoiceId}`);
  revalidatePath("/zeus/finances");
}

export async function deleteDraftInvoice(invoiceId: string): Promise<void> {
  await requireUser("finance");
  const invoice = await db().invoice.findUnique({ where: { id: invoiceId }, select: { status: true } });
  if (invoice?.status === "DRAFT") {
    await db().invoice.delete({ where: { id: invoiceId } });
    revalidatePath("/zeus/finances");
    redirect("/zeus/finances");
  }
}
