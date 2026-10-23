"use client";

import { useActionState, useState } from "react";
import { addContact, createClient, logReceivedEmail, updateClient } from "@/app/admin/actions/clients";
import type { FormState } from "@/app/admin/actions/projects";
import { btnPrimary, btnSmall, Card, cx, Field, inputClass, Notice, textareaClass } from "@/components/admin/ui";

export type ClientValues = { company: string; industry: string; city: string; country: string; notes: string; supportPlanName: string; supportPlanPrice: string; supportPlanUntil: string };

function ClientFields({ values }: { values: ClientValues }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
      <Field label="Company" htmlFor="company" className="col-span-full"><input id="company" name="company" required defaultValue={values.company} className={inputClass} /></Field>
      <Field label="Industry" htmlFor="industry"><input id="industry" name="industry" defaultValue={values.industry} className={inputClass} placeholder="e.g. Healthcare" /></Field>
      <Field label="City" htmlFor="city"><input id="city" name="city" defaultValue={values.city} className={inputClass} /></Field>
      <Field label="Country" htmlFor="country"><input id="country" name="country" defaultValue={values.country} className={inputClass} /></Field>
      <Field label="Support plan" htmlFor="supportPlanName" hint="Leave empty if they have none"><input id="supportPlanName" name="supportPlanName" defaultValue={values.supportPlanName} className={inputClass} placeholder="e.g. Care plan · Standard" /></Field>
      <Field label="Plan price per month" htmlFor="supportPlanPrice"><input id="supportPlanPrice" name="supportPlanPrice" inputMode="decimal" defaultValue={values.supportPlanPrice} className={inputClass} /></Field>
      <Field label="Plan runs until" htmlFor="supportPlanUntil"><input id="supportPlanUntil" name="supportPlanUntil" type="date" defaultValue={values.supportPlanUntil} className={inputClass} /></Field>
      <Field label="Notes" htmlFor="notes" className="col-span-full"><textarea id="notes" name="notes" rows={3} defaultValue={values.notes} className={textareaClass} /></Field>
    </div>
  );
}

export function NewClientForm() {
  const [state, action, pending] = useActionState(createClient, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="m-0 font-display text-lg font-semibold">Company</h2>
        <ClientFields values={{ company: "", industry: "", city: "", country: "Nigeria", notes: "", supportPlanName: "", supportPlanPrice: "", supportPlanUntil: "" }} />
      </Card>
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="m-0 font-display text-lg font-semibold">Main contact</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
          <Field label="Name" htmlFor="contactName"><input id="contactName" name="contactName" required className={inputClass} /></Field>
          <Field label="Role" htmlFor="contactRole"><input id="contactRole" name="contactRole" className={inputClass} placeholder="e.g. Operations manager" /></Field>
          <Field label="Email" htmlFor="contactEmail"><input id="contactEmail" name="contactEmail" type="email" required className={inputClass} /></Field>
          <Field label="Phone" htmlFor="contactPhone"><input id="contactPhone" name="contactPhone" type="tel" className={inputClass} /></Field>
        </div>
      </Card>
      <div className="flex justify-end"><button type="submit" disabled={pending} className={cx(btnPrimary, "min-h-11")}>{pending ? "Saving…" : "Add client"}</button></div>
    </form>
  );
}

export function EditClientForm({ clientId, values }: { clientId: string; values: ClientValues }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await updateClient(clientId, previous, formData);
    if (result.ok) {
      setOpen(false);
    }
    return result;
  }, {});
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={btnSmall}>Edit</button>;
  }
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-surface p-4">
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <ClientFields values={values} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btnSmall}>Cancel</button>
      </div>
    </form>
  );
}

export function AddContactForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await addContact(clientId, previous, formData);
    if (result.ok) {
      setOpen(false);
    }
    return result;
  }, {});
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={cx(btnSmall, "self-start")}>Add contact</button>;
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-surface p-3.5">
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <input name="name" aria-label="Name" placeholder="Name" required className={inputClass} />
      <input name="role" aria-label="Role" placeholder="Role (optional)" className={inputClass} />
      <input name="email" aria-label="Email" type="email" placeholder="Email" required className={inputClass} />
      <input name="phone" aria-label="Phone" type="tel" placeholder="Phone (optional)" className={inputClass} />
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="receivesInvoices" className="size-4 accent-midnight" />Copy on invoices</label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Adding…" : "Add"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btnSmall}>Cancel</button>
      </div>
    </form>
  );
}

export function LogEmailForm({ clientId, defaultFrom }: { clientId: string; defaultFrom: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await logReceivedEmail(clientId, previous, formData);
    if (result.ok) {
      setOpen(false);
    }
    return result;
  }, {});
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={btnSmall}>Log a received email</button>;
  }
  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-lg bg-surface p-3.5">
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <p className="m-0 text-[13px] text-muted">Paste a reply the client sent to your inbox so the whole conversation lives here.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3">
        <input name="fromAddress" aria-label="From" type="email" defaultValue={defaultFrom} required className={inputClass} />
        <input name="receivedAt" aria-label="Received at" type="datetime-local" className={inputClass} />
      </div>
      <input name="subject" aria-label="Subject" placeholder="Subject" required className={inputClass} />
      <textarea name="body" aria-label="Message" rows={6} placeholder="Message" required className={textareaClass} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save to history"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btnSmall}>Cancel</button>
      </div>
    </form>
  );
}
