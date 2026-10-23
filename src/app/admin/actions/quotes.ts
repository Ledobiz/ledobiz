"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { projectTypeLabel } from "@/components/admin/status";
import { AiNotConfiguredError, draftEmail, type EmailDraft } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { sendAndRecord } from "@/lib/server/mailer";
import { getSettings } from "@/lib/server/settings";
import { readAttachments, richBodySchema } from "@/lib/server/rich-email";

export type DraftResult = { ok: true; draft: EmailDraft } | { ok: false; error: string };

const draftInput = z.object({
  tone: z.enum(["Friendly", "Professional", "Concise"]),
  length: z.enum(["short", "normal", "long"]).default("normal"),
  estimateFrom: z.string().max(40).default(""),
  estimateTo: z.string().max(40).default(""),
  timeline: z.string().max(80).default(""),
  nextStep: z.string().max(120).default(""),
  similarProject: z.string().max(200).default(""),
  includeCalendar: z.boolean().default(true),
  extra: z.string().max(1000).default(""),
});

export async function generateQuoteReply(quoteId: string, raw: z.input<typeof draftInput>): Promise<DraftResult> {
  const user = await requireUser("quotes");
  const input = draftInput.safeParse(raw);
  if (!input.success) {
    return { ok: false, error: "Some of the inputs aren’t valid. Check the estimate and timeline." };
  }
  const quote = await db().quoteRequest.findUnique({ where: { id: quoteId } });
  if (!quote) {
    return { ok: false, error: "This quote no longer exists." };
  }
  const { data } = input;
  const { bookingUrl } = await getSettings();
  const facts = [
    `Recipient: ${quote.name}${quote.company ? ` of ${quote.company}` : ""}. Reference ${quote.reference}.`,
    `They asked for: ${projectTypeLabel[quote.projectType] ?? quote.projectType}.`,
    `Their budget: ${quote.budget}${quote.budget.startsWith("Not sure") ? "" : ` (${quote.currency})`}. Their launch timeline: ${quote.timeline}.`,
    quote.features.length ? `Features they picked: ${quote.features.join(", ")}.` : "They didn't pick specific features.",
    data.estimateFrom || data.estimateTo ? `Our estimate: ${[data.estimateFrom, data.estimateTo].filter(Boolean).join(" – ")} (${quote.currency}).` : "Do not state a price; say we will confirm cost after a short call.",
    data.timeline ? `Our proposed timeline: ${data.timeline}.` : "",
    data.nextStep ? `Next step to ask for: ${data.nextStep}.` : "",
    data.similarProject ? `Mention this similar past project: ${data.similarProject}.` : "",
    data.includeCalendar ? (bookingUrl ? `Include this booking link for a call: ${bookingUrl}` : "Include a booking link as the placeholder [CALENDAR LINK].") : "",
    data.extra ? `Extra notes from our team: ${data.extra}` : "",
  ].filter(Boolean);

  try {
    const draft = await draftEmail({
      purpose: "Reply to a website quote request with an initial estimate and a clear next step.",
      facts,
      clientText: quote.details ?? undefined,
      tone: data.tone,
      length: data.length,
      signer: user.name.split(/\s+/)[0],
    });
    if (!draft.subject) {
      draft.subject = `Your ${(projectTypeLabel[quote.projectType] ?? "project").toLowerCase()} quote from Ledobiz · ${quote.reference}`;
    }
    return { ok: true, draft };
  } catch (cause) {
    if (cause instanceof AiNotConfiguredError) {
      return { ok: false, error: cause.message };
    }
    console.error("AI quote draft failed", cause);
    return { ok: false, error: "The AI couldn’t write a draft just now. Try again, or write the reply yourself." };
  }
}

const sendInput = z.object({
  subject: z.string().trim().min(3, "Add a subject.").max(200),
  body: richBodySchema(20, "The message is too short."),
  aiAssisted: z.boolean(),
});

export type SendResult = { ok: true; status: string; warning?: string } | { ok: false; error: string };

export async function sendQuoteReply(quoteId: string, raw: z.input<typeof sendInput>, files?: FormData): Promise<SendResult> {
  const user = await requireUser("quotes");
  const parsed = sendInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the email and try again." };
  }
  const upload = await readAttachments(files);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }
  const quote = await db().quoteRequest.findUnique({ where: { id: quoteId } });
  if (!quote) {
    return { ok: false, error: "This quote no longer exists." };
  }

  const clientId = quote.clientId ?? (await findOrCreateClient(quote));
  const result = await sendAndRecord({
    to: quote.email,
    subject: parsed.data.subject,
    html: parsed.data.body,
    attachments: upload.attachments,
    category: "QUOTE_REPLY",
    reference: quote.reference,
    aiAssisted: parsed.data.aiAssisted,
    sentById: user.id,
    clientId,
    quoteId: quote.id,
  });

  if (result.status === "FAILED") {
    return { ok: false, error: `The email server rejected the message: ${result.error ?? "unknown error"}. It’s saved in the history as failed.` };
  }

  await db().$transaction([
    db().quoteRequest.update({
      where: { id: quote.id },
      data: { clientId, status: quote.status === "NEW" ? "REPLIED" : quote.status, repliedAt: quote.repliedAt ?? new Date() },
    }),
    db().activity.create({ data: { quoteId: quote.id, userId: user.id, message: result.status === "SENT" ? "Reply sent" : "Reply saved (email sending not configured)" } }),
  ]);
  revalidatePath(`/admin/quotes/${quote.id}`);
  revalidatePath("/admin/quotes");
  return { ok: true, status: result.status, warning: result.status === "NOT_SENT" ? result.error : undefined };
}

async function findOrCreateClient(quote: { email: string; name: string; company: string | null; phone: string | null }): Promise<string> {
  const contact = await db().clientContact.findFirst({ where: { email: quote.email }, select: { clientId: true } });
  if (contact) {
    return contact.clientId;
  }
  const client = await db().client.create({
    data: {
      company: quote.company?.trim() || quote.name,
      contacts: { create: { name: quote.name, email: quote.email, phone: quote.phone, isPrimary: true, receivesInvoices: true } },
    },
    select: { id: true },
  });
  return client.id;
}

export async function setQuoteStatus(quoteId: string, formData: FormData): Promise<void> {
  const user = await requireUser("quotes");
  const status = String(formData.get("status")) as QuoteStatus;
  if (!["NEW", "REPLIED", "WON", "LOST"].includes(status)) {
    return;
  }
  const quote = await db().quoteRequest.update({ where: { id: quoteId }, data: { status } });
  await db().activity.create({ data: { quoteId, userId: user.id, message: `Marked as ${status.toLowerCase()}` } });
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  if (status === "WON") {
    const clientId = quote.clientId ?? (await findOrCreateClient(quote));
    if (!quote.clientId) {
      await db().quoteRequest.update({ where: { id: quoteId }, data: { clientId } });
    }
    redirect(`/admin/projects/new?quote=${quoteId}`);
  }
}

export async function saveQuoteNotes(quoteId: string, formData: FormData): Promise<void> {
  await requireUser("quotes");
  const notes = String(formData.get("notes") ?? "").slice(0, 5000);
  await db().quoteRequest.update({ where: { id: quoteId }, data: { internalNotes: notes || null } });
  revalidatePath(`/admin/quotes/${quoteId}`);
}
