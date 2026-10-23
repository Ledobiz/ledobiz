"use client";

import { useId, useRef, useState } from "react";
import { CloseIcon, PaperclipIcon } from "@/components/admin/icons";
import { btnSmall } from "@/components/admin/ui";
import { ATTACHMENT_ACCEPT, ATTACHMENT_HINT, attachmentError, formatBytes } from "@/lib/attachments";

/** Optional files for a client email, e.g. a quote or proposal PDF. The server checks them again. */
export function AttachmentPicker({ files, onChange, disabled = false }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [error, setError] = useState<string>();

  function add(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (input.current) {
      // Lets the same file be picked again after removing it.
      input.current.value = "";
    }
    if (!picked.length) {
      return;
    }
    const next = [...files, ...picked.filter((file) => !files.some((existing) => existing.name === file.name && existing.size === file.size))];
    const problem = attachmentError(next);
    setError(problem ?? undefined);
    if (!problem) {
      onChange(next);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} aria-describedby={hintId} className={btnSmall}>
          <PaperclipIcon size={16} />
          Attach files
        </button>
        <span id={hintId} className="text-[13px] text-muted">Optional · {ATTACHMENT_HINT}</span>
        <input ref={input} type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={(event) => add(event.target.files)} className="sr-only" tabIndex={-1} aria-hidden="true" />
      </div>
      {error && <span role="alert" className="text-[13px] text-danger">{error}</span>}
      {files.length > 0 && (
        <ul aria-label="Attached files" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-1 pl-3 text-[13px]">
              <span className="truncate">{file.name}</span>
              <span className="flex-none text-muted">{formatBytes(file.size)}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => {
                    setError(undefined);
                    onChange(files.filter((item) => item !== file));
                  }}
                  className="inline-flex size-6 flex-none cursor-pointer items-center justify-center rounded-full text-muted hover:bg-[#e3e7ef] hover:text-midnight"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Puts the picked files into the FormData a send action reads ("attachments"). */
export function filesToFormData(files: File[], formData = new FormData()): FormData {
  for (const file of files) {
    formData.append("attachments", file);
  }
  return formData;
}
