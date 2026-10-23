import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * How emails leave the app. Brevo's API is used when BREVO_API_KEY is set; otherwise SMTP
 * (SMTP_HOST, which can also be Brevo's SMTP relay). Without either, emails are only saved to the history.
 */

export type OutgoingMessage = {
  from: { name: string; email: string };
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  /** Labels for the provider's dashboard, e.g. "invoice". */
  tags?: string[];
};

export type EmailTransport = {
  name: string;
  send(message: OutgoingMessage): Promise<{ messageId: string | null }>;
};

export class EmailSendError extends Error {}

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

class BrevoTransport implements EmailTransport {
  name = "Brevo";

  constructor(private readonly apiKey: string) {}

  async send(message: OutgoingMessage): Promise<{ messageId: string | null }> {
    const response = await fetch(BREVO_API, {
      method: "POST",
      headers: { "api-key": this.apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: message.from,
        to: message.to.map((email) => ({ email })),
        cc: message.cc?.length ? message.cc.map((email) => ({ email })) : undefined,
        replyTo: message.replyTo ? { email: message.replyTo } : undefined,
        subject: message.subject,
        htmlContent: message.html ?? `<pre style="font-family:inherit;white-space:pre-wrap">${message.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
        textContent: message.text,
        attachment: message.attachments?.length ? message.attachments.map((file) => ({ name: file.filename, content: file.content.toString("base64") })) : undefined,
        tags: message.tags?.length ? message.tags : undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json().catch(() => null)) as { messageId?: string; code?: string; message?: string } | null;
    if (!response.ok) {
      throw new EmailSendError(brevoError(response.status, json, message.from.email));
    }
    return { messageId: json?.messageId ?? null };
  }
}

/** Turns Brevo's error into something the team can act on. */
function brevoError(status: number, json: { code?: string; message?: string } | null, sender: string): string {
  const detail = json?.message ?? `HTTP ${status}`;
  if (status === 401 || json?.code === "unauthorized") {
    return `Brevo rejected the API key (${detail}). Check BREVO_API_KEY.`;
  }
  if (/sender/i.test(detail)) {
    return `Brevo won’t send from ${sender}: ${detail} Add and verify it under Senders in Brevo, or change the address in Settings.`;
  }
  if (json?.code === "not_enough_credits") {
    return "Your Brevo account is out of email credits.";
  }
  return `Brevo: ${detail}`;
}

class SmtpTransport implements EmailTransport {
  name = "SMTP";
  private readonly transporter: Transporter;

  constructor(host: string) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    this.name = `SMTP via ${host}`;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }

  async send(message: OutgoingMessage): Promise<{ messageId: string | null }> {
    const info = await this.transporter.sendMail({
      from: { name: message.from.name, address: message.from.email },
      to: message.to,
      cc: message.cc?.length ? message.cc : undefined,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((file) => ({ filename: file.filename, content: file.content, contentType: file.contentType ?? "application/pdf" })),
    });
    return { messageId: info.messageId ?? null };
  }
}

let cached: EmailTransport | null | undefined;

export function getEmailTransport(): EmailTransport | null {
  if (cached !== undefined) {
    return cached;
  }
  if (process.env.BREVO_API_KEY) {
    cached = new BrevoTransport(process.env.BREVO_API_KEY);
  } else if (process.env.SMTP_HOST) {
    cached = new SmtpTransport(process.env.SMTP_HOST);
  } else {
    cached = null;
  }
  return cached;
}

/** Splits "a@x.com, b@y.com" into addresses. */
export function splitAddresses(value: string | null | undefined): string[] {
  return (value ?? "").split(/[,;\s]+/).map((address) => address.trim()).filter(Boolean);
}
