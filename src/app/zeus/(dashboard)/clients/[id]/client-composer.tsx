"use client";

import Link from "next/link";
import { useState } from "react";
import { type ClientEmailPurpose, generateClientEmail, sendClientEmail } from "@/app/zeus/actions/clients";
import { DraftEditor, ToneButtons } from "@/components/admin/draft-editor";
import { SparkleIcon } from "@/components/admin/icons";
import { btnPrimary, Card, CardHeader, cx, inputClass, Notice, textareaClass } from "@/components/admin/ui";
import { useDraft } from "@/components/admin/use-draft";

const purposes: { id: ClientEmailPurpose; label: string }[] = [
  { id: "update", label: "Project update" },
  { id: "reminder", label: "Payment reminder" },
  { id: "followUp", label: "Follow up on a quote" },
  { id: "checkIn", label: "Check-in" },
  { id: "general", label: "Something else" },
];
const tones = ["Friendly", "Professional", "Concise"] as const;

type Props = {
  clientId: string;
  company: string;
  aiReady: boolean;
  contacts: { id: string; name: string; email: string }[];
  projects: { id: string; name: string }[];
  owes: boolean;
  closeHref: string;
};

export function ClientComposer({ clientId, company, aiReady, contacts, projects, owes, closeHref }: Props) {
  const draft = useDraft();
  const [purpose, setPurpose] = useState<ClientEmailPurpose>(owes ? "reminder" : "update");
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [tone, setTone] = useState<(typeof tones)[number]>("Friendly");
  const [notes, setNotes] = useState("");
  const contact = contacts.find((item) => item.id === contactId);

  const request = (length: "short" | "normal" | "long") => generateClientEmail(clientId, { purpose, contactId, projectId, notes, tone, length });

  return (
    <Card aria-labelledby="compose-title" className="w-full overflow-hidden">
      <CardHeader id="compose-title" title={`Email ${company}`} subtitle="Saved to this client’s history when sent" action={<Link href={closeHref} className="text-sm text-link">Close</Link>} />
      <div className="flex flex-col gap-4 border-b border-line bg-[#fbfcfe] p-5">
        {!aiReady && <Notice tone="warn">AI drafting isn’t set up yet (OPENAI_API_KEY is empty). You can still write and send the email yourself.</Notice>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">What’s it about?
            <select value={purpose} onChange={(event) => setPurpose(event.target.value as ClientEmailPurpose)} className={inputClass}>
              {purposes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">To
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} className={inputClass}>
              {contacts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {projects.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">Project
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass}>
                <option value="">None</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <ToneButtons legend="Tone" value={tone} options={tones} onChange={setTone} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">Key points for the AI <span className="font-normal text-muted">(optional)</span>
          <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Designs approved; we need the product photos by Friday" className={textareaClass} />
        </label>
        <div>
          <button type="button" disabled={!aiReady || draft.phase === "generating"} onClick={() => draft.generate(request)} className={cx(btnPrimary, "min-h-11")}>
            <SparkleIcon size={18} />{draft.phase === "idle" ? "Generate email" : draft.phase === "generating" ? "Generating…" : "Generate again"}
          </button>
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
          onManual={() => draft.manual("")}
          onSend={() => draft.send((payload, files) => sendClientEmail(clientId, { ...payload, purpose, contactId, projectId }, files))}
          sending={draft.sending}
          error={draft.error}
          warning={draft.warning}
          sentMessage={`Sent to ${contact?.email}. It’s now in the history below.`}
          recipients={contact ? `${contact.name} <${contact.email}>` : "—"}
          sendLabel="Send email"
        />
      </div>
    </Card>
  );
}
