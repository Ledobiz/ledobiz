"use client";

import { useState, useTransition } from "react";
import { filesToFormData } from "@/components/admin/attachment-picker";
import type { DraftLength, DraftPhase } from "@/components/admin/draft-editor";
import { textToHtml } from "@/lib/rich-text";

type Draft = { subject: string; body: string };
type DraftResult = { ok: true; draft: Draft } | { ok: false; error: string };
type SendResult = { ok: true; status: string; warning?: string } | { ok: false; error: string };

/**
 * State machine shared by every AI email composer: idle → generating → draft → sent.
 * `body` is editor HTML; AI drafts arrive as plain text and are converted here.
 */
export function useDraft(initial?: Partial<Draft>) {
  const [phase, setPhase] = useState<DraftPhase>(initial?.body ? "draft" : "idle");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [aiAssisted, setAiAssisted] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, startSending] = useTransition();
  const [, startGenerating] = useTransition();

  function generate(request: (length: DraftLength) => Promise<DraftResult>, length: DraftLength = "normal") {
    setError(undefined);
    const previous = phase;
    setPhase("generating");
    startGenerating(async () => {
      const result = await request(length);
      if (result.ok) {
        setSubject(result.draft.subject || subject);
        setBody(textToHtml(result.draft.body));
        setAiAssisted(true);
        setPhase("draft");
      } else {
        setError(result.error);
        setPhase(previous === "generating" ? "idle" : previous);
      }
    });
  }

  function manual(defaultSubject = "") {
    setError(undefined);
    if (!subject) {
      setSubject(defaultSubject);
    }
    setPhase("draft");
  }

  function send(request: (draft: Draft & { aiAssisted: boolean }, files: FormData) => Promise<SendResult>) {
    setError(undefined);
    startSending(async () => {
      const result = await request({ subject, body, aiAssisted }, filesToFormData(attachments));
      if (result.ok) {
        setWarning(result.warning);
        setPhase("sent");
      } else {
        setError(result.error);
      }
    });
  }

  return { phase, subject, body, error, warning, sending, attachments, setSubject, setBody, setAttachments, generate, manual, send };
}
