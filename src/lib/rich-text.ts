/**
 * Email bodies are written in the rich text editor as a small subset of HTML
 * (paragraphs, bold, italic, underline, lists, links, one heading level, quotes).
 * These helpers run in the browser and on the server; sanitising happens on the server.
 */

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text (an AI draft or a default message) as editor HTML: blank lines split paragraphs. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escape(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/** Drops the <p> the editor puts inside each list item, so lists stay tight. */
export function unwrapListParagraphs(html: string): string {
  return html.replace(/<li([^>]*)>\s*<p[^>]*>/gi, "<li$1>").replace(/<\/p>\s*<\/li>/gi, "</li>");
}

/** Readable plain text from editor HTML, for the text part of the email and the history. */
export function htmlToText(html: string): string {
  // One pass over the tags, so numbered lists keep their own count even when nested in or next to bullets.
  const lists: number[] = [];
  return unwrapListParagraphs(html)
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_match, href: string, label: string) => (label.replace(/<[^>]+>/g, "") === href ? href : `${label} (${href})`))
    .replace(/<(\/?)([a-z0-9]+)[^>]*>/gi, (_match, closing: string, name: string) => {
      const tag = name.toLowerCase();
      if (tag === "br") {
        return "\n";
      }
      if (tag === "ol" || tag === "ul") {
        if (closing) {
          lists.pop();
          return lists.length ? "" : "\n\n";
        }
        lists.push(tag === "ol" ? 1 : 0);
        return lists.length > 1 ? "\n" : "";
      }
      if (tag === "li") {
        if (closing) {
          return "\n";
        }
        const depth = lists.length;
        const indent = "  ".repeat(Math.max(depth - 1, 0));
        return depth && lists[depth - 1] ? `${indent}${lists[depth - 1]++}. ` : `${indent}• `;
      }
      return closing && /^(p|h[1-6]|blockquote)$/.test(tag) ? "\n\n" : "";
    })
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_match, name: string) => entities[name])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when the editor holds no words (Tiptap leaves "<p></p>" behind). */
export function isBlankHtml(html: string): boolean {
  return htmlToText(html).length === 0;
}
