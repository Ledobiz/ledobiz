"use client";

import type { ReactNode } from "react";
import { AttachmentPicker } from "@/components/admin/attachment-picker";
import { SendIcon, SparkleIcon } from "@/components/admin/icons";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { btnPrimary, btnSmall, cx, inputClass, Notice } from "@/components/admin/ui";
import { htmlToText, isBlankHtml } from "@/lib/rich-text";

export type DraftPhase = "idle" | "generating" | "draft" | "sent";
export type DraftLength = "short" | "normal" | "long";

type DraftEditorProps = {
  phase: DraftPhase;
  subject: string;
  /** Editor HTML. */
  body: string;
  onSubject: (value: string) => void;
  onBody: (value: string) => void;
  attachments: File[];
  onAttachments: (files: File[]) => void;
  onGenerate: (length: DraftLength) => void;
  onManual: () => void;
  onSend: () => void;
  sending: boolean;
  error?: string;
  sentMessage?: string;
  warning?: string;
  recipients: ReactNode;
  generatingLabel?: string;
  sendLabel?: string;
};

/** Shows the AI draft (or a blank one), lets the team edit it, then send. */
export function DraftEditor(props: DraftEditorProps) {
  const text = htmlToText(props.body);
  const words = text ? text.split(/\s+/).length : 0;
  const busy = props.phase === "generating" || props.sending;

  return (
    <div aria-live="polite" className="flex flex-col gap-3.5">
      {props.error && <Notice tone="bad">{props.error}</Notice>}

      {props.phase === "idle" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-control px-5 py-10 text-center text-muted">
          <SparkleIcon size={28} className="text-link" />
          <strong className="text-midnight">Your draft will appear here</strong>
          <span>Set the details above and generate, or write the email yourself.</span>
          <button type="button" onClick={props.onManual} className={cx(btnSmall, "mt-2")}>Write it myself</button>
        </div>
      )}

      {props.phase === "generating" && (
        <div className="flex flex-col gap-2.5">
          <span className="inline-flex items-center gap-2 font-medium text-[#15627b]">
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[#b8dfec] border-t-link" />
            {props.generatingLabel ?? "Writing a draft…"}
          </span>
          {[40, 92, 86, 70, 88].map((width) => (
            <span key={width} className="h-3 animate-pulse rounded-md bg-[#e6eaf1]" style={{ width: `${width}%` }} />
          ))}
        </div>
      )}

      {(props.phase === "draft" || props.phase === "sent") && (
        <>
          <div className="grid grid-cols-[64px_1fr] items-center gap-2.5">
            <span className="text-muted">To</span>
            <span className="text-sm">{props.recipients}</span>
            <label htmlFor="draft-subject" className="text-muted">Subject</label>
            <input id="draft-subject" value={props.subject} onChange={(event) => props.onSubject(event.target.value)} disabled={props.phase === "sent"} className={inputClass} />
          </div>
          <RichTextEditor id="draft-body" label="Message" value={props.body} onChange={props.onBody} disabled={props.phase === "sent"} minHeight="min-h-[380px]" />
          <AttachmentPicker files={props.attachments} onChange={props.onAttachments} disabled={props.phase === "sent" || props.sending} />
          {props.phase === "draft" && (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => props.onGenerate("normal")} className={btnSmall}>Regenerate</button>
                <button type="button" disabled={busy} onClick={() => props.onGenerate("short")} className={btnSmall}>Make shorter</button>
                <button type="button" disabled={busy} onClick={() => props.onGenerate("long")} className={btnSmall}>More detail</button>
              </span>
              <span className="text-[13px] text-muted">{words} words · check names, prices and dates before sending</span>
            </div>
          )}
          {props.phase === "sent" ? (
            <Notice tone={props.warning ? "warn" : "ok"}>{props.warning ?? props.sentMessage ?? "Sent."}</Notice>
          ) : (
            <div className="flex justify-end border-t border-line pt-3.5">
              <button type="button" disabled={busy || !props.subject.trim() || isBlankHtml(props.body)} onClick={props.onSend} className={cx(btnPrimary, "min-h-11")}>
                <SendIcon size={16} />
                {props.sending ? "Sending…" : props.sendLabel ?? "Send"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ToneButtons<T extends string>({ value, options, onChange, legend }: { value: T; options: readonly T[]; onChange: (value: T) => void; legend: string }) {
  return (
    <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
      <legend className="mb-2 p-0 font-medium">{legend}</legend>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cx("min-h-9 cursor-pointer rounded-full border px-3.5 text-sm font-medium", option === value ? "border-midnight bg-midnight text-white" : "border-control bg-white text-midnight")}
        >
          {option}
        </button>
      ))}
    </fieldset>
  );
}
