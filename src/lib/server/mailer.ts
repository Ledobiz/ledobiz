import "server-only";
import type { EmailCategory, EmailStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/server/db";
import { type EmailContent, emailToText, renderEmail, textToContent } from "@/lib/server/email-layout";
import { getEmailTransport, splitAddresses } from "@/lib/server/email-transports";
import { richEmailBody } from "@/lib/server/rich-email";
import { getSettings } from "@/lib/server/settings";

/** Public base URL for links and images in emails. */
function appBaseUrl(website: string): string {
  return (process.env.APP_URL || website).replace(/\/+$/, "");
}

export function isEmailConfigured(): boolean {
  return getEmailTransport() !== null;
}

/** "Brevo", "SMTP via …", or null when sending isn't set up. */
export function emailProviderName(): string | null {
  return getEmailTransport()?.name ?? null;
}

/** Internal alert to the team (not part of any client's correspondence history). */
export async function notifyTeam(to: string, subject: string, body: string): Promise<void> {
  const transport = getEmailTransport();
  const recipients = splitAddresses(to);
  if (!transport || recipients.length === 0) {
    return;
  }
  const settings = await getSettings();
  await transport.send({ from: { name: settings.emailFromName, email: settings.emailFrom }, to: recipients, subject, text: body, tags: ["team-alert"] });
}

export type OutgoingEmail = {
  to: string;
  cc?: string;
  subject: string;
  category: EmailCategory;
  /** Free text (AI draft or typed by the team); laid out as paragraphs. */
  body?: string;
  /** The team's message from the rich text editor; sanitised here. Takes precedence over `body`. */
  html?: string;
  /** Structured content for designed emails; takes precedence over `body`. */
  content?: EmailContent;
  /** Button added under a free-text body. */
  cta?: { label: string; url: string; accent?: boolean };
  /** Shown top right of the email header, e.g. the invoice number. */
  reference?: string;
  /** Defaults to the main address; invoices and receipts use the accounts address. */
  fromAccounts?: boolean;
  /** Person sending, e.g. "Tolu O." — the address stays the company's. */
  fromName?: string;
  replyTo?: string;
  /** Footer line explaining why the client got this email. Defaults by category. */
  why?: string;
  /** Files to attach, e.g. the invoice PDF. Their names are kept in the history. */
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  aiAssisted?: boolean;
  sentById?: string | null;
  clientId?: string | null;
  quoteId?: string | null;
  projectId?: string | null;
  invoiceId?: string | null;
};

const billingCategories = new Set<EmailCategory>(["INVOICE", "PAYMENT_REMINDER", "PAYMENT_OVERDUE", "RECEIPT", "TRANSFER_PENDING", "PAYMENT_FAILED", "SUPPORT_RENEWAL"]);
const quoteCategories = new Set<EmailCategory>(["QUOTE_CONFIRMATION", "QUOTE_REPLY", "QUOTE_FOLLOW_UP"]);

async function defaultWhy(email: OutgoingEmail, website: string): Promise<string> {
  const site = website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (quoteCategories.has(email.category)) {
    return `You’re receiving this because you requested a quote on ${site}.`;
  }
  const client = email.clientId ? await db().client.findUnique({ where: { id: email.clientId }, select: { company: true } }) : null;
  const company = client?.company ?? "your company";
  return billingCategories.has(email.category) ? `You’re receiving this because you’re the billing contact for ${company}.` : `You’re receiving this because ${company} is a Ledobiz client.`;
}

/** Sends an email (through Brevo or SMTP, when set up) and always records it in the correspondence history. */
export async function sendAndRecord(email: OutgoingEmail): Promise<{ id: string; status: EmailStatus; error?: string }> {
  const settings = await getSettings();
  const fromAddress = email.fromAccounts ? settings.invoicesFrom : settings.emailFrom;
  const fromName = email.fromName ? `${email.fromName} · ${settings.tradingName}` : email.fromAccounts ? `${settings.tradingName} Accounts` : settings.emailFromName;
  const from = `${fromName} <${fromAddress}>`;
  const replyTo = email.replyTo || fromAddress;
  const content: EmailContent = email.content ?? (email.html ? { paragraphs: [], bodyHtml: richEmailBody(email.html), cta: email.cta } : { ...textToContent(email.body ?? ""), cta: email.cta });
  content.ref ??= email.reference;
  const text = email.content || email.html ? emailToText(content) : (email.body ?? "").trim() + (email.cta ? `\n\n${email.cta.label}: ${email.cta.url}` : "");
  let status: EmailStatus = "NOT_SENT";
  let error: string | undefined;
  let providerMessageId: string | null = null;

  const transport = getEmailTransport();
  if (transport) {
    try {
      const base = appBaseUrl(settings.website);
      const result = await transport.send({
        from: { name: fromName, email: fromAddress },
        to: splitAddresses(email.to),
        cc: splitAddresses(email.cc),
        replyTo,
        subject: email.subject,
        attachments: email.attachments,
        tags: [email.category.toLowerCase().replace(/_/g, "-")],
        text,
        html: renderEmail(content, {
          legalName: settings.legalName,
          website: settings.website,
          why: email.why ?? (await defaultWhy(email, settings.website)),
          replyTo,
          logoUrl: `${base}/brand/ledobiz-logo-email.png`,
          privacyUrl: `${base}/privacy`,
        }),
      });
      providerMessageId = result.messageId;
      status = "SENT";
    } catch (cause) {
      status = "FAILED";
      error = cause instanceof Error ? cause.message.slice(0, 500) : "Unknown error";
      console.error("Email sending failed", cause);
    }
  } else {
    error = "Email sending is not set up (add BREVO_API_KEY). Saved to history only.";
  }

  const record = await db().email.create({
    data: {
      direction: "OUTBOUND",
      category: email.category,
      status,
      subject: email.subject,
      body: text,
      fromAddress: from,
      toAddress: email.to,
      cc: email.cc || null,
      aiAssisted: email.aiAssisted ?? false,
      attachments: email.attachments?.map((file) => file.filename) ?? [],
      providerMessageId,
      error,
      sentById: email.sentById ?? null,
      clientId: email.clientId ?? null,
      quoteId: email.quoteId ?? null,
      projectId: email.projectId ?? null,
      invoiceId: email.invoiceId ?? null,
    },
    select: { id: true },
  });

  return { id: record.id, status, error };
}
