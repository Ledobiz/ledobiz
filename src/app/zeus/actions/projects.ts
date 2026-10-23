"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formatDate } from "@/lib/admin/format";
import { AiNotConfiguredError, draftEmail, type EmailDraft } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { sendActionNeeded, sendLaunch, sendMilestoneReview, sendWelcome } from "@/lib/server/client-emails";
import { sendAndRecord } from "@/lib/server/mailer";
import { readAttachments, richBodySchema } from "@/lib/server/rich-email";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; warning?: string };

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value ? new Date(`${value}T00:00:00`) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Enter a valid date.");
const money = z
  .string()
  .trim()
  .transform((value) => Number(value.replace(/[,\s]/g, "")))
  .refine((value) => Number.isFinite(value) && value >= 0, "Enter an amount, e.g. 18500000.");

const projectSchema = z.object({
  name: z.string().trim().min(2, "Give the project a name.").max(120),
  clientId: z.string().trim().default(""),
  newCompany: z.string().trim().max(160).default(""),
  newContactName: z.string().trim().max(120).default(""),
  newContactEmail: z.string().trim().max(254).default(""),
  quoteId: z.string().trim().default(""),
  service: z.string().trim().min(2).max(80),
  status: z.enum(["PENDING", "ONGOING", "COMPLETED", "CANCELLED"]),
  stage: z.string().trim().max(80).default(""),
  currency: z.string().trim().length(3),
  contractValue: money,
  expenseBudget: money,
  contractType: z.string().trim().max(60).default("Fixed price"),
  supportTerms: z.string().trim().max(200).default(""),
  techStack: z.string().trim().max(400).default(""),
  startDate: optionalDate,
  deadline: optionalDate,
  freeSupportUntil: optionalDate,
  leadId: z.string().trim().default(""),
  stagingUrl: z.string().trim().max(300).default(""),
  repoUrl: z.string().trim().max(300).default(""),
  designUrl: z.string().trim().max(300).default(""),
  standardMilestones: z.boolean().default(false),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

function readProjectForm(formData: FormData) {
  const get = (key: string) => (typeof formData.get(key) === "string" ? String(formData.get(key)) : "");
  return projectSchema.safeParse({
    name: get("name"),
    clientId: get("clientId"),
    newCompany: get("newCompany"),
    newContactName: get("newContactName"),
    newContactEmail: get("newContactEmail"),
    quoteId: get("quoteId"),
    service: get("service"),
    status: get("status") || "PENDING",
    stage: get("stage"),
    currency: get("currency") || "NGN",
    contractValue: get("contractValue") || "0",
    expenseBudget: get("expenseBudget") || "0",
    contractType: get("contractType") || "Fixed price",
    supportTerms: get("supportTerms"),
    techStack: get("techStack"),
    startDate: get("startDate"),
    deadline: get("deadline"),
    freeSupportUntil: get("freeSupportUntil"),
    leadId: get("leadId"),
    stagingUrl: get("stagingUrl"),
    repoUrl: get("repoUrl"),
    designUrl: get("designUrl"),
    standardMilestones: formData.get("standardMilestones") === "on",
  });
}

const STANDARD_MILESTONES = [
  { name: "Discovery and scope", share: 0.1, payment: 40 },
  { name: "Design", share: 0.2, payment: 20 },
  { name: "Build", share: 0.45, payment: 20 },
  { name: "Testing and sign-off", share: 0.15, payment: null },
  { name: "Launch and handover", share: 0.1, payment: 20 },
];

export async function createProject(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  if (user.role === "MEMBER") {
    return { error: "Your role can’t create projects." };
  }
  const parsed = readProjectForm(formData);
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;

  let clientId = data.clientId;
  if (!clientId) {
    if (!data.newCompany || !data.newContactName || !z.email().safeParse(data.newContactEmail).success) {
      return { error: "Choose a client, or add the new client’s company, contact name and a valid email.", fieldErrors: { clientId: "Choose a client or add a new one." } };
    }
    const client = await db().client.create({
      data: { company: data.newCompany, contacts: { create: { name: data.newContactName, email: data.newContactEmail.toLowerCase(), isPrimary: true, receivesInvoices: true } } },
    });
    clientId = client.id;
  }
  if (data.startDate && data.deadline && data.deadline <= data.startDate) {
    return { error: "The deadline must be after the start date.", fieldErrors: { deadline: "Must be after the start date." } };
  }

  const project = await db().project.create({
    data: {
      name: data.name,
      clientId,
      quoteId: data.quoteId || null,
      service: data.service,
      status: data.status,
      stage: data.stage || null,
      currency: data.currency,
      contractValue: data.contractValue,
      expenseBudget: data.expenseBudget,
      contractType: data.contractType,
      supportTerms: data.supportTerms || null,
      techStack: data.techStack.split(",").map((item) => item.trim()).filter(Boolean),
      startDate: data.startDate,
      deadline: data.deadline,
      leadId: data.leadId || null,
      stagingUrl: data.stagingUrl || null,
      repoUrl: data.repoUrl || null,
      designUrl: data.designUrl || null,
      activities: { create: { userId: user.id, message: "Project created" } },
    },
  });

  if (data.standardMilestones && data.startDate && data.deadline) {
    const span = data.deadline.getTime() - data.startDate.getTime();
    let cursor = data.startDate.getTime();
    await db().milestone.createMany({
      data: STANDARD_MILESTONES.map((milestone, index) => {
        const start = new Date(cursor);
        const end = index === STANDARD_MILESTONES.length - 1 ? data.deadline! : new Date(cursor + span * milestone.share);
        cursor = end.getTime();
        return { projectId: project.id, position: index + 1, name: milestone.name, plannedStart: start, plannedEnd: end, paymentPercent: milestone.payment };
      }),
    });
  }
  if (data.quoteId) {
    await db().quoteRequest.update({ where: { id: data.quoteId }, data: { status: "WON", clientId } }).catch(() => undefined);
  }
  revalidatePath("/zeus/projects");
  redirect(`/zeus/projects/${project.id}`);
}

export async function updateProject(projectId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  if (user.role === "MEMBER") {
    return { error: "Your role can’t edit project details." };
  }
  const parsed = readProjectForm(formData);
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const before = await db().project.findUnique({ where: { id: projectId }, select: { status: true, deadline: true } });
  if (!before) {
    return { error: "This project no longer exists." };
  }
  await db().project.update({
    where: { id: projectId },
    data: {
      name: data.name,
      service: data.service,
      status: data.status,
      stage: data.stage || null,
      currency: data.currency,
      contractValue: data.contractValue,
      expenseBudget: data.expenseBudget,
      contractType: data.contractType,
      supportTerms: data.supportTerms || null,
      techStack: data.techStack.split(",").map((item) => item.trim()).filter(Boolean),
      startDate: data.startDate,
      deadline: data.deadline,
      freeSupportUntil: data.freeSupportUntil,
      leadId: data.leadId || null,
      stagingUrl: data.stagingUrl || null,
      repoUrl: data.repoUrl || null,
      designUrl: data.designUrl || null,
      deliveredAt: data.status === "COMPLETED" && before.status !== "COMPLETED" ? new Date() : undefined,
    },
  });
  const changes: string[] = [];
  if (before.status !== data.status) {
    changes.push(`status to ${data.status.toLowerCase()}`);
  }
  if ((before.deadline?.getTime() ?? 0) !== (data.deadline?.getTime() ?? 0)) {
    changes.push(`deadline to ${formatDate(data.deadline)}`);
  }
  await db().activity.create({ data: { projectId, userId: user.id, message: changes.length ? `Changed ${changes.join(" and ")}` : "Project details updated" } });
  revalidatePath(`/zeus/projects/${projectId}`);
  revalidatePath("/zeus/projects");
  return { ok: true };
}

const milestoneSchema = z.object({
  name: z.string().trim().min(2, "Name the milestone.").max(120),
  plannedStart: optionalDate.refine((value) => value !== null, "Pick a start date."),
  plannedEnd: optionalDate.refine((value) => value !== null, "Pick an end date."),
  paymentPercent: z.string().trim().default("").transform((value) => (value ? Math.round(Number(value)) : null)),
});

export async function addMilestone(projectId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  const parsed = milestoneSchema.safeParse({
    name: formData.get("name") ?? "",
    plannedStart: formData.get("plannedStart") ?? "",
    plannedEnd: formData.get("plannedEnd") ?? "",
    paymentPercent: formData.get("paymentPercent") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the milestone details." };
  }
  const { name, plannedStart, plannedEnd, paymentPercent } = parsed.data;
  if (plannedEnd! < plannedStart!) {
    return { error: "The end date must be after the start date." };
  }
  const last = await db().milestone.findFirst({ where: { projectId }, orderBy: { position: "desc" }, select: { position: true } });
  await db().milestone.create({ data: { projectId, name, plannedStart: plannedStart!, plannedEnd: plannedEnd!, paymentPercent, position: (last?.position ?? 0) + 1 } });
  await db().activity.create({ data: { projectId, userId: user.id, message: `Added milestone “${name}”` } });
  revalidatePath(`/zeus/projects/${projectId}`);
  return { ok: true };
}

const milestoneUpdateSchema = z.object({
  status: z.enum(["PENDING", "ONGOING", "COMPLETED"]),
  progress: z.coerce.number().int().min(0).max(100),
  forecastEnd: optionalDate,
  blocker: z.string().trim().max(500).default(""),
  ownerId: z.string().trim().default(""),
});

export async function updateMilestone(milestoneId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  const parsed = milestoneUpdateSchema.safeParse({
    status: formData.get("status"),
    progress: formData.get("progress") ?? 0,
    forecastEnd: formData.get("forecastEnd") ?? "",
    blocker: formData.get("blocker") ?? "",
    ownerId: formData.get("ownerId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the milestone details." };
  }
  const before = await db().milestone.findUnique({ where: { id: milestoneId }, select: { projectId: true, status: true, name: true } });
  if (!before) {
    return { error: "This milestone no longer exists." };
  }
  const { status, progress, forecastEnd, blocker, ownerId } = parsed.data;
  await db().milestone.update({
    where: { id: milestoneId },
    data: {
      status,
      progress: status === "COMPLETED" ? 100 : progress,
      forecastEnd,
      blocker: blocker || null,
      ownerId: ownerId || null,
      completedAt: status === "COMPLETED" ? (before.status === "COMPLETED" ? undefined : new Date()) : null,
    },
  });
  if (before.status !== status) {
    await db().activity.create({ data: { projectId: before.projectId, userId: user.id, message: `“${before.name}” marked as ${status.toLowerCase()}` } });
  }
  revalidatePath(`/zeus/projects/${before.projectId}`);
  return { ok: true };
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const user = await requireUser("projects");
  if (user.role === "MEMBER") {
    return;
  }
  const milestone = await db().milestone.delete({ where: { id: milestoneId }, select: { projectId: true, name: true } });
  await db().activity.create({ data: { projectId: milestone.projectId, userId: user.id, message: `Removed milestone “${milestone.name}”` } });
  revalidatePath(`/zeus/projects/${milestone.projectId}`);
}

const expenseSchema = z.object({
  description: z.string().trim().min(2, "Describe the expense.").max(200),
  category: z.string().trim().min(2).max(60),
  amount: money.refine((value) => value > 0, "Enter an amount above zero."),
  currency: z.string().trim().length(3),
  spentOn: optionalDate.refine((value) => value !== null, "Pick a date."),
});

export async function addExpense(projectId: string | null, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(projectId ? "projects" : "finance");
  if (user.role === "MEMBER") {
    return { error: "Your role can’t record expenses." };
  }
  const parsed = expenseSchema.safeParse({
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? "",
    currency: formData.get("currency") ?? "NGN",
    spentOn: formData.get("spentOn") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the expense details." };
  }
  await db().expense.create({ data: { ...parsed.data, spentOn: parsed.data.spentOn!, projectId } });
  if (projectId) {
    revalidatePath(`/zeus/projects/${projectId}`);
  }
  revalidatePath("/zeus/finances");
  return { ok: true };
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const user = await requireUser("projects");
  if (user.role === "MEMBER") {
    return;
  }
  const expense = await db().expense.delete({ where: { id: expenseId }, select: { projectId: true } });
  if (expense.projectId) {
    revalidatePath(`/zeus/projects/${expense.projectId}`);
  }
  revalidatePath("/zeus/finances");
}

// ── Deadline emails ─────────────────────────────────────────────────────────

export type DelayKind = "extension" | "miss" | "warning";

const delaySchema = z.object({
  kind: z.enum(["extension", "miss", "warning"]),
  newDate: z.string().trim().default(""),
  reasons: z.array(z.string().max(200)).max(10),
  offers: z.array(z.string().max(200)).max(10),
  extra: z.string().max(1000).default(""),
  tone: z.enum(["Reassuring", "Formal", "Direct"]),
  length: z.enum(["short", "normal", "long"]).default("normal"),
});

export async function generateDelayEmail(projectId: string, raw: z.input<typeof delaySchema>): Promise<{ ok: true; draft: EmailDraft } | { ok: false; error: string }> {
  const user = await requireUser("projects");
  const parsed = delaySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Check the dates and reasons." };
  }
  const project = await db().project.findUnique({
    where: { id: projectId },
    include: { client: { include: { contacts: true } }, milestones: { orderBy: { position: "asc" } } },
  });
  if (!project) {
    return { ok: false, error: "This project no longer exists." };
  }
  const contact = project.client.contacts.find((item) => item.isPrimary) ?? project.client.contacts[0];
  const data = parsed.data;
  const done = project.milestones.filter((m) => m.status === "COMPLETED").map((m) => m.name);
  const blocked = project.milestones.filter((m) => m.blocker).map((m) => `${m.name}: ${m.blocker}`);
  const purpose = {
    extension: "Ask the client to agree to a new launch date, explaining the reason honestly and what we are doing about it.",
    miss: "Tell the client we will not meet the agreed deadline, explain why honestly, and give the new plan.",
    warning: "Give the client an early warning that the deadline is at risk, without committing to a new date yet.",
  }[data.kind];

  try {
    const draft = await draftEmail({
      purpose,
      tone: data.tone,
      length: data.length,
      signer: user.name.split(/\s+/)[0],
      facts: [
        `Recipient: ${contact?.name ?? "the client"} at ${project.client.company}.`,
        `Project: ${project.name} (${project.service}).`,
        `Agreed deadline: ${formatDate(project.deadline)}.`,
        data.kind !== "warning" && data.newDate ? `New proposed date: ${formatDate(new Date(`${data.newDate}T00:00:00`))}.` : "No new date yet.",
        done.length ? `Completed so far: ${done.join(", ")}.` : "",
        blocked.length ? `Logged blockers: ${blocked.join("; ")}.` : "",
        data.reasons.length ? `Reasons: ${data.reasons.join("; ")}.` : "",
        data.offers.length ? `What we are offering: ${data.offers.join("; ")}.` : "",
        data.extra ? `Extra context from our team: ${data.extra}` : "",
      ].filter(Boolean),
    });
    if (!draft.subject) {
      draft.subject = `${project.name}: update on the launch date`;
    }
    return { ok: true, draft };
  } catch (cause) {
    if (cause instanceof AiNotConfiguredError) {
      return { ok: false, error: cause.message };
    }
    console.error("AI delay draft failed", cause);
    return { ok: false, error: "The AI couldn’t write a draft just now. Try again, or write it yourself." };
  }
}

const sendDelaySchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: richBodySchema(20, "Add a subject and a message before sending."),
  aiAssisted: z.boolean(),
  newDate: z.string().trim().default(""),
  moveDeadline: z.boolean().default(false),
});

export async function sendDelayEmail(projectId: string, raw: z.input<typeof sendDelaySchema>, files?: FormData): Promise<{ ok: true; status: string; warning?: string } | { ok: false; error: string }> {
  const user = await requireUser("projects");
  const parsed = sendDelaySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Add a subject and a message before sending." };
  }
  const upload = await readAttachments(files);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }
  const project = await db().project.findUnique({ where: { id: projectId }, include: { client: { include: { contacts: true } }, lead: { select: { email: true } } } });
  if (!project) {
    return { ok: false, error: "This project no longer exists." };
  }
  const contact = project.client.contacts.find((item) => item.isPrimary) ?? project.client.contacts[0];
  if (!contact) {
    return { ok: false, error: "This client has no contact email. Add one on the client page first." };
  }
  const result = await sendAndRecord({
    to: contact.email,
    cc: project.lead?.email,
    subject: parsed.data.subject,
    html: parsed.data.body,
    attachments: upload.attachments,
    category: "DEADLINE_NOTICE",
    aiAssisted: parsed.data.aiAssisted,
    sentById: user.id,
    clientId: project.clientId,
    projectId: project.id,
    reference: project.name,
  });
  if (result.status === "FAILED") {
    return { ok: false, error: `The email server rejected the message: ${result.error ?? "unknown error"}.` };
  }
  if (parsed.data.moveDeadline && parsed.data.newDate) {
    await db().project.update({ where: { id: projectId }, data: { deadline: new Date(`${parsed.data.newDate}T00:00:00`) } });
  }
  await db().activity.create({
    data: { projectId, userId: user.id, message: `Deadline email sent to ${contact.name}${parsed.data.moveDeadline && parsed.data.newDate ? `; deadline moved to ${formatDate(new Date(`${parsed.data.newDate}T00:00:00`))}` : ""}` },
  });
  revalidatePath(`/zeus/projects/${projectId}`);
  return { ok: true, status: result.status, warning: result.status === "NOT_SENT" ? result.error : undefined };
}

export async function logProjectUpdate(projectId: string, formData: FormData): Promise<void> {
  const user = await requireUser("projects");
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);
  if (message) {
    await db().activity.create({ data: { projectId, userId: user.id, message } });
    revalidatePath(`/zeus/projects/${projectId}`);
  }
}

// ── Team emails to the client ───────────────────────────────────────────────

function emailOutcome(result: Awaited<ReturnType<typeof sendWelcome>>, what: string): FormState {
  if (!result) {
    return { error: "This client has no contact email. Add one on the client page first." };
  }
  if (result.status === "FAILED") {
    return { error: `The email server rejected the ${what}: ${result.error ?? "unknown error"}.` };
  }
  return { ok: true, warning: result.status === "NOT_SENT" ? result.error : undefined };
}

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const dateField = (formData: FormData, key: string) => {
  const value = field(formData, key);
  const date = value ? new Date(`${value}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const urlField = (formData: FormData, key: string) => {
  const value = field(formData, key);
  return value && z.url().safeParse(value).success ? value : "";
};

export async function sendProjectWelcome(projectId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  const upload = await readAttachments(formData);
  if ("error" in upload) {
    return { error: upload.error };
  }
  const result = emailOutcome(await sendWelcome(projectId, user.id, upload.attachments), "welcome email");
  revalidatePath(`/zeus/projects/${projectId}`);
  return result;
}

export async function sendReviewRequest(projectId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  const milestoneId = field(formData, "milestoneId");
  const milestone = await db().milestone.findFirst({ where: { id: milestoneId, projectId }, select: { id: true, name: true } });
  if (!milestone) {
    return { error: "Choose the milestone to review." };
  }
  const upload = await readAttachments(formData);
  if ("error" in upload) {
    return { error: upload.error };
  }
  const checks = field(formData, "checks").split(/\r?\n/).map((line) => line.replace(/^[-•*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 8);
  const result = emailOutcome(
    await sendMilestoneReview(milestone.id, { checks, reviewBy: dateField(formData, "reviewBy"), url: urlField(formData, "url"), note: field(formData, "note").slice(0, 1000), attachments: upload.attachments }, user.id),
    "review request",
  );
  if (result.ok) {
    await db().activity.create({ data: { projectId, userId: user.id, message: `Asked the client to review “${milestone.name}”` } });
    revalidatePath(`/zeus/projects/${projectId}`);
  }
  return result;
}

export async function sendActionRequest(projectId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  const title = field(formData, "title").slice(0, 120);
  const what = field(formData, "what").slice(0, 1500);
  if (title.length < 3 || what.length < 10) {
    return { error: "Add a short title and explain what you need." };
  }
  const upload = await readAttachments(formData);
  if ("error" in upload) {
    return { error: upload.error };
  }
  const items = field(formData, "items")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return rest.length ? { label: label.trim(), value: rest.join(":").trim() } : { label: "Needed", value: line };
    });
  const result = emailOutcome(await sendActionNeeded(projectId, { title, what, items, neededBy: dateField(formData, "neededBy"), risk: field(formData, "risk").slice(0, 500), url: urlField(formData, "url"), attachments: upload.attachments }, user.id), "request");
  if (result.ok) {
    await db().activity.create({ data: { projectId, userId: user.id, message: `Asked the client for: ${title}` } });
    revalidatePath(`/zeus/projects/${projectId}`);
  }
  return result;
}

export async function sendLaunchEmail(projectId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("projects");
  if (user.role === "MEMBER") {
    return { error: "Your role can’t send the launch email." };
  }
  const upload = await readAttachments(formData);
  if ("error" in upload) {
    return { error: upload.error };
  }
  const freeSupportUntil = dateField(formData, "freeSupportUntil");
  const markDelivered = formData.get("markDelivered") === "on";
  const result = emailOutcome(
    await sendLaunch(projectId, { liveUrl: urlField(formData, "liveUrl"), adminLogin: field(formData, "adminLogin").slice(0, 200), freeSupportUntil, notes: field(formData, "notes").slice(0, 1500), attachments: upload.attachments }, user.id),
    "launch email",
  );
  if (result.ok) {
    const project = await db().project.findUniqueOrThrow({ where: { id: projectId }, select: { status: true } });
    await db().project.update({
      where: { id: projectId },
      data: {
        freeSupportUntil,
        ...(markDelivered && project.status !== "COMPLETED" ? { status: "COMPLETED", deliveredAt: new Date() } : {}),
      },
    });
    await db().activity.create({ data: { projectId, userId: user.id, message: `Launch email sent${markDelivered && project.status !== "COMPLETED" ? "; project marked as delivered" : ""}` } });
    revalidatePath(`/zeus/projects/${projectId}`);
    revalidatePath("/zeus/projects");
  }
  return result;
}
