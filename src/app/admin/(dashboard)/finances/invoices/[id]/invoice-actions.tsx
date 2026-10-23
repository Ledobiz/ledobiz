"use client";

import { useActionState, useState, useTransition } from "react";
import { markInvoicePaid, sendInvoice } from "@/app/admin/actions/finance";
import { AttachmentPicker, filesToFormData } from "@/components/admin/attachment-picker";
import { SendIcon } from "@/components/admin/icons";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { btnPrimary, btnSecondary, btnSmall, Card, cx, inputClass, Notice } from "@/components/admin/ui";
import { isBlankHtml, textToHtml } from "@/lib/rich-text";

export function SendInvoicePanel({ invoiceId, defaultSubject, defaultBody, recipient, resend, attachByDefault }: { invoiceId: string; defaultSubject: string; defaultBody: string; recipient: string; resend: boolean; attachByDefault: boolean }) {
  const [open, setOpen] = useState(false);
  const [attachPdf, setAttachPdf] = useState(attachByDefault);
  const [subject, setSubject] = useState(defaultSubject);
  // The default message is plain text; the editor works in HTML.
  const [body, setBody] = useState(() => textToHtml(defaultBody));
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<{ tone: "ok" | "warn" | "bad"; text: string }>();
  const [pending, startTransition] = useTransition();

  function send() {
    setResult(undefined);
    startTransition(async () => {
      const response = await sendInvoice(invoiceId, { subject, body, attachPdf }, filesToFormData(files));
      if (response.ok) {
        setFiles([]);
        setResult(response.warning ? { tone: "warn", text: response.warning } : { tone: "ok", text: `Invoice emailed to ${recipient}.` });
        setOpen(false);
      } else {
        setResult({ tone: "bad", text: response.error });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="m-0 font-display text-lg font-semibold">{resend ? "Send again" : "Send to the client"}</h2>
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      {open ? (
        <>
          <span className="text-[13px] text-muted">To {recipient}</span>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass} /></label>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <span aria-hidden="true">Message</span>
            <RichTextEditor id="invoice-message" label="Message" value={body} onChange={setBody} disabled={pending} minHeight="min-h-[140px]" />
          </div>
          <span className="text-[13px] text-muted">The amount, invoice lines, Pay now button and bank details are added below your message.</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={attachPdf} onChange={(event) => setAttachPdf(event.target.checked)} className="size-4 accent-midnight" />Attach the invoice as a PDF</label>
            <a href={`/admin/finances/invoices/${invoiceId}/pdf`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-link">Preview PDF</a>
          </span>
          <AttachmentPicker files={files} onChange={setFiles} disabled={pending} />
          <div className="flex gap-2">
            <button type="button" disabled={pending || !subject.trim() || isBlankHtml(body)} onClick={send} className={btnPrimary}><SendIcon size={16} />{pending ? "Sending…" : "Send invoice"}</button>
            <button type="button" onClick={() => setOpen(false)} className={btnSmall}>Cancel</button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={cx(resend ? btnSecondary : btnPrimary, "self-start")}><SendIcon size={16} />{resend ? "Send a reminder copy" : "Review and send"}</button>
      )}
    </Card>
  );
}

export function MarkPaidPanel({ invoiceId, today, attachByDefault }: { invoiceId: string; today: string; attachByDefault: boolean }) {
  const [state, action, pending] = useActionState(markInvoicePaid.bind(null, invoiceId), {});
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="m-0 font-display text-lg font-semibold">Record payment</h2>
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <form action={(formData) => action(filesToFormData(files, formData))} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">Date received<input name="paidAt" type="date" defaultValue={today} required className={inputClass} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Method
          <select name="paymentMethod" className={inputClass}>
            <option>Bank transfer</option>
            <option>Card</option>
            <option>Paystack</option>
            <option>Cash</option>
            <option>Cheque</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Reference <span className="font-normal text-muted">(optional)</span><input name="paymentReference" className={inputClass} /></label>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="sendReceipt" defaultChecked className="size-4 accent-midnight" />Email a receipt to the client</label>
        <label className="inline-flex items-center gap-2 pl-6 text-sm"><input type="checkbox" name="attachReceipt" defaultChecked={attachByDefault} className="size-4 accent-midnight" />Attach the receipt as a PDF</label>
        <div className="pl-6"><AttachmentPicker files={files} onChange={setFiles} disabled={pending} /></div>
        <button type="submit" disabled={pending} className={cx(btnPrimary, "self-start")}>{pending ? "Saving…" : "Mark as paid"}</button>
      </form>
    </Card>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className={btnSmall}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
