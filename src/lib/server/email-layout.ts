/**
 * The branded client email from the design (badge, heading, amount, progress, detail rows,
 * callout, button). Built with tables and inline styles so it renders in Gmail and Outlook.
 */

export type EmailTone = "info" | "success" | "warn" | "danger";

export type EmailContent = {
  /** Inbox preview text. */
  preheader?: string;
  /** Shown top right of the header bar, e.g. the invoice number. */
  ref?: string;
  badge?: { text: string; tone: EmailTone };
  heading?: string;
  amount?: { label: string; value: string; note?: string };
  /** The team's formatted message, already sanitised and styled (see rich-email.ts). Shown before `paragraphs`. */
  bodyHtml?: { html: string; text: string };
  paragraphs: string[];
  progress?: number;
  rowsTitle?: string;
  rows?: { label: string; value: string; style?: "bold" | "strike" }[];
  callout?: { text: string; tone: EmailTone };
  cta?: { label: string; url: string; accent?: boolean };
  /** Small text under the button (or on its own when there is no button). */
  secondary?: string;
  after?: string[];
  signature?: string;
};

export type EmailFooter = { legalName: string; website: string; why: string; replyTo: string; logoUrl: string; privacyUrl: string };

const tones: Record<EmailTone, { bg: string; fg: string }> = {
  info: { bg: "#e6f4f9", fg: "#15627b" },
  success: { bg: "#e3f6ee", fg: "#145c41" },
  warn: { bg: "#fff1db", fg: "#7a4800" },
  danger: { bg: "#fdecec", fg: "#8e1c1c" },
};

const font = "font-family:'Google Sans',Arial,Helvetica,sans-serif;";
const display = "font-family:'Petrov Sans','Google Sans',Arial,Helvetica,sans-serif;";

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function text(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function block(html: string): string {
  return `<tr><td style="padding:0 0 16px;">${html}</td></tr>`;
}

export function renderEmail(content: EmailContent, footer: EmailFooter): string {
  const parts: string[] = [];
  if (content.badge) {
    const tone = tones[content.badge.tone];
    parts.push(block(`<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-size:12px;font-weight:700;letter-spacing:0.04em;">${text(content.badge.text)}</span>`));
  }
  if (content.heading) {
    parts.push(block(`<h1 style="margin:0;${display}font-weight:700;font-size:24px;line-height:31px;color:#000033;">${text(content.heading)}</h1>`));
  }
  if (content.amount) {
    parts.push(
      block(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;border-radius:10px;"><tr><td style="padding:16px;">` +
          `<div style="font-size:12px;letter-spacing:0.14em;color:#4b5470;">${text(content.amount.label.toUpperCase())}</div>` +
          `<div style="${display}font-weight:700;font-size:30px;line-height:38px;color:#000033;">${text(content.amount.value)}</div>` +
          (content.amount.note ? `<div style="font-size:14px;color:#4b5470;">${text(content.amount.note)}</div>` : "") +
          `</td></tr></table>`,
      ),
    );
  }
  if (content.bodyHtml) {
    parts.push(`<tr><td style="padding:0;font-size:15px;line-height:23px;color:#000033;">${content.bodyHtml.html}</td></tr>`);
  }
  for (const paragraph of content.paragraphs) {
    parts.push(block(`<p style="margin:0;font-size:15px;line-height:23px;color:#000033;">${text(paragraph)}</p>`));
  }
  if (typeof content.progress === "number") {
    const value = Math.min(Math.max(Math.round(content.progress), 0), 100);
    parts.push(
      block(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;font-weight:700;color:#000033;padding-bottom:6px;">Overall progress</td><td align="right" style="font-size:14px;font-weight:700;color:#000033;padding-bottom:6px;">${value}%</td></tr>` +
          `<tr><td colspan="2" style="background:#dde2ea;border-radius:999px;height:10px;line-height:10px;font-size:0;"><div style="width:${value}%;height:10px;background:#35a9ce;border-radius:999px;">&nbsp;</div></td></tr></table>`,
      ),
    );
  }
  if (content.rows?.length) {
    const rows = content.rows
      .map((row, index) => {
        const border = index > 0 || content.rowsTitle ? "border-top:1px solid #eef1f6;" : "";
        const valueStyle = row.style === "bold" ? "font-weight:700;color:#000033;" : row.style === "strike" ? "text-decoration:line-through;color:#4b5470;" : "font-weight:500;color:#000033;";
        return `<tr><td style="${border}padding:10px 16px;font-size:14px;line-height:20px;color:#4b5470;vertical-align:top;">${text(row.label)}</td><td align="right" style="${border}padding:10px 16px;font-size:14px;line-height:20px;${valueStyle}">${text(row.value)}</td></tr>`;
      })
      .join("");
    const title = content.rowsTitle ? `<tr><td colspan="2" style="padding:10px 16px;background:#f3f5f9;font-size:12px;letter-spacing:0.12em;color:#4b5470;">${text(content.rowsTitle.toUpperCase())}</td></tr>` : "";
    parts.push(block(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dde2ea;border-radius:10px;border-collapse:separate;">${title}${rows}</table>`));
  }
  if (content.callout) {
    const tone = tones[content.callout.tone];
    parts.push(block(`<div style="padding:12px 16px;border-radius:8px;background:${tone.bg};color:${tone.fg};font-size:14px;line-height:21px;">${text(content.callout.text)}</div>`));
  }
  if (content.cta) {
    const colours = content.cta.accent ? "background:#35a9ce;color:#000033;" : "background:#000033;color:#ffffff;";
    parts.push(
      block(
        `<a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:14px 24px;border-radius:8px;${colours}font-weight:700;font-size:15px;text-decoration:none;">${text(content.cta.label)}</a>` +
          (content.secondary ? `<div style="padding-top:10px;font-size:14px;line-height:20px;color:#4b5470;">${text(content.secondary)}</div>` : ""),
      ),
    );
  } else if (content.secondary) {
    parts.push(block(`<p style="margin:0;font-size:14px;line-height:20px;color:#4b5470;">${text(content.secondary)}</p>`));
  }
  for (const paragraph of content.after ?? []) {
    parts.push(block(`<p style="margin:0;font-size:15px;line-height:23px;color:#000033;">${text(paragraph)}</p>`));
  }
  if (content.signature) {
    parts.push(`<tr><td style="padding:0 0 20px;"><p style="margin:0;font-size:15px;line-height:23px;color:#000033;">${text(content.signature)}</p></td></tr>`);
  }

  const preheader = content.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}${"&#8199;&#65279;&#847; ".repeat(30)}</div>` : "";
  const site = footer.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(content.heading ?? "")}</title></head>
<body style="margin:0;padding:0;background:#f3f5f9;${font}">${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
<tr><td style="background:#ffffff;border:1px solid #dde2ea;border-radius:12px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:#000033;padding:18px 28px;border-radius:12px 12px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="${escapeHtml(footer.logoUrl)}" width="126" height="34" alt="Ledobiz" style="display:block;border:0;"></td>
<td align="right" style="color:#c9cee0;font-size:12px;${font}">${escapeHtml(content.ref ?? "")}</td></tr></table></td></tr>
<tr><td style="font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="62%" style="height:4px;background:#35a9ce;"></td><td width="3"></td><td width="12%" style="height:4px;background:#33cc99;"></td><td width="3"></td><td width="12%" style="height:4px;background:#ff9900;"></td><td width="3"></td><td style="height:4px;background:#000033;"></td></tr></table></td></tr>
<tr><td style="padding:28px 28px 8px;${font}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${parts.join("")}</table></td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 8px 0;font-size:12px;line-height:18px;color:#4b5470;${font}">
${escapeHtml(footer.legalName)} · <a href="${escapeHtml(footer.website)}" style="color:#1b7a99;">${escapeHtml(site)}</a><br>
${escapeHtml(footer.why)}<br>
<a href="${escapeHtml(footer.privacyUrl)}" style="color:#1b7a99;">Privacy policy</a> · Questions? Reply to this email or write to ${escapeHtml(footer.replyTo)}
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Plain-text version of the same email, also stored in the correspondence history. */
export function emailToText(content: EmailContent): string {
  const lines: string[] = [];
  if (content.heading) {
    lines.push(content.heading, "");
  }
  if (content.amount) {
    lines.push(`${content.amount.label}: ${content.amount.value}${content.amount.note ? ` (${content.amount.note})` : ""}`, "");
  }
  if (content.bodyHtml) {
    lines.push(content.bodyHtml.text, "");
  }
  for (const paragraph of content.paragraphs) {
    lines.push(paragraph, "");
  }
  if (typeof content.progress === "number") {
    lines.push(`Overall progress: ${Math.round(content.progress)}%`, "");
  }
  if (content.rows?.length) {
    if (content.rowsTitle) {
      lines.push(content.rowsTitle);
    }
    for (const row of content.rows) {
      lines.push(`${row.label}: ${row.value}`);
    }
    lines.push("");
  }
  if (content.callout) {
    lines.push(content.callout.text, "");
  }
  if (content.cta) {
    lines.push(`${content.cta.label}: ${content.cta.url}`, "");
  }
  if (content.secondary) {
    lines.push(content.secondary, "");
  }
  for (const paragraph of content.after ?? []) {
    lines.push(paragraph, "");
  }
  if (content.signature) {
    lines.push(content.signature);
  }
  return lines.join("\n").trim();
}

/** Turns a free-text email (AI draft or typed by the team) into layout content. */
export function textToContent(body: string): EmailContent {
  return { paragraphs: body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean) };
}
