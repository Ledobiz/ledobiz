import "server-only";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { attachmentError } from "@/lib/attachments";
import { htmlToText, unwrapListParagraphs } from "@/lib/rich-text";

/** An editor body, measured by its words rather than its markup. */
export function richBodySchema(minChars: number, tooShort: string) {
  return z
    .string()
    .max(100_000, "The message is too long.")
    .refine((html) => htmlToText(html).length >= minChars, tooShort)
    .refine((html) => htmlToText(html).length <= 20_000, "The message is too long.");
}

/**
 * Turns what the team wrote in the rich text editor into email-safe HTML, and uploaded files into attachments.
 * Only the editor's tags survive, and each gets inline styles because Gmail and Outlook ignore stylesheets.
 */

const paragraph = "margin:0 0 16px;font-size:15px;line-height:23px;color:#000033;";
const styles: Record<string, string> = {
  p: paragraph,
  h2: "margin:8px 0 12px;font-family:'Petrov Sans','Google Sans',Arial,Helvetica,sans-serif;font-size:19px;line-height:25px;font-weight:700;color:#000033;",
  h3: "margin:8px 0 10px;font-size:16px;line-height:22px;font-weight:700;color:#000033;",
  ul: "margin:0 0 16px;padding-left:22px;font-size:15px;line-height:23px;color:#000033;",
  ol: "margin:0 0 16px;padding-left:22px;font-size:15px;line-height:23px;color:#000033;",
  li: "margin:0 0 6px;",
  blockquote: "margin:0 0 16px;padding:4px 0 4px 14px;border-left:3px solid #35a9ce;color:#4b5470;",
  a: "color:#1b7a99;text-decoration:underline;",
};

export type RichBody = { html: string; text: string };

export function richEmailBody(editorHtml: string): RichBody {
  const clean = unwrapListParagraphs(sanitizeHtml(editorHtml, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "blockquote"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: { h1: "h2", h4: "h3" },
  }));
  return {
    text: htmlToText(clean),
    // Styles are added after sanitising so nothing the editor sends can set its own.
    html: clean.replace(/<(p|h2|h3|ul|ol|li|blockquote|a)(\s[^>]*)?>/g, (_match, tag: string, attributes = "") => {
      const extra = tag === "a" ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<${tag}${attributes}${extra} style="${styles[tag]}">`;
    }),
  };
}

export type Attachment = { filename: string; content: Buffer; contentType?: string };

/** Reads the files posted under "attachments". Returns an error message instead when they break the rules. */
export async function readAttachments(formData: FormData | null | undefined): Promise<{ attachments: Attachment[] } | { error: string }> {
  const files = (formData?.getAll("attachments") ?? []).filter((value): value is File => typeof value === "object" && value !== null && "arrayBuffer" in value && value.size > 0);
  const error = attachmentError(files);
  if (error) {
    return { error };
  }
  return {
    attachments: await Promise.all(
      files.map(async (file) => ({
        filename: file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 120),
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || undefined,
      })),
    ),
  };
}
