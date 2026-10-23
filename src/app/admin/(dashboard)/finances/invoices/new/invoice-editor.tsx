"use client";

import { useMemo, useState, useTransition } from "react";
import { createInvoice } from "@/app/admin/actions/finance";
import { PlusIcon, SendIcon } from "@/components/admin/icons";
import { btnPrimary, btnSecondary, btnSmall, Card, cx, Field, inputClass, Notice, textareaClass } from "@/components/admin/ui";
import { money, supportedCurrencies } from "@/lib/admin/format";

type Milestone = { id: string; name: string; paymentPercent: number | null };
type Project = { id: string; clientId: string; name: string; currency: string; contractValue: number; milestones: Milestone[] };
type Client = { id: string; company: string; contact: string | null };
type Line = { key: number; description: string; quantity: string; rate: string };

type Props = {
  clients: Client[];
  projects: Project[];
  defaults: { clientId: string; projectId: string; currency: string; issueDate: string; dueDate: string; vatRate: number; notes: string };
};

let lineKey = 1;
const blankLine = (): Line => ({ key: lineKey++, description: "", quantity: "1", rate: "" });

export function InvoiceEditor({ clients, projects, defaults }: Props) {
  const [clientId, setClientId] = useState(defaults.clientId);
  const [projectId, setProjectId] = useState(defaults.projectId);
  const [milestoneId, setMilestoneId] = useState("");
  const [currency, setCurrency] = useState(defaults.currency);
  const [issueDate, setIssueDate] = useState(defaults.issueDate);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [vatRate, setVatRate] = useState(String(defaults.vatRate));
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState(defaults.notes);
  const [lines, setLines] = useState<Line[]>(() => [blankLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const clientProjects = projects.filter((project) => project.clientId === clientId);
  const project = projects.find((item) => item.id === projectId);
  const client = clients.find((item) => item.id === clientId);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate.replace(/,/g, "")) || 0), 0);
    const off = Math.min(Number(discount) || 0, subtotal);
    const vat = ((subtotal - off) * (Number(vatRate) || 0)) / 100;
    return { subtotal, off, vat, total: subtotal - off + vat };
  }, [lines, discount, vatRate]);

  function pickProject(id: string) {
    setProjectId(id);
    setMilestoneId("");
    const next = projects.find((item) => item.id === id);
    if (next) {
      setCurrency(next.currency);
    }
  }

  function pickMilestone(id: string) {
    setMilestoneId(id);
    const milestone = project?.milestones.find((item) => item.id === id);
    if (milestone && project) {
      const rate = milestone.paymentPercent ? Math.round((project.contractValue * milestone.paymentPercent) / 100) : 0;
      const line: Line = { key: lineKey++, description: `${project.name}: ${milestone.name}${milestone.paymentPercent ? ` (${milestone.paymentPercent}% of contract)` : ""}`, quantity: "1", rate: rate ? String(rate) : "" };
      setLines((current) => (current.length === 1 && !current[0].description && !current[0].rate ? [line] : [...current, line]));
    }
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function submit(send: boolean) {
    setError(undefined);
    setErrors({});
    startTransition(async () => {
      const result = await createInvoice({
        clientId,
        projectId,
        milestoneId,
        currency,
        issueDate,
        dueDate,
        vatRate,
        discount,
        notes,
        send,
        items: lines.map((line) => ({ description: line.description, quantity: line.quantity, rate: line.rate.replace(/,/g, "") })),
      });
      // createInvoice redirects on success, so only failures return here.
      if (result && !result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[1.6_1_560px] flex-col gap-5">
        {error && <Notice tone="bad">{error}</Notice>}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="m-0 font-display text-lg font-semibold">Bill to</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
            <Field label="Client" htmlFor="clientId" error={errors.clientId}>
              <select id="clientId" value={clientId} onChange={(event) => { setClientId(event.target.value); pickProject(""); }} className={inputClass}>
                <option value="">Choose a client</option>
                {clients.map((item) => <option key={item.id} value={item.id}>{item.company}</option>)}
              </select>
            </Field>
            <Field label="Project" htmlFor="projectId" hint={clientId && !clientProjects.length ? "This client has no projects" : undefined}>
              <select id="projectId" value={projectId} onChange={(event) => pickProject(event.target.value)} disabled={!clientProjects.length} className={inputClass}>
                <option value="">Not linked to a project</option>
                {clientProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Milestone" htmlFor="milestoneId" hint="Adds a line for the milestone payment">
              <select id="milestoneId" value={milestoneId} onChange={(event) => pickMilestone(event.target.value)} disabled={!project?.milestones.length} className={inputClass}>
                <option value="">None</option>
                {project?.milestones.map((item) => <option key={item.id} value={item.id}>{item.name}{item.paymentPercent ? ` · ${item.paymentPercent}%` : ""}</option>)}
              </select>
            </Field>
          </div>
          {client && <span className="text-[13px] text-muted">{client.contact ? `Sent to ${client.contact}` : "This client has no contact email yet, so you can save a draft but not send it."}</span>}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="m-0 font-display text-lg font-semibold">Lines</h2>
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[1fr_80px_150px_120px_36px] gap-2 text-xs tracking-[0.04em] text-muted sm:grid">
              <span>DESCRIPTION</span><span>QTY</span><span>RATE ({currency})</span><span className="text-right">AMOUNT</span><span />
            </div>
            {lines.map((line, index) => (
              <div key={line.key} className="grid grid-cols-[1fr_80px_150px_120px_36px] items-center gap-2 max-sm:grid-cols-[1fr_1fr] max-sm:rounded-lg max-sm:bg-surface max-sm:p-2.5">
                <input aria-label={`Line ${index + 1} description`} value={line.description} onChange={(event) => updateLine(line.key, { description: event.target.value })} placeholder="e.g. Design milestone" className={cx(inputClass, "max-sm:col-span-2", errors[`items.${index}.description`] && "border-danger")} />
                <input aria-label={`Line ${index + 1} quantity`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} className={inputClass} />
                <input aria-label={`Line ${index + 1} rate`} inputMode="decimal" value={line.rate} onChange={(event) => updateLine(line.key, { rate: event.target.value })} placeholder="0" className={cx(inputClass, errors[`items.${index}.rate`] && "border-danger")} />
                <span className="text-right text-sm font-medium max-sm:text-left">{money((Number(line.quantity) || 0) * (Number(line.rate.replace(/,/g, "")) || 0), currency)}</span>
                <button type="button" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="size-9 cursor-pointer rounded-lg text-muted hover:bg-surface hover:text-danger disabled:opacity-30">×</button>
              </div>
            ))}
            {errors.items && <span className="text-[13px] text-danger">{errors.items}</span>}
          </div>
          <button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className={cx(btnSmall, "self-start")}><PlusIcon size={14} />Add line</button>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="m-0 font-display text-lg font-semibold">Terms</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-4">
            <Field label="Currency" htmlFor="currency"><select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClass}>{supportedCurrencies.map((code) => <option key={code}>{code}</option>)}</select></Field>
            <Field label="Issue date" htmlFor="issueDate" error={errors.issueDate}><input id="issueDate" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className={inputClass} /></Field>
            <Field label="Due date" htmlFor="dueDate" error={errors.dueDate}><input id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} /></Field>
            <Field label="VAT %" htmlFor="vatRate"><input id="vatRate" inputMode="decimal" value={vatRate} onChange={(event) => setVatRate(event.target.value)} className={inputClass} /></Field>
            <Field label="Discount" htmlFor="discount" error={errors.discount}><input id="discount" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} className={inputClass} /></Field>
          </div>
          <Field label="Notes on the invoice" htmlFor="notes"><textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className={textareaClass} /></Field>
        </Card>
      </div>

      <Card aria-label="Totals" className="sticky top-6 flex min-w-0 flex-[1_1_280px] flex-col gap-3 p-5">
        <h2 className="m-0 font-display text-lg font-semibold">Summary</h2>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
          <dt className="text-muted">Subtotal</dt><dd className="m-0 text-right">{money(totals.subtotal, currency, { decimals: true })}</dd>
          {totals.off > 0 && <><dt className="text-muted">Discount</dt><dd className="m-0 text-right">−{money(totals.off, currency, { decimals: true })}</dd></>}
          <dt className="text-muted">VAT ({Number(vatRate) || 0}%)</dt><dd className="m-0 text-right">{money(totals.vat, currency, { decimals: true })}</dd>
          <dt className="border-t border-line pt-2 font-semibold">Total due</dt><dd className="m-0 border-t border-line pt-2 text-right font-display text-xl font-bold">{money(totals.total, currency, { decimals: true })}</dd>
        </dl>
        {project && <span className="text-[13px] text-muted">Contract value: {money(project.contractValue, project.currency)}</span>}
        <div className="flex flex-col gap-2 pt-2">
          <button type="button" disabled={pending || !client?.contact} onClick={() => submit(true)} className={cx(btnPrimary, "min-h-11")}><SendIcon size={16} />{pending ? "Saving…" : "Save and email to client"}</button>
          <button type="button" disabled={pending} onClick={() => submit(false)} className={btnSecondary}>Save as draft</button>
        </div>
      </Card>
    </div>
  );
}
