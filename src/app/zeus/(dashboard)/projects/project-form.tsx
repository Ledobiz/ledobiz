"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/zeus/actions/projects";
import { btnPrimary, Card, cx, Field, inputClass, Notice } from "@/components/admin/ui";
import { supportedCurrencies } from "@/lib/admin/format";

export type ProjectFormValues = {
  name: string;
  clientId: string;
  quoteId: string;
  service: string;
  status: string;
  stage: string;
  currency: string;
  contractValue: string;
  expenseBudget: string;
  contractType: string;
  supportTerms: string;
  techStack: string;
  startDate: string;
  deadline: string;
  freeSupportUntil: string;
  leadId: string;
  stagingUrl: string;
  repoUrl: string;
  designUrl: string;
};

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: ProjectFormValues;
  clients: { id: string; company: string }[];
  team: { id: string; name: string }[];
  mode: "create" | "edit";
  newClient?: { company: string; name: string; email: string };
};

const services = ["Website", "Web app", "Mobile app", "Desktop software", "E-commerce", "Maintenance and support", "Consulting"];

export function ProjectForm({ action, values, clients, team, mode, newClient }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [clientMode, setClientMode] = useState<"existing" | "new">(values.clientId || clients.length ? "existing" : "new");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {state.ok && <Notice tone="ok">Project saved.</Notice>}
      <input type="hidden" name="quoteId" value={values.quoteId} />

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="m-0 font-display text-lg font-semibold">The project</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4">
          <Field label="Project name" htmlFor="name" error={errors.name} className="col-span-full">
            <input id="name" name="name" defaultValue={values.name} required className={inputClass} placeholder="e.g. Patient booking platform" />
          </Field>
          <Field label="Service" htmlFor="service" error={errors.service}>
            <select id="service" name="service" defaultValue={values.service || services[0]} className={inputClass}>
              {[...new Set([values.service, ...services].filter(Boolean))].map((service) => <option key={service}>{service}</option>)}
            </select>
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue={values.status} className={inputClass}>
              <option value="PENDING">Pending · not started</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </Field>
          <Field label="Stage" htmlFor="stage" hint="Shown on the list, e.g. “Awaiting deposit”">
            <input id="stage" name="stage" defaultValue={values.stage} className={inputClass} />
          </Field>
          <Field label="Project lead" htmlFor="leadId">
            <select id="leadId" name="leadId" defaultValue={values.leadId} className={inputClass}>
              <option value="">No lead yet</option>
              {team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </Field>
          <Field label="Tech stack" htmlFor="techStack" hint="Separate with commas" className="col-span-full">
            <input id="techStack" name="techStack" defaultValue={values.techStack} className={inputClass} placeholder="Next.js, PostgreSQL, React Native" />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-lg font-semibold">Client</h2>
          {mode === "create" && (
            <div role="radiogroup" aria-label="Client" className="flex gap-1 rounded-lg bg-surface p-1">
              {(["existing", "new"] as const).map((option) => (
                <button key={option} type="button" role="radio" aria-checked={clientMode === option} onClick={() => setClientMode(option)} className={cx("min-h-8 cursor-pointer rounded-md px-3 text-sm font-medium", clientMode === option ? "bg-white text-midnight shadow-sm" : "text-muted")}>
                  {option === "existing" ? "Existing client" : "New client"}
                </button>
              ))}
            </div>
          )}
        </div>
        {clientMode === "existing" || mode === "edit" ? (
          <Field label="Client" htmlFor="clientId" error={errors.clientId}>
            <select id="clientId" name="clientId" defaultValue={values.clientId} disabled={mode === "edit"} className={inputClass}>
              <option value="">Choose a client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.company}</option>)}
            </select>
          </Field>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
            <Field label="Company" htmlFor="newCompany" error={errors.clientId}>
              <input id="newCompany" name="newCompany" defaultValue={newClient?.company} className={inputClass} />
            </Field>
            <Field label="Contact name" htmlFor="newContactName">
              <input id="newContactName" name="newContactName" defaultValue={newClient?.name} className={inputClass} />
            </Field>
            <Field label="Contact email" htmlFor="newContactEmail">
              <input id="newContactEmail" name="newContactEmail" type="email" defaultValue={newClient?.email} className={inputClass} />
            </Field>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="m-0 font-display text-lg font-semibold">Money and timeline</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-4">
          <Field label="Currency" htmlFor="currency">
            <select id="currency" name="currency" defaultValue={values.currency} className={inputClass}>
              {supportedCurrencies.map((code) => <option key={code}>{code}</option>)}
            </select>
          </Field>
          <Field label="Contract value" htmlFor="contractValue" error={errors.contractValue}>
            <input id="contractValue" name="contractValue" inputMode="decimal" defaultValue={values.contractValue} className={inputClass} placeholder="18500000" />
          </Field>
          <Field label="Expense budget" htmlFor="expenseBudget" hint="Hosting, licences, freelancers" error={errors.expenseBudget}>
            <input id="expenseBudget" name="expenseBudget" inputMode="decimal" defaultValue={values.expenseBudget} className={inputClass} />
          </Field>
          <Field label="Contract type" htmlFor="contractType">
            <select id="contractType" name="contractType" defaultValue={values.contractType} className={inputClass}>
              <option>Fixed price</option>
              <option>Time and materials</option>
              <option>Retainer</option>
            </select>
          </Field>
          <Field label="Start date" htmlFor="startDate" error={errors.startDate}>
            <input id="startDate" name="startDate" type="date" defaultValue={values.startDate} className={inputClass} />
          </Field>
          <Field label="Deadline" htmlFor="deadline" error={errors.deadline}>
            <input id="deadline" name="deadline" type="date" defaultValue={values.deadline} className={inputClass} />
          </Field>
          {mode === "edit" && (
            <Field label="Free fixes until" htmlFor="freeSupportUntil" hint="Sends the support renewal email when it ends">
              <input id="freeSupportUntil" name="freeSupportUntil" type="date" defaultValue={values.freeSupportUntil} className={inputClass} />
            </Field>
          )}
          <Field label="Support after launch" htmlFor="supportTerms" className="col-span-full">
            <input id="supportTerms" name="supportTerms" defaultValue={values.supportTerms} className={inputClass} placeholder="e.g. 3 months free support, then ₦250,000 a month" />
          </Field>
        </div>
        {mode === "create" && (
          <label className="inline-flex min-h-8 cursor-pointer items-center gap-2">
            <input type="checkbox" name="standardMilestones" defaultChecked className="size-[18px] accent-midnight" />
            Add our five standard milestones, spread between the start date and deadline
          </label>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="m-0 font-display text-lg font-semibold">Links</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4">
          <Field label="Staging site" htmlFor="stagingUrl"><input id="stagingUrl" name="stagingUrl" type="url" defaultValue={values.stagingUrl} className={inputClass} /></Field>
          <Field label="Repository" htmlFor="repoUrl"><input id="repoUrl" name="repoUrl" type="url" defaultValue={values.repoUrl} className={inputClass} /></Field>
          <Field label="Designs" htmlFor="designUrl"><input id="designUrl" name="designUrl" type="url" defaultValue={values.designUrl} className={inputClass} /></Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={cx(btnPrimary, "min-h-11")}>{pending ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}</button>
      </div>
    </form>
  );
}
