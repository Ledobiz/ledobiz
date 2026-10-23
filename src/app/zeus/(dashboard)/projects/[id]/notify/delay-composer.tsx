"use client";

import { useState } from "react";
import { type DelayKind, generateDelayEmail, sendDelayEmail } from "@/app/zeus/actions/projects";
import { DraftEditor, ToneButtons } from "@/components/admin/draft-editor";
import { SparkleIcon } from "@/components/admin/icons";
import { btnPrimary, Card, cx, inputClass, Notice, textareaClass } from "@/components/admin/ui";
import { useDraft } from "@/components/admin/use-draft";

const kinds: { id: DelayKind; label: string; hint: string }[] = [
  { id: "extension", label: "Ask for an extension", hint: "Propose a new date and ask them to agree" },
  { id: "miss", label: "We will miss the deadline", hint: "Confirm the slip and share the new plan" },
  { id: "warning", label: "Early warning", hint: "Flag the risk before committing to a date" },
];
const reasonOptions = ["Waiting on content or feedback from the client", "Third-party service or API delays", "Scope grew beyond the agreed brief", "Bugs found in testing need more time", "Team member unavailable", "App store review is taking longer"];
const offerOptions = ["Launch the core features first, the rest in a second release", "Extra weekly progress calls until launch", "Discount on the final milestone", "Free extra month of support"];
const tones = ["Reassuring", "Formal", "Direct"] as const;

type Props = { projectId: string; aiReady: boolean; recipient: string | null; cc: string | null; suggestedDate: string; signer: string; defaultSubject: string; blockers: string[] };

export function DelayComposer({ projectId, aiReady, recipient, cc, suggestedDate, defaultSubject, blockers }: Props) {
  const draft = useDraft();
  const [kind, setKind] = useState<DelayKind>("extension");
  const [newDate, setNewDate] = useState(suggestedDate);
  const [reasons, setReasons] = useState<string[]>(blockers.slice(0, 2));
  const [offers, setOffers] = useState<string[]>([]);
  const [tone, setTone] = useState<(typeof tones)[number]>("Reassuring");
  const [extra, setExtra] = useState("");
  const [moveDeadline, setMoveDeadline] = useState(true);

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const request = (length: "short" | "normal" | "long") => generateDelayEmail(projectId, { kind, newDate, reasons, offers, extra, tone, length });

  if (!recipient) {
    return <Notice tone="warn">This client has no contact email yet. Add a contact on the client page, then come back.</Notice>;
  }

  return (
    <Card className="min-w-0 flex-[1.8_1_560px] overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line bg-[#fbfcfe] p-5">
        {!aiReady && <Notice tone="warn">AI drafting isn’t set up yet (OPENAI_API_KEY is empty). You can still write and send the email yourself.</Notice>}
        <fieldset className="m-0 grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-medium">What do you need to tell them?</legend>
          {kinds.map((item) => (
            <label key={item.id} className={cx("flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3", kind === item.id ? "border-midnight bg-white shadow-[inset_0_0_0_1px_var(--color-midnight)]" : "border-control bg-white")}>
              <span className="flex items-center gap-2 font-medium"><input type="radio" name="kind" checked={kind === item.id} onChange={() => setKind(item.id)} className="accent-midnight" />{item.label}</span>
              <span className="pl-6 text-[13px] text-muted">{item.hint}</span>
            </label>
          ))}
        </fieldset>

        {kind !== "warning" && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">New launch date
              <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className={cx(inputClass, "w-auto")} />
            </label>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={moveDeadline} onChange={(event) => setMoveDeadline(event.target.checked)} className="size-[18px] accent-midnight" />
              Move the project deadline to this date when sent
            </label>
          </div>
        )}

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-medium">Reasons</legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...blockers, ...reasonOptions])].map((reason) => (
              <button key={reason} type="button" aria-pressed={reasons.includes(reason)} onClick={() => toggle(reasons, reason, setReasons)} className={cx("min-h-9 cursor-pointer rounded-full border px-3 text-left text-[13px]", reasons.includes(reason) ? "border-midnight bg-midnight text-white" : "border-control bg-white text-midnight")}>
                {reason}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-medium">What can we offer? <span className="font-normal text-muted">(optional)</span></legend>
          <div className="flex flex-wrap gap-2">
            {offerOptions.map((offer) => (
              <button key={offer} type="button" aria-pressed={offers.includes(offer)} onClick={() => toggle(offers, offer, setOffers)} className={cx("min-h-9 cursor-pointer rounded-full border px-3 text-left text-[13px]", offers.includes(offer) ? "border-midnight bg-midnight text-white" : "border-control bg-white text-midnight")}>
                {offer}
              </button>
            ))}
          </div>
        </fieldset>

        <ToneButtons legend="Tone" value={tone} options={tones} onChange={setTone} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">Anything else the AI should know? <span className="font-normal text-muted">(optional)</span>
          <textarea rows={2} value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="e.g. The payment gateway keys arrived 9 days late" className={textareaClass} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!aiReady || draft.phase === "generating"} onClick={() => draft.generate(request)} className={cx(btnPrimary, "min-h-11")}>
            <SparkleIcon size={18} />
            {draft.phase === "idle" ? "Generate email" : draft.phase === "generating" ? "Generating…" : "Generate again"}
          </button>
          <span className="text-[13px] text-muted">Be specific about dates. Clients trust honesty more than excuses.</span>
        </div>
      </div>
      <div className="p-5">
        <DraftEditor
          phase={draft.phase}
          subject={draft.subject}
          body={draft.body}
          onSubject={draft.setSubject}
          onBody={draft.setBody}
          attachments={draft.attachments}
          onAttachments={draft.setAttachments}
          onGenerate={(length) => draft.generate(request, length)}
          onManual={() => draft.manual(defaultSubject)}
          onSend={() => draft.send((payload, files) => sendDelayEmail(projectId, { ...payload, newDate: kind === "warning" ? "" : newDate, moveDeadline: kind !== "warning" && moveDeadline }, files))}
          sending={draft.sending}
          error={draft.error}
          warning={draft.warning}
          sentMessage={`Email sent${moveDeadline && kind !== "warning" ? " and the deadline updated" : ""}. It’s saved in the client’s correspondence.`}
          recipients={<>{recipient}{cc && <span className="text-muted"> · cc {cc}</span>}</>}
          generatingLabel="Writing the deadline email…"
          sendLabel="Send email"
        />
      </div>
    </Card>
  );
}
