"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EmailCategory } from "@/generated/prisma/enums";
import { formatDate, money } from "@/lib/admin/format";
import { AiNotConfiguredError, draftEmail, type EmailDraft } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { sendAndRecord } from "@/lib/server/mailer";
import { readAttachments, richBodySchema } from "@/lib/server/rich-email";
import type { FormState } from "./projects";

const clientSchema = z.object({
  company: z.string().trim().min(2, "Add the company name.").max(160),
  industry: z.string().trim().max(80).default(""),
  city: z.string().trim().max(80).default(""),
  country: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(2000).default(""),
  supportPlanName: z.string().trim().max(120).default(""),
  supportPlanPrice: z.string().trim().default(""),
  supportPlanUntil: z.string().trim().default(""),
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Add the contact’s name.").max(120),
  role: z.string().trim().max(80).default(""),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z.string().trim().max(40).default(""),
});

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readClient(formData: FormData) {
  return clientSchema.safeParse(Object.fromEntries(["company", "industry", "city", "country", "notes", "supportPlanName", "supportPlanPrice", "supportPlanUntil"].map((key) => [key, text(formData, key)])));
}

function clientData(data: z.output<typeof clientSchema>) {
  const price = Number(data.supportPlanPrice.replace(/[,\s]/g, ""));
  return {
    company: data.company,
    industry: data.industry || null,
    city: data.city || null,
    country: data.country || null,
    notes: data.notes || null,
    supportPlanName: data.supportPlanName || null,
    supportPlanPrice: data.supportPlanPrice && Number.isFinite(price) ? price : null,
    supportPlanUntil: data.supportPlanUntil ? new Date(`${data.supportPlanUntil}T00:00:00`) : null,
  };
}

export async function createClient(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("clients");
  const client = readClient(formData);
  const contact = contactSchema.safeParse({ name: text(formData, "contactName"), role: text(formData, "contactRole"), email: text(formData, "contactEmail"), phone: text(formData, "contactPhone") });
  if (!client.success || !contact.success) {
    return { error: (client.error ?? contact.error)?.issues[0]?.message ?? "Check the details." };
  }
  const created = await db().client.create({
    data: { ...clientData(client.data), contacts: { create: { ...contact.data, role: contact.data.role || null, phone: contact.data.phone || null, isPrimary: true, receivesInvoices: true } } },
  });
  revalidatePath("/zeus/clients");
  redirect(`/zeus/clients/${created.id}`);
}

export async function updateClient(clientId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("clients");
  const client = readClient(formData);
  if (!client.success) {
    return { error: client.error.issues[0]?.message ?? "Check the details." };
  }
  await db().client.update({ where: { id: clientId }, data: clientData(client.data) });
  revalidatePath(`/zeus/clients/${clientId}`);
  revalidatePath("/zeus/clients");
  return { ok: true };
}

export async function addContact(clientId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("clients");
  const contact = contactSchema.safeParse({ name: text(formData, "name"), role: text(formData, "role"), email: text(formData, "email"), phone: text(formData, "phone") });
  if (!contact.success) {
    return { error: contact.error.issues[0]?.message ?? "Check the contact details." };
  }
  const count = await db().clientContact.count({ where: { clientId } });
  await db().clientContact.create({
    data: { clientId, ...contact.data, role: contact.data.role || null, phone: contact.data.phone || null, isPrimary: count === 0, receivesInvoices: formData.get("receivesInvoices") === "on" || count === 0 },
  });
  revalidatePath(`/zeus/clients/${clientId}`);
  return { ok: true };
}

export async function makePrimaryContact(contactId: string): Promise<void> {
  await requireUser("clients");
  const contact = await db().clientContact.findUnique({ where: { id: contactId }, select: { clientId: true } });
  if (!contact) {
    return;
  }
  await db().$transaction([
    db().clientContact.updateMany({ where: { clientId: contact.clientId }, data: { isPrimary: false } }),
    db().clientContact.update({ where: { id: contactId }, data: { isPrimary: true } }),
  ]);
  revalidatePath(`/zeus/clients/${contact.clientId}`);
}

export async function removeContact(contactId: string): Promise<void> {
  await requireUser("clients");
  const contact = await db().clientContact.findUnique({ where: { id: contactId }, select: { clientId: true, isPrimary: true } });
  if (!contact || contact.isPrimary) {
    return;
  }
  await db().clientContact.delete({ where: { id: contactId } });
  revalidatePath(`/zeus/clients/${contact.clientId}`);
}

// ── Correspondence ──────────────────────────────────────────────────────────

const purposes = {
  update: { label: "Project update", category: "PROJECT_UPDATE", text: "Give the client a clear progress update on their project: what is done, what is next, and anything we need from them." },
  followUp: { label: "Follow up on a quote", category: "QUOTE_FOLLOW_UP", text: "Follow up politely on a quote we sent that the client has not answered yet, and make it easy to reply." },
  reminder: { label: "Payment reminder", category: "PAYMENT_REMINDER", text: "Remind the client kindly but clearly about unpaid invoices, with the amounts and due dates, and how to pay." },
  checkIn: { label: "Check-in", category: "GENERAL", text: "Check in with a past or current client to see how things are going and whether they need anything." },
  general: { label: "Something else", category: "GENERAL", text: "Write the email described in the notes from our team." },
} as const satisfies Record<string, { label: string; category: EmailCategory; text: string }>;
export type ClientEmailPurpose = keyof typeof purposes;

const composeSchema = z.object({
  purpose: z.enum(Object.keys(purposes) as [ClientEmailPurpose, ...ClientEmailPurpose[]]),
  contactId: z.string().min(1),
  projectId: z.string().default(""),
  notes: z.string().max(1500).default(""),
  tone: z.enum(["Friendly", "Professional", "Concise"]),
  length: z.enum(["short", "normal", "long"]).default("normal"),
});

export async function generateClientEmail(clientId: string, raw: z.input<typeof composeSchema>): Promise<{ ok: true; draft: EmailDraft } | { ok: false; error: string }> {
  const user = await requireUser("clients");
  const parsed = composeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Pick who the email is for." };
  }
  const data = parsed.data;
  const client = await db().client.findUnique({
    where: { id: clientId },
    include: {
      contacts: true,
      projects: { where: data.projectId ? { id: data.projectId } : { status: { in: ["ONGOING", "PENDING"] } }, include: { milestones: { orderBy: { position: "asc" } } }, take: 3 },
      invoices: { where: { status: "SENT" }, include: { items: true } },
      quotes: { where: { status: "REPLIED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const contact = client?.contacts.find((item) => item.id === data.contactId);
  if (!client || !contact) {
    return { ok: false, error: "That contact no longer exists." };
  }

  const facts = [`Recipient: ${contact.name}${contact.role ? `, ${contact.role}` : ""} at ${client.company}.`];
  for (const project of client.projects) {
    const done = project.milestones.filter((m) => m.status === "COMPLETED").map((m) => m.name);
    const current = project.milestones.find((m) => m.status === "ONGOING");
    facts.push(`Project “${project.name}”: ${project.status.toLowerCase()}, deadline ${formatDate(project.deadline)}${done.length ? `; done: ${done.join(", ")}` : ""}${current ? `; in progress: ${current.name} (${current.progress}%)` : ""}.`);
  }
  if (data.purpose === "reminder") {
    for (const invoice of client.invoices) {
      const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0) - Number(invoice.discount);
      const total = subtotal + (subtotal * Number(invoice.vatRate)) / 100;
      facts.push(`Unpaid invoice ${invoice.number}: ${money(total, invoice.currency)}, due ${formatDate(invoice.dueDate)}.`);
    }
  }
  if (data.purpose === "followUp" && client.quotes[0]) {
    facts.push(`Quote ${client.quotes[0].reference} for a ${client.quotes[0].projectType} project, replied on ${formatDate(client.quotes[0].repliedAt)}.`);
  }
  if (data.notes) {
    facts.push(`Notes from our team: ${data.notes}`);
  }

  try {
    const draft = await draftEmail({ purpose: purposes[data.purpose].text, facts, tone: data.tone, length: data.length, signer: user.name.split(/\s+/)[0] });
    return { ok: true, draft };
  } catch (cause) {
    if (cause instanceof AiNotConfiguredError) {
      return { ok: false, error: cause.message };
    }
    console.error("AI client email failed", cause);
    return { ok: false, error: "The AI couldn’t write a draft just now. Try again, or write it yourself." };
  }
}

const sendSchema = z.object({
  purpose: z.enum(Object.keys(purposes) as [ClientEmailPurpose, ...ClientEmailPurpose[]]),
  contactId: z.string().min(1),
  projectId: z.string().default(""),
  subject: z.string().trim().min(3).max(200),
  body: richBodySchema(10, "Add a subject and a message before sending."),
  aiAssisted: z.boolean(),
});

export async function sendClientEmail(clientId: string, raw: z.input<typeof sendSchema>, files?: FormData): Promise<{ ok: true; status: string; warning?: string } | { ok: false; error: string }> {
  const user = await requireUser("clients");
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Add a subject and a message before sending." };
  }
  const upload = await readAttachments(files);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }
  const contact = await db().clientContact.findFirst({ where: { id: parsed.data.contactId, clientId } });
  if (!contact) {
    return { ok: false, error: "That contact no longer exists." };
  }
  const result = await sendAndRecord({
    to: contact.email,
    subject: parsed.data.subject,
    html: parsed.data.body,
    attachments: upload.attachments,
    category: purposes[parsed.data.purpose].category,
    fromAccounts: parsed.data.purpose === "reminder",
    aiAssisted: parsed.data.aiAssisted,
    sentById: user.id,
    clientId,
    projectId: parsed.data.projectId || undefined,
  });
  if (result.status === "FAILED") {
    return { ok: false, error: `The email server rejected the message: ${result.error ?? "unknown error"}.` };
  }
  revalidatePath(`/zeus/clients/${clientId}`);
  return { ok: true, status: result.status, warning: result.status === "NOT_SENT" ? result.error : undefined };
}

const receivedSchema = z.object({
  fromAddress: z.email("Enter the sender’s email.").trim(),
  subject: z.string().trim().min(2, "Add the subject.").max(200),
  body: z.string().trim().min(2, "Paste the message.").max(20_000),
  receivedAt: z.string().trim().default(""),
});

export async function logReceivedEmail(clientId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("clients");
  const parsed = receivedSchema.safeParse({ fromAddress: text(formData, "fromAddress"), subject: text(formData, "subject"), body: text(formData, "body"), receivedAt: text(formData, "receivedAt") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the email details." };
  }
  await db().email.create({
    data: {
      direction: "INBOUND",
      category: "RECEIVED",
      status: "RECEIVED",
      subject: parsed.data.subject,
      body: parsed.data.body,
      fromAddress: parsed.data.fromAddress,
      toAddress: "",
      clientId,
      createdAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : undefined,
    },
  });
  revalidatePath(`/zeus/clients/${clientId}`);
  return { ok: true };
}

