"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supportedCurrencies } from "@/lib/admin/format";
import { hashPassword, requireUser, verifyPassword } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getEmailTransport } from "@/lib/server/email-transports";
import { appUrl } from "@/lib/server/invoice-links";
import { isPushConfigured, sendPush } from "@/lib/server/push";
import { runDailyEmails } from "@/lib/server/scheduled-emails";
import { getSettings } from "@/lib/server/settings";
import type { FormState } from "./projects";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const optional = (value: string) => value || null;

export async function saveCompanySettings(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const parsed = z
    .object({
      tradingName: z.string().min(2, "Add the trading name.").max(80),
      legalName: z.string().min(2, "Add the legal name.").max(160),
      email: z.email("Enter a valid company email."),
      website: z.url("Enter the full website address, starting with https://"),
      phone: z.string().max(40),
      address: z.string().max(400),
      rcNumber: z.string().max(40),
      taxId: z.string().max(40),
    })
    .safeParse(Object.fromEntries(["tradingName", "legalName", "email", "website", "phone", "address", "rcNumber", "taxId"].map((key) => [key, text(formData, key)])));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  await db().settings.update({ where: { id: "default" }, data: { ...data, phone: optional(data.phone), address: optional(data.address), rcNumber: optional(data.rcNumber), taxId: optional(data.taxId) } });
  revalidatePath("/zeus", "layout");
  return { ok: true };
}

export async function saveEmailSettings(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const parsed = z
    .object({
      emailFromName: z.string().min(2).max(80),
      emailFrom: z.email("Enter a valid sender address."),
      invoicesFrom: z.email("Enter a valid accounts address."),
      signature: z.string().min(2).max(600),
      aiTone: z.string().min(2).max(120),
      aiBrandVoice: z.string().min(10, "Describe the brand voice in a sentence or two.").max(1500),
    })
    .safeParse(Object.fromEntries(["emailFromName", "emailFrom", "invoicesFrom", "signature", "aiTone", "aiBrandVoice"].map((key) => [key, text(formData, key)])));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  await db().settings.update({ where: { id: "default" }, data: parsed.data });
  revalidatePath("/zeus/settings");
  return { ok: true };
}

export async function saveQuoteSettings(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const parsed = z
    .object({
      quoteReplyHours: z.coerce.number().int().min(1).max(240),
      quoteNotifyEmails: z.string().max(400),
    })
    .safeParse({ quoteReplyHours: text(formData, "quoteReplyHours"), quoteNotifyEmails: text(formData, "quoteNotifyEmails") });
  if (!parsed.success) {
    return { error: "Reply target must be between 1 and 240 hours." };
  }
  const emails = parsed.data.quoteNotifyEmails.split(/[,\s]+/).filter(Boolean);
  if (emails.some((email) => !z.email().safeParse(email).success)) {
    return { error: "One of the notification addresses isn’t a valid email." };
  }
  await db().settings.update({ where: { id: "default" }, data: { quoteReplyHours: parsed.data.quoteReplyHours, quoteNotifyEmails: emails.join(", "), sendQuoteConfirmation: formData.get("sendQuoteConfirmation") === "on" } });
  revalidatePath("/zeus", "layout");
  return { ok: true };
}

export async function saveMoneySettings(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const parsed = z
    .object({
      reportingCurrency: z.enum(supportedCurrencies as [string, ...string[]]),
      vatRate: z.coerce.number().min(0).max(100),
      paymentTermsDays: z.coerce.number().int().min(0).max(180),
      invoicePrefix: z.string().min(1).max(12).regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes in the invoice prefix."),
      targetMargin: z.coerce.number().int().min(0).max(100),
      bankDetails: z.string().max(800),
    })
    .safeParse(Object.fromEntries(["reportingCurrency", "vatRate", "paymentTermsDays", "invoicePrefix", "targetMargin", "bankDetails"].map((key) => [key, text(formData, key)])));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  const rates: Record<string, number> = {};
  for (const code of supportedCurrencies) {
    const value = Number(text(formData, `rate_${code}`).replace(/,/g, ""));
    if (code === parsed.data.reportingCurrency) {
      rates[code] = 1;
    } else if (Number.isFinite(value) && value > 0) {
      rates[code] = value;
    }
  }
  await db().settings.update({ where: { id: "default" }, data: { ...parsed.data, bankDetails: optional(parsed.data.bankDetails), exchangeRates: rates } });
  revalidatePath("/zeus", "layout");
  return { ok: true };
}

// ── Team ────────────────────────────────────────────────────────────────────

const roleSchema = z.enum(["ADMIN", "PROJECT_LEAD", "FINANCE", "MEMBER"]);
const passwordSchema = z.string().min(10, "Passwords need at least 10 characters.").max(200);

export async function addTeamMember(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const parsed = z
    .object({ name: z.string().min(2, "Add their name.").max(120), email: z.email("Enter a valid email.").toLowerCase(), role: roleSchema, password: passwordSchema })
    .safeParse({ name: text(formData, "name"), email: text(formData, "email"), role: text(formData, "role"), password: String(formData.get("password") ?? "") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  const exists = await db().user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) {
    return { error: "Someone with that email already has an account." };
  }
  await db().user.create({ data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) } });
  revalidatePath("/zeus/settings");
  return { ok: true };
}

export async function updateTeamMember(userId: string, formData: FormData): Promise<void> {
  const me = await requireUser("settings");
  const role = roleSchema.safeParse(text(formData, "role"));
  const active = formData.get("active") === "on";
  if (!role.success) {
    return;
  }
  // Never let an admin lock themselves out.
  if (userId === me.id && (role.data !== "ADMIN" || !active)) {
    return;
  }
  await db().user.update({ where: { id: userId }, data: { role: role.data, active } });
  if (!active) {
    await db().session.deleteMany({ where: { userId } });
  }
  revalidatePath("/zeus/settings");
}

export async function resetTeamPassword(userId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const password = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!password.success) {
    return { error: password.error.issues[0]?.message };
  }
  await db().user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password.data) } });
  await db().session.deleteMany({ where: { userId } });
  return { ok: true };
}

export async function changeOwnPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = passwordSchema.safeParse(String(formData.get("next") ?? ""));
  if (!next.success) {
    return { error: next.error.issues[0]?.message };
  }
  if (next.data !== String(formData.get("confirm") ?? "")) {
    return { error: "The new passwords don’t match." };
  }
  const user = await db().user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: "Your current password is wrong." };
  }
  await db().user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next.data) } });
  return { ok: true };
}

// ── Automatic emails ────────────────────────────────────────────────────────

const automationFlags = ["autoQuoteFollowUp", "autoWelcome", "autoWeeklyUpdates", "autoPaymentReminders", "autoOverdueReminders", "autoFeedbackRequests", "autoSupportRenewals", "attachInvoicePdf", "attachReceiptPdf"] as const;

export async function saveAutomationSettings(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings");
  const urls = z
    .object({ bookingUrl: z.union([z.literal(""), z.url("Enter the full booking link, starting with https://")]), feedbackUrl: z.union([z.literal(""), z.url("Enter the full feedback form link, starting with https://")]) })
    .safeParse({ bookingUrl: text(formData, "bookingUrl"), feedbackUrl: text(formData, "feedbackUrl") });
  if (!urls.success) {
    return { error: urls.error.issues[0]?.message };
  }
  const flags = Object.fromEntries(automationFlags.map((flag) => [flag, formData.get(flag) === "on"]));
  await db().settings.update({ where: { id: "default" }, data: { ...flags, bookingUrl: optional(urls.data.bookingUrl), feedbackUrl: optional(urls.data.feedbackUrl) } });
  revalidatePath("/zeus/settings");
  return { ok: true };
}

export async function runAutomationNow(): Promise<FormState> {
  await requireUser("settings");
  const summary = await runDailyEmails();
  revalidatePath("/zeus/settings");
  const sent = Object.values(summary.sent).reduce((sum, count) => sum + count, 0);
  return summary.errors.length ? { error: `${sent} sent, ${summary.errors.length} failed. See the details below.` } : { ok: true };
}

/** Sends one email from each sender address to the signed-in user, to check the email provider accepts both. */
export async function sendTestEmails(): Promise<FormState> {
  const me = await requireUser("settings");
  const transport = getEmailTransport();
  if (!transport) {
    return { error: "Email sending isn’t set up yet. Add BREVO_API_KEY to the environment." };
  }
  const settings = await getSettings();
  const senders = [
    { name: settings.emailFromName, email: settings.emailFrom, use: "quotes, projects and client emails" },
    { name: `${settings.tradingName} Accounts`, email: settings.invoicesFrom, use: "invoices, reminders and receipts" },
  ];
  const failures: string[] = [];
  for (const sender of senders) {
    try {
      await transport.send({
        from: { name: sender.name, email: sender.email },
        to: [me.email],
        subject: `Test email from ${sender.email}`,
        text: `This is a test from the ${settings.tradingName} dashboard.\n\nIt was sent through ${transport.name} from ${sender.email}, the address used for ${sender.use}. If you can read this, that sender works.`,
        tags: ["test"],
      });
    } catch (cause) {
      failures.push(cause instanceof Error ? cause.message : `${sender.email}: unknown error`);
    }
  }
  return failures.length ? { error: failures.join(" ") } : { ok: true, warning: `Sent 2 test emails to ${me.email} through ${transport.name}. Check your inbox (and spam folder).` };
}

export async function sendTestPush(): Promise<FormState> {
  const me = await requireUser("settings");
  if (!isPushConfigured()) {
    return { error: "Push alerts aren’t set up yet. Add ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY to the environment." };
  }
  try {
    const delivered = await sendPush([me.id], { title: "Test alert", body: "Push alerts work on this device. New quote requests will show up like this.", url: `${appUrl()}/zeus/quotes` });
    return delivered ? { ok: true, warning: "Sent. It should appear in a few seconds." } : { error: "None of your devices has alerts turned on. Turn them on first, then try again." };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "OneSignal didn’t accept the alert." };
  }
}
