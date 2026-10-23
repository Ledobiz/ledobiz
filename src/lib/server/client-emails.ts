import "server-only";
import type { Settings } from "@/generated/prisma/client";
import { projectTypeLabel } from "@/components/admin/status";
import { invoiceTotals, projectHealth } from "@/lib/admin/domain";
import { daysBetween, formatDate, formatDateTime, money, num } from "@/lib/admin/format";
import { db } from "@/lib/server/db";
import type { EmailContent } from "@/lib/server/email-layout";
import { type PdfKind, renderInvoicePdf } from "@/lib/server/pdf/invoice-pdf";
import { channelLabel, ensurePayToken, invoiceTotal, paymentLink, receiptNumber } from "@/lib/server/invoice-links";
import { sendAndRecord } from "@/lib/server/mailer";
import { type Attachment, richEmailBody } from "@/lib/server/rich-email";
import { providerNames } from "@/lib/server/payment-providers";
import { getSettings } from "@/lib/server/settings";

/**
 * Every client email from the design's email library, built from live data.
 * Free-text emails (AI drafts, quote replies, deadline notices) are sent from their own actions.
 */

export type SendResult = { id: string; status: "SENT" | "FAILED" | "NOT_SENT" | "RECEIVED"; error?: string } | null;

const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "there";
const personSignature = (settings: Settings, name: string) => settings.signature.replace("{name}", firstName(name));
const accountsSignature = (settings: Settings) => `Thank you,\nAccounts team\n${settings.emailFromName}`;
const shortName = (name: string) => {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};

type ContactLike = { name: string; email: string; isPrimary: boolean; receivesInvoices: boolean };

/** Main contact first, then whoever else should be copied. */
function recipients(contacts: ContactLike[], billing: boolean): { to: ContactLike; cc?: string } | null {
  const ordered = [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const pool = billing ? ordered.filter((contact) => contact.receivesInvoices || contact.isPrimary) : ordered;
  const to = billing ? (pool.find((contact) => contact.receivesInvoices) ?? pool[0]) : pool[0];
  if (!to) {
    return null;
  }
  const cc = billing ? pool.filter((contact) => contact !== to).map((contact) => contact.email).join(", ") : "";
  return { to, cc: cc || undefined };
}

// ── Quotes ──────────────────────────────────────────────────────────────────

export async function sendQuoteConfirmation(quoteId: string): Promise<SendResult> {
  const [quote, settings] = await Promise.all([db().quoteRequest.findUniqueOrThrow({ where: { id: quoteId } }), getSettings()]);
  const type = projectTypeLabel[quote.projectType] ?? quote.projectType;
  const what = quote.projectType === "consult" ? "new project" : type.toLowerCase();
  const content: EmailContent = {
    preheader: `Your personalised proposal will reach you within ${settings.quoteReplyHours} hours.`,
    ref: quote.reference,
    badge: { text: "Request received", tone: "info" },
    heading: `Thanks, ${firstName(quote.name)}. Your request is in.`,
    paragraphs: [`We’ve received your request for a ${what}. A member of our team will review it and email you a personalised proposal within ${settings.quoteReplyHours} hours.`],
    rowsTitle: "What you told us",
    rows: [
      { label: "Reference", value: quote.reference },
      { label: "Project", value: type },
      { label: "Budget", value: quote.budget.startsWith("Not sure") ? quote.budget : `${quote.budget} (${quote.currency})` },
      { label: "Launch", value: quote.timeline },
      ...(quote.features.length ? [{ label: "Features", value: quote.features.join(", ") }] : []),
    ],
    callout: { text: "Want to add something? Just reply to this email. It goes straight to the team handling your request.", tone: "info" },
    signature: settings.emailFromName,
  };
  return sendAndRecord({ to: quote.email, subject: `We’ve received your quote request · ${quote.reference}`, category: "QUOTE_CONFIRMATION", content, quoteId: quote.id, clientId: quote.clientId });
}

export async function sendQuoteFollowUp(quoteId: string): Promise<SendResult> {
  const [quote, settings] = await Promise.all([
    db().quoteRequest.findUniqueOrThrow({ where: { id: quoteId }, include: { emails: { where: { category: "QUOTE_REPLY" }, orderBy: { createdAt: "desc" }, take: 1, include: { sentBy: { select: { name: true, email: true } } } } } }),
    getSettings(),
  ]);
  const sender = quote.emails[0]?.sentBy;
  const type = quote.projectType === "consult" ? "project" : (projectTypeLabel[quote.projectType] ?? "project").toLowerCase();
  const content: EmailContent = {
    preheader: "Happy to walk you through the estimate on a quick call.",
    ref: quote.reference,
    heading: "Any questions about your quote?",
    paragraphs: [`Hi ${firstName(quote.name)},`, `I wanted to check that our estimate for your ${type} reached you. If anything is unclear, or you’d like to adjust the scope or budget, I’m happy to talk it through.`],
    cta: settings.bookingUrl ? { label: "Book a free 30-minute call", url: settings.bookingUrl } : undefined,
    secondary: "Not the right time? Just reply and let us know. We won’t keep chasing.",
    signature: personSignature(settings, sender?.name ?? settings.tradingName),
  };
  return sendAndRecord({
    to: quote.email,
    subject: `Any questions about your ${type} quote?`,
    category: "QUOTE_FOLLOW_UP",
    content,
    fromName: sender ? shortName(sender.name) : undefined,
    replyTo: sender?.email,
    quoteId: quote.id,
    clientId: quote.clientId,
  });
}

// ── Projects ────────────────────────────────────────────────────────────────

async function loadProject(projectId: string) {
  return db().project.findUniqueOrThrow({
    where: { id: projectId },
    include: { client: { include: { contacts: true } }, lead: { select: { id: true, name: true, email: true } }, milestones: { orderBy: { position: "asc" } } },
  });
}

export async function sendWelcome(projectId: string, sentById: string | null, attachments: Attachment[] = []): Promise<SendResult> {
  const [project, settings] = await Promise.all([loadProject(projectId), getSettings()]);
  const to = recipients(project.client.contacts, false);
  if (!to) {
    return null;
  }
  const others = project.client.contacts.filter((contact) => contact.email !== to.to.email).map((contact) => contact.email);
  const first = project.milestones.find((milestone) => milestone.status !== "COMPLETED");
  const sender = project.lead ?? (sentById ? await db().user.findUnique({ where: { id: sentById }, select: { id: true, name: true, email: true } }) : null);
  const content: EmailContent = {
    preheader: "Your project lead, your first steps and how we’ll keep you updated.",
    ref: project.name,
    badge: { text: "Project started", tone: "success" },
    heading: `Welcome aboard, ${firstName(to.to.name)}`,
    paragraphs: [`Thank you for choosing ${settings.tradingName}. We’ve received your deposit and work on ${project.name} is under way.`],
    rowsTitle: "Your project",
    rows: [
      ...(project.lead ? [{ label: "Project lead", value: `${shortName(project.lead.name)} · ${project.lead.email}` }] : []),
      ...(project.startDate ? [{ label: "Started", value: formatDate(project.startDate) }] : []),
      ...(project.deadline ? [{ label: "Target launch", value: formatDate(project.deadline) }] : []),
      { label: "Updates", value: settings.autoWeeklyUpdates ? "A progress email every Friday" : "Regular progress emails from your project lead" },
      ...(first ? [{ label: "First step", value: first.name }] : []),
    ],
    secondary: "Questions at any point? Reply to this email and it goes straight to your project lead.",
    signature: personSignature(settings, sender?.name ?? settings.tradingName),
  };
  return sendAndRecord({
    to: to.to.email,
    cc: others.join(", ") || undefined,
    subject: `Welcome to ${settings.tradingName} · ${project.name} is under way`,
    category: "WELCOME",
    content,
    attachments,
    fromName: sender ? shortName(sender.name) : undefined,
    replyTo: project.lead?.email,
    sentById,
    clientId: project.clientId,
    projectId: project.id,
  });
}

export async function sendWeeklyUpdate(projectId: string): Promise<SendResult | "skipped-behind"> {
  const [project, settings] = await Promise.all([loadProject(projectId), getSettings()]);
  const now = new Date();
  const health = projectHealth(project, project.milestones, now);
  // A slipping project needs a human-written deadline email, not an automatic "all good" update.
  if (health.health === "BEHIND") {
    return "skipped-behind";
  }
  const to = recipients(project.client.contacts, false);
  if (!to) {
    return null;
  }
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const finished = project.milestones.filter((m) => m.completedAt && m.completedAt >= weekAgo).map((m) => m.name);
  const current = project.milestones.filter((m) => m.status === "ONGOING");
  const upcoming = project.milestones.find((m) => m.status === "PENDING");
  const blockers = project.milestones.filter((m) => m.blocker && m.status !== "COMPLETED").map((m) => m.blocker as string);
  const week = project.startDate ? Math.max(1, Math.ceil(daysBetween(project.startDate, now) / 7)) : null;

  const content: EmailContent = {
    preheader: `${health.workPercent}% complete.${blockers.length ? " One thing needs attention." : " On schedule."}`,
    ref: week ? `${project.name} · week ${week}` : project.name,
    heading: `Your ${project.name} this week`,
    paragraphs: [`Hi ${firstName(to.to.name)}, here’s where things stand.`],
    progress: health.workPercent,
    rows: [
      { label: "Done this week", value: finished.length ? finished.join(", ") : current.length ? current.map((m) => `${m.name} (${m.progress}%)`).join(", ") : "Planning and set-up" },
      { label: "Next", value: [...current.map((m) => m.name), upcoming?.name].filter(Boolean).join(", ") || "Final checks before launch" },
      ...(project.deadline ? [{ label: "Launch date", value: formatDate(project.deadline) }] : []),
    ],
    callout: blockers.length ? { text: `One thing is holding us up: ${blockers[0]}`, tone: "warn" } : undefined,
    cta: project.stagingUrl ? { label: "Open the staging site", url: project.stagingUrl } : undefined,
    signature: personSignature(settings, project.lead?.name ?? settings.tradingName),
  };
  return sendAndRecord({
    to: to.to.email,
    subject: `Weekly progress update${week ? ` · week ${week}` : ""} · ${project.name}`,
    category: "PROJECT_UPDATE",
    content,
    fromName: project.lead ? shortName(project.lead.name) : undefined,
    replyTo: project.lead?.email,
    clientId: project.clientId,
    projectId: project.id,
  });
}

export async function sendMilestoneReview(milestoneId: string, input: { checks: string[]; reviewBy: Date | null; url: string; note: string; attachments?: Attachment[] }, sentById: string): Promise<SendResult> {
  const milestone = await db().milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { projectId: true, name: true, position: true } });
  const [project, settings, sender] = await Promise.all([loadProject(milestone.projectId), getSettings(), db().user.findUniqueOrThrow({ where: { id: sentById }, select: { name: true, email: true } })]);
  const to = recipients(project.client.contacts, false);
  if (!to) {
    return null;
  }
  const content: EmailContent = {
    preheader: input.reviewBy ? `Please review and approve by ${formatDate(input.reviewBy)}.` : "Ready for you to test and approve.",
    ref: `Milestone ${milestone.position} of ${project.milestones.length}`,
    badge: { text: "Review needed", tone: "info" },
    heading: `Milestone ${milestone.position} is ready for your review`,
    paragraphs: [`Hi ${firstName(to.to.name)},`, `${milestone.name} is finished and ready for you to test.${input.note ? `\n\n${input.note}` : ""}`],
    rowsTitle: input.checks.length ? "What to check" : undefined,
    rows: input.checks.map((check, index) => ({ label: String(index + 1), value: check })),
    callout: input.reviewBy ? { text: `Please approve or send feedback by ${formatDate(input.reviewBy)} to keep the launch on schedule.`, tone: "info" } : undefined,
    cta: input.url ? { label: "Review it", url: input.url } : undefined,
    secondary: "Found something? Reply with a screenshot and we’ll fix it.",
    signature: personSignature(settings, sender.name),
  };
  return sendAndRecord({
    to: to.to.email,
    subject: `Ready for your review: ${milestone.name}`,
    category: "MILESTONE_REVIEW",
    content,
    attachments: input.attachments,
    fromName: shortName(sender.name),
    replyTo: sender.email,
    sentById,
    clientId: project.clientId,
    projectId: project.id,
  });
}

export async function sendActionNeeded(projectId: string, input: { title: string; what: string; items: { label: string; value: string }[]; neededBy: Date | null; risk: string; url: string; attachments?: Attachment[] }, sentById: string): Promise<SendResult> {
  const [project, settings, sender] = await Promise.all([loadProject(projectId), getSettings(), db().user.findUniqueOrThrow({ where: { id: sentById }, select: { name: true, email: true } })]);
  const to = recipients(project.client.contacts, false);
  if (!to) {
    return null;
  }
  const others = project.client.contacts.filter((contact) => contact.email !== to.to.email).map((contact) => contact.email);
  const content: EmailContent = {
    preheader: input.neededBy ? `We need this by ${formatDate(input.neededBy)}.` : "We need one thing from you to keep going.",
    ref: project.name,
    badge: { text: "Action needed", tone: "warn" },
    heading: "We need one thing from you",
    paragraphs: [`Hi ${firstName(to.to.name)},`, input.what],
    rowsTitle: "What’s needed",
    rows: [...input.items, ...(input.neededBy ? [{ label: "Needed by", value: formatDate(input.neededBy) }] : [])],
    callout: input.risk ? { text: input.risk, tone: "warn" } : undefined,
    cta: input.url ? { label: "See how to do it", url: input.url } : undefined,
    signature: personSignature(settings, sender.name),
  };
  return sendAndRecord({
    to: to.to.email,
    cc: others.join(", ") || undefined,
    subject: `Action needed: ${input.title}`,
    category: "ACTION_NEEDED",
    content,
    attachments: input.attachments,
    fromName: shortName(sender.name),
    replyTo: sender.email,
    sentById,
    clientId: project.clientId,
    projectId: project.id,
  });
}

export async function sendLaunch(projectId: string, input: { liveUrl: string; adminLogin: string; freeSupportUntil: Date | null; notes: string; attachments?: Attachment[] }, sentById: string): Promise<SendResult> {
  const [project, settings, sender] = await Promise.all([loadProject(projectId), getSettings(), db().user.findUniqueOrThrow({ where: { id: sentById }, select: { name: true, email: true } })]);
  const to = recipients(project.client.contacts, false);
  if (!to) {
    return null;
  }
  const others = project.client.contacts.filter((contact) => contact.email !== to.to.email).map((contact) => contact.email);
  const content: EmailContent = {
    preheader: input.freeSupportUntil ? `Your handover details and free fixes until ${formatDate(input.freeSupportUntil)}.` : "Your handover details.",
    ref: project.name,
    badge: { text: "Live", tone: "success" },
    heading: `${project.name} is live`,
    paragraphs: [`Hi ${firstName(to.to.name)},`, `Congratulations. ${project.name} is now live.${input.notes ? `\n\n${input.notes}` : ""}`],
    rowsTitle: "Handover",
    rows: [
      ...(input.liveUrl ? [{ label: "Live at", value: input.liveUrl.replace(/^https?:\/\//, "") }] : []),
      ...(input.adminLogin ? [{ label: "Admin login", value: input.adminLogin }] : []),
      ...(input.freeSupportUntil ? [{ label: "Free fixes until", value: formatDate(input.freeSupportUntil) }] : []),
    ],
    cta: input.liveUrl ? { label: "Open it", url: input.liveUrl } : undefined,
    signature: personSignature(settings, sender.name),
  };
  return sendAndRecord({
    to: to.to.email,
    cc: others.join(", ") || undefined,
    subject: `${project.name} is live`,
    category: "LAUNCH",
    content,
    attachments: input.attachments,
    fromName: shortName(sender.name),
    replyTo: sender.email,
    sentById,
    clientId: project.clientId,
    projectId: project.id,
  });
}

export async function sendFeedbackRequest(projectId: string): Promise<SendResult> {
  const [project, settings] = await Promise.all([loadProject(projectId), getSettings()]);
  const to = recipients(project.client.contacts, false);
  if (!to) {
    return null;
  }
  const weeks = project.deliveredAt ? Math.max(2, Math.round(daysBetween(project.deliveredAt, new Date()) / 7)) : 2;
  const content: EmailContent = {
    preheader: "Two minutes of feedback helps us improve.",
    ref: project.name,
    heading: `How did we do, ${firstName(to.to.name)}?`,
    paragraphs: [`Hi ${firstName(to.to.name)},`, `${project.name} has been live for ${weeks} weeks. We’d really value your honest feedback on working with us.${settings.feedbackUrl ? " It takes about two minutes." : " Just reply to this email with what went well and what we could do better."}`],
    cta: settings.feedbackUrl ? { label: "Share your feedback", url: settings.feedbackUrl } : undefined,
    secondary: settings.feedbackUrl ? "Happy for us to quote you on our website? Let us know in the form. Entirely optional." : undefined,
    signature: personSignature(settings, project.lead?.name ?? settings.tradingName),
  };
  return sendAndRecord({
    to: to.to.email,
    subject: "How did we do?",
    category: "FEEDBACK_REQUEST",
    content,
    fromName: project.lead ? shortName(project.lead.name) : undefined,
    replyTo: project.lead?.email,
    clientId: project.clientId,
    projectId: project.id,
  });
}

/** "free-ended": the project's free fixes just ended. "renewal": the support plan renews within a week. */
export async function sendSupportRenewal(clientId: string, kind: "free-ended" | "renewal", projectId?: string): Promise<SendResult> {
  const [client, settings, project] = await Promise.all([
    db().client.findUniqueOrThrow({ where: { id: clientId }, include: { contacts: true } }),
    getSettings(),
    projectId ? db().project.findUnique({ where: { id: projectId }, select: { id: true, name: true, freeSupportUntil: true } }) : null,
  ]);
  const to = recipients(client.contacts, true);
  if (!to || !client.supportPlanName) {
    return null;
  }
  const renews = client.supportPlanUntil;
  const intro =
    kind === "free-ended" && project?.freeSupportUntil
      ? `Your free fixes for ${project.name} ended on ${formatDate(project.freeSupportUntil)}. Your ${client.supportPlanName} plan keeps it looked after from here${renews ? `, and renews on ${formatDate(renews)}` : ""}.`
      : `Your ${client.supportPlanName} plan renews${renews ? ` on ${formatDate(renews)}` : " soon"}.`;
  const content: EmailContent = {
    preheader: "Monitoring, updates and fixes for your software.",
    ref: "Support plan",
    heading: project ? `Keep ${project.name} looked after` : "Keep your software looked after",
    paragraphs: [`Hello ${firstName(to.to.name)},`, intro],
    rowsTitle: "Your plan",
    rows: [
      { label: "Plan", value: client.supportPlanName },
      ...(client.supportPlanPrice ? [{ label: "Price", value: `${money(client.supportPlanPrice, settings.reportingCurrency)} per month`, style: "bold" as const }] : []),
      ...(renews ? [{ label: "Next renewal", value: formatDate(renews) }] : []),
    ],
    secondary: "Want to change or cancel? Reply to this email.",
    signature: accountsSignature(settings),
  };
  return sendAndRecord({
    to: to.to.email,
    cc: to.cc,
    subject: renews ? `Your support plan renews on ${formatDate(renews)}` : "About your support plan",
    category: "SUPPORT_RENEWAL",
    content,
    fromAccounts: true,
    clientId: client.id,
    projectId: project?.id,
  });
}

// ── Billing ─────────────────────────────────────────────────────────────────

async function loadInvoice(invoiceId: string) {
  return db().invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: { orderBy: { position: "asc" } }, client: { include: { contacts: true } }, project: { select: { name: true } }, milestone: { select: { name: true } } },
  });
}

function invoiceRows(invoice: Awaited<ReturnType<typeof loadInvoice>>): EmailContent["rows"] {
  const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
  return [
    ...invoice.items.map((item) => ({ label: item.description, value: money(num(item.quantity) * num(item.rate), invoice.currency, { decimals: true }) })),
    ...(totals.discount ? [{ label: "Discount", value: `−${money(totals.discount, invoice.currency, { decimals: true })}` }] : []),
    ...(totals.vat ? [{ label: `VAT ${num(invoice.vatRate)}%`, value: money(totals.vat, invoice.currency, { decimals: true }) }] : []),
    { label: "Total due", value: money(totals.total, invoice.currency, { decimals: true }), style: "bold" as const },
  ];
}

function paySecondary(settings: Settings, invoiceNumber: string, online: boolean): string {
  return online
    ? `Card, bank transfer or USSD on our secure payment page${settings.bankDetails ? `. Or transfer to the account on the invoice using ${invoiceNumber} as the reference.` : "."}`
    : `Please use ${invoiceNumber} as your transfer reference.`;
}

/** Builds the PDF to attach. If that fails, the email still goes out with its links. */
async function pdfAttachments(invoiceId: string, kind: PdfKind): Promise<Attachment[]> {
  try {
    return [await renderInvoicePdf(invoiceId, kind)];
  } catch (cause) {
    console.error(`Making the ${kind} PDF failed; sending without it`, cause);
    return [];
  }
}

/** The invoice email: the team's message (editor HTML) on top, then the amount, lines and Pay button. */
export async function invoiceEmailContent(
  invoiceId: string,
  messageHtml: string,
  online: boolean,
  attachPdf = false,
): Promise<{ subject: string; content: EmailContent; cc?: string; to: string | null; attachments: Attachment[] }> {
  const [invoice, settings] = await Promise.all([loadInvoice(invoiceId), getSettings()]);
  const total = invoiceTotal(invoice);
  const to = recipients(invoice.client.contacts, true);
  const token = await ensurePayToken(invoice.id);
  const what = invoice.milestone ? invoice.milestone.name : invoice.project?.name;
  const attachments = attachPdf ? await pdfAttachments(invoice.id, "invoice") : [];
  return {
    to: to?.to.email ?? null,
    cc: to?.cc,
    attachments,
    subject: `Invoice ${invoice.number} · ${money(total, invoice.currency, { decimals: true })} due ${formatDate(invoice.dueDate)}`,
    content: {
      preheader: `${what ? `${what}. ` : ""}Pay online or by bank transfer.`,
      ref: invoice.number,
      heading: `Your invoice from ${settings.tradingName}`,
      amount: { label: "Amount due", value: money(total, invoice.currency, { decimals: true }), note: `Due by ${formatDate(invoice.dueDate)}` },
      bodyHtml: messageHtml ? richEmailBody(messageHtml) : undefined,
      paragraphs: [attachments.length ? "The invoice is attached as a PDF." : "You can view and download the invoice as a PDF from the payment page."],
      rows: invoiceRows(invoice),
      cta: { label: online ? "Pay now" : "View invoice", url: online ? paymentLink(token) : `${paymentLink(token)}/invoice`, accent: online },
      secondary: paySecondary(settings, invoice.number, online),
      after: settings.bankDetails ? [`Bank details:\n${settings.bankDetails}`] : undefined,
      signature: accountsSignature(settings),
    },
  };
}

export function defaultInvoiceMessage(contactName: string | null, invoice: { milestoneName: string | null; projectName: string | null }): string {
  const what = invoice.milestoneName ? `the ${invoice.milestoneName} milestone${invoice.projectName ? ` of ${invoice.projectName}` : ""}` : invoice.projectName ?? "our work";
  return `Hello ${firstName(contactName)},\n\nHere is your invoice for ${what}.`;
}

export async function sendPaymentReminder(invoiceId: string, online: boolean): Promise<SendResult> {
  const [invoice, settings] = await Promise.all([loadInvoice(invoiceId), getSettings()]);
  const to = recipients(invoice.client.contacts, true);
  if (!to) {
    return null;
  }
  const total = money(invoiceTotal(invoice), invoice.currency, { decimals: true });
  const days = Math.max(0, daysBetween(new Date(), invoice.dueDate));
  const token = await ensurePayToken(invoice.id);
  const content: EmailContent = {
    preheader: `${total} due ${days <= 1 ? "tomorrow" : `in ${days} days`}. Pay in a few clicks.`,
    ref: invoice.number,
    heading: "A friendly reminder",
    amount: { label: days <= 1 ? "Due tomorrow" : `Due in ${days} days`, value: total, note: `Invoice ${invoice.number} · due ${formatDate(invoice.dueDate)}` },
    paragraphs: [`Hello ${firstName(to.to.name)},`, `This is a quick reminder that invoice ${invoice.number} is due on ${formatDate(invoice.dueDate)}. If you’ve already paid, thank you, and please ignore this email.`],
    cta: { label: online ? "Pay now" : "View invoice", url: online ? paymentLink(token) : `${paymentLink(token)}/invoice`, accent: online },
    secondary: online ? undefined : paySecondary(settings, invoice.number, false),
    signature: accountsSignature(settings),
  };
  return sendAndRecord({ to: to.to.email, subject: `Reminder: ${invoice.number} is due on ${formatDate(invoice.dueDate)}`, category: "PAYMENT_REMINDER", content, fromAccounts: true, clientId: invoice.clientId, projectId: invoice.projectId, invoiceId: invoice.id });
}

export async function sendOverdueReminder(invoiceId: string, online: boolean, previousReminders: number): Promise<SendResult> {
  const [invoice, settings] = await Promise.all([loadInvoice(invoiceId), getSettings()]);
  const to = recipients(invoice.client.contacts, true);
  if (!to) {
    return null;
  }
  const total = money(invoiceTotal(invoice), invoice.currency, { decimals: true });
  const late = Math.max(1, daysBetween(invoice.dueDate, new Date()));
  const token = await ensurePayToken(invoice.id);
  const content: EmailContent = {
    preheader: `${total} was due on ${formatDate(invoice.dueDate)}.`,
    ref: invoice.number,
    badge: { text: "Overdue", tone: "danger" },
    heading: "Your invoice is overdue",
    amount: { label: `Overdue by ${late} day${late === 1 ? "" : "s"}`, value: total, note: `Was due ${formatDate(invoice.dueDate)}` },
    paragraphs: [`Hello ${firstName(to.to.name)},`, `We haven’t yet received payment for invoice ${invoice.number}. Could you arrange payment this week?`],
    callout: previousReminders >= 2 ? { text: "If something about this invoice is holding up payment, reply and let us know. We’re happy to talk it through or agree a payment plan.", tone: "warn" } : undefined,
    cta: { label: online ? "Pay now" : "View invoice", url: online ? paymentLink(token) : `${paymentLink(token)}/invoice`, accent: online },
    secondary: "Already paid? Reply with your transfer reference and we’ll match it.",
    signature: accountsSignature(settings),
  };
  return sendAndRecord({ to: to.to.email, cc: to.cc, subject: `${invoice.number} is now overdue`, category: "PAYMENT_OVERDUE", content, fromAccounts: true, clientId: invoice.clientId, projectId: invoice.projectId, invoiceId: invoice.id });
}

export async function sendTransferPending(paymentId: string): Promise<SendResult> {
  const payment = await db().payment.findUniqueOrThrow({ where: { id: paymentId } });
  const [invoice, settings] = await Promise.all([loadInvoice(payment.invoiceId), getSettings()]);
  const contact = recipients(invoice.client.contacts, true)?.to;
  const amount = money(payment.amount, payment.currency, { decimals: true });
  const content: EmailContent = {
    preheader: "We’ll confirm within 1 working day.",
    ref: invoice.number,
    badge: { text: "Checking payment", tone: "info" },
    heading: "Thanks. We’re checking your transfer",
    paragraphs: [`Hello ${firstName(contact?.name)},`, `You told us you’ve sent ${amount} by bank transfer for invoice ${invoice.number}. Bank transfers can take a little time to show, so we’ll confirm and send your receipt within 1 working day.`],
    rows: [
      { label: "Invoice", value: invoice.number },
      { label: "Amount", value: amount },
      { label: "Reported", value: formatDateTime(payment.createdAt) },
    ],
    signature: accountsSignature(settings),
  };
  return sendAndRecord({ to: payment.receiptEmail, subject: `We’re checking your bank transfer for ${invoice.number}`, category: "TRANSFER_PENDING", content, fromAccounts: true, clientId: invoice.clientId, projectId: invoice.projectId, invoiceId: invoice.id });
}

export async function sendPaymentFailed(paymentId: string): Promise<SendResult> {
  const payment = await db().payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.provider === "BANK_TRANSFER") {
    return null;
  }
  const [invoice, settings] = await Promise.all([loadInvoice(payment.invoiceId), getSettings()]);
  const contact = recipients(invoice.client.contacts, true)?.to;
  const amount = money(payment.amount, payment.currency, { decimals: true });
  const token = await ensurePayToken(invoice.id);
  const method = payment.channel ? channelLabel(payment.channel).toLowerCase() : "online";
  const content: EmailContent = {
    preheader: "You can try again or use another way to pay.",
    ref: invoice.number,
    badge: { text: "Payment failed", tone: "danger" },
    heading: "Your payment didn’t go through",
    paragraphs: [`Hello ${firstName(contact?.name)},`, `We tried to process your ${method} payment of ${amount} for invoice ${invoice.number}, but it didn’t go through.`],
    callout: { text: "If money left your account, it will be reversed. Reply to this email if it isn’t.", tone: "info" },
    rows: [
      { label: "Reason given", value: payment.failureReason ?? "Declined" },
      { label: "Try instead", value: "Bank transfer or USSD, which usually have higher limits" },
    ],
    cta: { label: "Try again", url: paymentLink(token), accent: true },
    signature: accountsSignature(settings),
  };
  return sendAndRecord({ to: payment.receiptEmail, subject: `Your payment for ${invoice.number} didn’t go through`, category: "PAYMENT_FAILED", content, fromAccounts: true, clientId: invoice.clientId, projectId: invoice.projectId, invoiceId: invoice.id });
}

/** `attachPdf` defaults to the "attach receipt PDFs" setting. */
export async function sendReceiptEmail(invoiceId: string, toEmail: string | null, sentById: string | null, attachPdf?: boolean, extraAttachments: Attachment[] = []): Promise<SendResult> {
  const [invoice, settings, payment] = await Promise.all([
    db().invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { items: true, client: { include: { contacts: true } }, milestone: { select: { name: true } }, project: { include: { invoices: { where: { status: "PAID" }, include: { items: true } } } } },
    }),
    getSettings(),
    db().payment.findFirst({ where: { invoiceId, status: "SUCCESS" }, orderBy: { paidAt: "desc" } }),
  ]);
  const billing = recipients(invoice.client.contacts, true);
  const to = toEmail || billing?.to.email;
  if (!to) {
    return null;
  }
  const amount = money(invoiceTotal(invoice), invoice.currency, { decimals: true });
  const token = await ensurePayToken(invoiceId);
  const attachments = (attachPdf ?? settings.attachReceiptPdf) ? await pdfAttachments(invoiceId, "receipt") : [];
  const paidWith = payment && payment.provider !== "BANK_TRANSFER"
    ? `${payment.cardLast4 ? `Card ending ${payment.cardLast4}` : channelLabel(payment.channel) || "Online"}, via ${providerNames[payment.provider]}`
    : (invoice.paymentMethod ?? "—");

  let position: EmailContent["callout"];
  if (invoice.project && num(invoice.project.contractValue) > 0) {
    const paidSoFar = invoice.project.invoices.reduce((sum, paid) => sum + invoiceTotals(paid.items, paid.vatRate, paid.discount).total, 0);
    const contractWithVat = num(invoice.project.contractValue) * (1 + num(invoice.vatRate) / 100);
    position = { text: `Contract position: ${money(paidSoFar, invoice.currency)} paid of ${money(contractWithVat, invoice.project.currency)}${num(invoice.vatRate) ? " (incl. VAT)" : ""}.`, tone: "success" };
  }

  const content: EmailContent = {
    preheader: `Thank you. Invoice ${invoice.number} is paid in full.`,
    ref: receiptNumber(invoice.number),
    badge: { text: "Paid", tone: "success" },
    heading: "Payment received. Thank you.",
    amount: { label: "Amount paid", value: amount, note: invoice.paidAt ? `Paid ${formatDateTime(invoice.paidAt)}` : undefined },
    paragraphs: [`Hello ${firstName(billing?.to.name)},`, `We’ve received your payment for invoice ${invoice.number}. ${attachments.length ? "Your receipt is attached as a PDF." : "You can download your receipt as a PDF below."}`],
    rowsTitle: "Receipt details",
    rows: [
      { label: "Receipt number", value: receiptNumber(invoice.number) },
      { label: "For invoice", value: `${invoice.number}${invoice.milestone ? ` · ${invoice.milestone.name}` : invoice.project ? ` · ${invoice.project.name}` : ""}` },
      { label: "Paid with", value: paidWith },
      ...(invoice.paymentReference ? [{ label: "Reference", value: invoice.paymentReference }] : []),
      { label: "Amount paid", value: amount, style: "bold" as const },
    ],
    callout: position,
    cta: { label: "Download receipt (PDF)", url: `${paymentLink(token)}/receipt` },
    signature: accountsSignature(settings),
  };
  return sendAndRecord({
    to,
    cc: billing && billing.to.email !== to ? billing.to.email : undefined,
    subject: `Receipt for your payment · ${amount}`,
    category: "RECEIPT",
    content,
    attachments: [...attachments, ...extraAttachments],
    fromAccounts: true,
    sentById,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    invoiceId: invoice.id,
  });
}
