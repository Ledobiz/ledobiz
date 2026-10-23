/**
 * Files the team can attach to client emails. The browser checks these before upload and the
 * server checks them again. Vercel caps a request at 4.5 MB, so attachments stay under 4 MB in total.
 */

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const ATTACHMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "png", "jpg", "jpeg", "webp", "zip"] as const;
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",");
export const ATTACHMENT_HINT = "PDF, Word, Excel, PowerPoint, images or ZIP · up to 5 files, 4 MB in total";

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Returns a message the team can act on, or null when the files are fine. */
export function attachmentError(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_ATTACHMENTS) {
    return `Attach up to ${MAX_ATTACHMENTS} files.`;
  }
  const blocked = files.find((file) => !(ATTACHMENT_EXTENSIONS as readonly string[]).includes(file.name.split(".").pop()?.toLowerCase() ?? ""));
  if (blocked) {
    return `${blocked.name} can’t be attached. Use ${ATTACHMENT_HINT.split(" · ")[0]}.`;
  }
  if (files.some((file) => file.size === 0)) {
    return "One of the files is empty.";
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_ATTACHMENT_BYTES) {
    return `The files add up to ${formatBytes(total)}. Keep attachments under ${formatBytes(MAX_ATTACHMENT_BYTES)} in total, or share a link instead.`;
  }
  return null;
}
