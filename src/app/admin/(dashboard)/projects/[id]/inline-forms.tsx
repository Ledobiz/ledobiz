"use client";

import { useActionState, useState } from "react";
import { addExpense, addMilestone, type FormState, updateMilestone } from "@/app/admin/actions/projects";
import { btnPrimary, btnSmall, cx, inputClass, Notice } from "@/components/admin/ui";
import { supportedCurrencies } from "@/lib/admin/format";

type MilestoneValues = { id: string; status: string; progress: number; forecastEnd: string; blocker: string; ownerId: string };

export function MilestoneEditor({ milestone, team }: { milestone: MilestoneValues; team: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(milestone.status);
  const [state, action, pending] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await updateMilestone(milestone.id, previous, formData);
    if (result.ok) {
      setOpen(false);
    }
    return result;
  }, {});

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={btnSmall}>Update</button>;
  }
  return (
    <form action={action} className="col-span-full mt-2 grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-3 rounded-lg bg-surface p-3.5">
      {state.error && <div className="col-span-full"><Notice tone="bad">{state.error}</Notice></div>}
      <label className="flex flex-col gap-1.5 text-sm font-medium">Status
        <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
          <option value="PENDING">Pending</option>
          <option value="ONGOING">Ongoing</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Progress %
        <input name="progress" type="number" min={0} max={100} step={5} defaultValue={milestone.progress} disabled={status === "COMPLETED"} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Forecast finish
        <input name="forecastEnd" type="date" defaultValue={milestone.forecastEnd} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Owner
        <select name="ownerId" defaultValue={milestone.ownerId} className={inputClass}>
          <option value="">Nobody yet</option>
          {team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label>
      <label className="col-span-full flex flex-col gap-1.5 text-sm font-medium">Blocker <span className="font-normal text-muted">(leave empty if none)</span>
        <input name="blocker" defaultValue={milestone.blocker} placeholder="e.g. Waiting for the client’s payment gateway keys" className={inputClass} />
      </label>
      <div className="col-span-full flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btnSmall}>Cancel</button>
      </div>
    </form>
  );
}

export function AddMilestoneForm({ projectId }: { projectId: string }) {
  // React resets the uncontrolled fields after each submit.
  const [state, action, pending] = useActionState(addMilestone.bind(null, projectId), {} as FormState);
  return (
    <form action={action} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] items-end gap-3 border-t border-line px-5 py-4">
      {state.error && <div className="col-span-full"><Notice tone="bad">{state.error}</Notice></div>}
      <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium max-sm:col-span-full">New milestone<input name="name" required className={inputClass} placeholder="e.g. Payments integration" /></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Start<input name="plannedStart" type="date" required className={inputClass} /></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">End<input name="plannedEnd" type="date" required className={inputClass} /></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Payment %<input name="paymentPercent" type="number" min={0} max={100} className={inputClass} /></label>
      <button type="submit" disabled={pending} className={cx(btnSmall, "min-h-10")}>{pending ? "Adding…" : "Add milestone"}</button>
    </form>
  );
}

const categories = ["Hosting", "Software licences", "Freelancers", "Stock assets", "App store fees", "Travel", "Other"];

export function AddExpenseForm({ projectId, currency }: { projectId: string | null; currency: string }) {
  // React resets the uncontrolled fields after each submit.
  const [state, action, pending] = useActionState(addExpense.bind(null, projectId), {} as FormState);
  return (
    <form action={action} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] items-end gap-3 border-t border-line px-5 py-4">
      {state.error && <div className="col-span-full"><Notice tone="bad">{state.error}</Notice></div>}
      <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium max-sm:col-span-full">Description<input name="description" required className={inputClass} placeholder="e.g. Vercel Pro, March" /></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Category
        <select name="category" className={inputClass}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Amount<input name="amount" inputMode="decimal" required className={inputClass} /></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Currency
        <select name="currency" defaultValue={currency} className={inputClass}>{supportedCurrencies.map((code) => <option key={code}>{code}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Date<input name="spentOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></label>
      <button type="submit" disabled={pending} className={cx(btnSmall, "min-h-10")}>{pending ? "Adding…" : "Add expense"}</button>
    </form>
  );
}
