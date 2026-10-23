"use client";

import { type ReactNode, useActionState, useState } from "react";
import type { FormState } from "@/app/zeus/actions/projects";
import { resetTeamPassword, runAutomationNow, sendTestEmails, sendTestPush } from "@/app/zeus/actions/settings";
import { btnPrimary, btnSmall, cx, inputClass, Notice } from "@/components/admin/ui";

/** Wraps a settings section's fields with save state and messages. */
export function SettingsForm({ action, children, submitLabel = "Save changes", successText = "Saved." }: { action: (state: FormState, formData: FormData) => Promise<FormState>; children: ReactNode; submitLabel?: string; successText?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4 p-5">
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : submitLabel}</button>
        <span aria-live="polite" className="text-sm">
          {state.error && <span className="text-danger">{state.error}</span>}
          {state.ok && !pending && <span className="text-success">{successText}</span>}
        </span>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resetTeamPassword.bind(null, userId), {} as FormState);
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="cursor-pointer text-[13px] text-link underline">Reset password</button>;
  }
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {state.ok ? (
        <Notice tone="ok">Password changed. Share it with {name.split(/\s+/)[0]} privately; they’ve been signed out everywhere.</Notice>
      ) : (
        <span className="flex flex-wrap gap-2">
          <label htmlFor={`pw-${userId}`} className="sr-only">New password for {name}</label>
          <input id={`pw-${userId}`} name="password" type="password" autoComplete="new-password" minLength={10} required placeholder="New password (10+ characters)" className={cx(inputClass, "w-60")} />
          <button type="submit" disabled={pending} className={btnSmall}>{pending ? "Saving…" : "Set password"}</button>
          <button type="button" onClick={() => setOpen(false)} className={btnSmall}>Cancel</button>
        </span>
      )}
    </form>
  );
}

export function RunNowButton() {
  const [state, action, pending] = useActionState(runAutomationNow, {} as FormState);
  return (
    <form action={action} className="flex items-center gap-3">
      <span aria-live="polite" className="text-sm">
        {state.error && <span className="text-danger">{state.error}</span>}
        {state.ok && !pending && <span className="text-success">Done.</span>}
      </span>
      <button type="submit" disabled={pending} className={btnSmall}>{pending ? "Running…" : "Run now"}</button>
    </form>
  );
}

export function TestEmailButton() {
  const [state, action, pending] = useActionState(sendTestEmails, {} as FormState);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <button type="submit" disabled={pending} className={btnSmall}>{pending ? "Sending…" : "Send test emails"}</button>
      {state.error && <span className="text-[13px] text-danger">{state.error}</span>}
      {state.ok && !pending && <span className="text-[13px] text-success">{state.warning}</span>}
    </form>
  );
}

export function TestPushButton() {
  const [state, action, pending] = useActionState(sendTestPush, {} as FormState);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <button type="submit" disabled={pending} className={btnSmall}>{pending ? "Sending…" : "Send test alert"}</button>
      {state.error && <span className="text-[13px] text-danger">{state.error}</span>}
      {state.ok && !pending && <span className="text-[13px] text-success">{state.warning}</span>}
    </form>
  );
}
