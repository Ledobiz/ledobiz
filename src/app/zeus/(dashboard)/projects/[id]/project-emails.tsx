"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { type FormState, sendActionRequest, sendLaunchEmail, sendProjectWelcome, sendReviewRequest } from "@/app/zeus/actions/projects";
import { AttachmentPicker, filesToFormData, useAttachmentFiles } from "@/components/admin/attachment-picker";
import { MailIcon } from "@/components/admin/icons";
import { btnPrimary, Card, CardHeader, cx, Field, inputClass, Notice, textareaClass } from "@/components/admin/ui";

type Tab = "review" | "action" | "launch" | "welcome";

type Props = {
  projectId: string;
  clientId: string;
  recipient: string | null;
  milestones: { id: string; name: string; status: string }[];
  stagingUrl: string;
  canLaunch: boolean;
  welcomeSentAt: string | null;
  defaultFreeSupportUntil: string;
  delivered: boolean;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "review", label: "Ask for a review" },
  { id: "action", label: "Ask for something" },
  { id: "launch", label: "Launch email" },
  { id: "welcome", label: "Welcome email" },
];

/** Designed emails the team sends from a project: review requests, client to-dos, launch and welcome. */
export function ProjectEmails(props: Props) {
  const [tab, setTab] = useState<Tab>("review");
  const visible = tabs.filter((item) => item.id !== "launch" || props.canLaunch);

  return (
    <Card aria-labelledby="client-emails-title" className="overflow-hidden">
      <CardHeader id="client-emails-title" title="Email the client" subtitle={props.recipient ? `Goes to ${props.recipient} and is saved to the client’s history` : "Add a contact on the client page first"} />
      <div role="tablist" aria-label="Email type" className="flex flex-wrap gap-1 border-b border-line px-5 pt-2">
        {visible.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cx("-mb-px min-h-10 cursor-pointer border-b-2 px-3 text-sm font-medium", tab === item.id ? "border-midnight text-midnight" : "border-transparent text-muted hover:text-midnight")}>
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="p-5">
        {!props.recipient ? (
          <Notice tone="warn">This client has no contact email. <Link href={`/zeus/clients/${props.clientId}`} className="text-link">Add one on the client page</Link>.</Notice>
        ) : tab === "review" ? (
          <ReviewForm {...props} />
        ) : tab === "action" ? (
          <ActionForm projectId={props.projectId} />
        ) : tab === "launch" ? (
          <LaunchForm {...props} />
        ) : (
          <WelcomeForm projectId={props.projectId} sentAt={props.welcomeSentAt} />
        )}
      </div>
    </Card>
  );
}

function Outcome({ state, sentText }: { state: FormState; sentText: string }) {
  if (state.error) {
    return <Notice tone="bad">{state.error}</Notice>;
  }
  if (state.ok) {
    return <Notice tone={state.warning ? "warn" : "ok"}>{state.warning ?? sentText}</Notice>;
  }
  return null;
}

function SendButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className={cx(btnPrimary, "self-start")}>
      <MailIcon size={16} />
      {pending ? "Sending…" : label}
    </button>
  );
}

function ReviewForm({ projectId, milestones, stagingUrl }: Props) {
  const [state, action, pending] = useActionState(sendReviewRequest.bind(null, projectId), {} as FormState);
  const [files, setFiles] = useAttachmentFiles(state);
  const open = milestones.filter((milestone) => milestone.status !== "PENDING");
  const choices = open.length ? open : milestones;
  return (
    <form action={(formData) => action(filesToFormData(files, formData))} className="flex flex-col gap-4">
      <Outcome state={state} sentText="Review request sent." />
      <p className="m-0 text-sm text-muted">Tell the client a milestone is ready to test and approve.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
        <Field label="Milestone" htmlFor="review-milestone">
          <select id="review-milestone" name="milestoneId" defaultValue={choices.find((m) => m.status === "ONGOING")?.id ?? choices[0]?.id} className={inputClass}>
            {choices.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
          </select>
        </Field>
        <Field label="Approve by" htmlFor="review-by"><input id="review-by" name="reviewBy" type="date" className={inputClass} /></Field>
        <Field label="Link to review" htmlFor="review-url"><input id="review-url" name="url" type="url" defaultValue={stagingUrl} placeholder="https://staging…" className={inputClass} /></Field>
      </div>
      <Field label="What should they check?" htmlFor="review-checks" hint="One per line">
        <textarea id="review-checks" name="checks" rows={3} placeholder={"Create an account and log in\nTrack a shipment from the sample list"} className={textareaClass} />
      </Field>
      <Field label="Anything else? (optional)" htmlFor="review-note"><textarea id="review-note" name="note" rows={2} className={textareaClass} /></Field>
      <AttachmentPicker files={files} onChange={setFiles} disabled={pending} />
      <SendButton pending={pending} label="Send review request" />
    </form>
  );
}

function ActionForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(sendActionRequest.bind(null, projectId), {} as FormState);
  const [files, setFiles] = useAttachmentFiles(state);
  return (
    <form action={(formData) => action(filesToFormData(files, formData))} className="flex flex-col gap-4">
      <Outcome state={state} sentText="Request sent." />
      <p className="m-0 text-sm text-muted">Ask the client for something that’s blocking the work, such as content, access or a sign-off.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
        <Field label="What you need, in a few words" htmlFor="action-title" hint="Used in the subject line"><input id="action-title" name="title" required placeholder="Paystack business verification" className={inputClass} /></Field>
        <Field label="Needed by" htmlFor="action-by"><input id="action-by" name="neededBy" type="date" className={inputClass} /></Field>
        <Field label="Guide or link (optional)" htmlFor="action-url"><input id="action-url" name="url" type="url" className={inputClass} /></Field>
      </div>
      <Field label="Explain it" htmlFor="action-what"><textarea id="action-what" name="what" rows={3} required placeholder="To switch on live payments, Paystack needs to verify your business. Only your team can do this." className={textareaClass} /></Field>
      <Field label="Details" htmlFor="action-items" hint="One per line, as “Label: detail”">
        <textarea id="action-items" name="items" rows={3} placeholder={"Upload: CAC certificate and a director’s ID\nWhere: Paystack dashboard → Settings → Compliance"} className={textareaClass} />
      </Field>
      <Field label="What happens if it’s late (optional)" htmlFor="action-risk"><input id="action-risk" name="risk" placeholder="Until this is done, the payments milestone and the launch date are at risk." className={inputClass} /></Field>
      <AttachmentPicker files={files} onChange={setFiles} disabled={pending} />
      <SendButton pending={pending} label="Send request" />
    </form>
  );
}

function LaunchForm({ projectId, defaultFreeSupportUntil, delivered }: Props) {
  const [state, action, pending] = useActionState(sendLaunchEmail.bind(null, projectId), {} as FormState);
  const [files, setFiles] = useAttachmentFiles(state);
  return (
    <form action={(formData) => action(filesToFormData(files, formData))} className="flex flex-col gap-4">
      <Outcome state={state} sentText="Launch email sent." />
      <p className="m-0 text-sm text-muted">Tell the client their project is live, with the handover details. The free-fixes date also schedules the support renewal email.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
        <Field label="Live address" htmlFor="launch-url"><input id="launch-url" name="liveUrl" type="url" placeholder="https://…" className={inputClass} /></Field>
        <Field label="Admin login" htmlFor="launch-login" hint="Never put a password here"><input id="launch-login" name="adminLogin" placeholder="Sent separately to Tunde" className={inputClass} /></Field>
        <Field label="Free fixes until" htmlFor="launch-support"><input id="launch-support" name="freeSupportUntil" type="date" defaultValue={defaultFreeSupportUntil} className={inputClass} /></Field>
      </div>
      <Field label="Anything else? (optional)" htmlFor="launch-notes"><textarea id="launch-notes" name="notes" rows={3} placeholder="e.g. Your customers can now track shipments and pay invoices online." className={textareaClass} /></Field>
      {!delivered && (
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="markDelivered" defaultChecked className="size-4 accent-midnight" />Mark the project as delivered today</label>
      )}
      <AttachmentPicker files={files} onChange={setFiles} disabled={pending} />
      <SendButton pending={pending} label="Send launch email" />
    </form>
  );
}

function WelcomeForm({ projectId, sentAt }: { projectId: string; sentAt: string | null }) {
  const [state, action, pending] = useActionState(sendProjectWelcome.bind(null, projectId), {} as FormState);
  const [files, setFiles] = useAttachmentFiles(state);
  return (
    <form action={(formData) => action(filesToFormData(files, formData))} className="flex flex-col gap-4">
      <Outcome state={state} sentText="Welcome email sent." />
      <p className="m-0 text-sm text-muted">
        {sentAt ? `Sent ${sentAt}. ` : ""}The welcome email introduces the project lead, the start and launch dates and the first step. It goes out automatically when the deposit invoice is paid{sentAt ? "" : ", or you can send it now"}.
      </p>
      <AttachmentPicker files={files} onChange={setFiles} disabled={pending} />
      <SendButton pending={pending} label={sentAt ? "Send it again" : "Send welcome email"} />
    </form>
  );
}
