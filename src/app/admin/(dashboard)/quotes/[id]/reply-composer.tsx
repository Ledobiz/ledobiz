"use client";

import { useState } from "react";
import { generateQuoteReply, sendQuoteReply } from "@/app/admin/actions/quotes";
import { DraftEditor, ToneButtons } from "@/components/admin/draft-editor";
import { SparkleIcon } from "@/components/admin/icons";
import { btnPrimary, Card, inputClass, Notice, textareaClass } from "@/components/admin/ui";
import { useDraft } from "@/components/admin/use-draft";

const tones = ["Friendly", "Professional", "Concise"] as const;
const nextSteps = ["Book a free discovery call", "Answer a few follow-up questions", "Review the attached proposal"];

type Props = {
  quoteId: string;
  recipientName: string;
  recipientEmail: string;
  currency: string;
  aiReady: boolean;
  defaultSubject: string;
};

export function ReplyComposer({ quoteId, recipientName, recipientEmail, currency, aiReady, defaultSubject }: Props) {
  const draft = useDraft();
  const [tone, setTone] = useState<(typeof tones)[number]>("Friendly");
  const [estimateFrom, setEstimateFrom] = useState("");
  const [estimateTo, setEstimateTo] = useState("");
  const [timeline, setTimeline] = useState("");
  const [nextStep, setNextStep] = useState(nextSteps[0]);
  const [similarProject, setSimilarProject] = useState("");
  const [includeCalendar, setIncludeCalendar] = useState(true);
  const [extra, setExtra] = useState("");

  const request = (length: "short" | "normal" | "long") =>
    generateQuoteReply(quoteId, { tone, length, estimateFrom, estimateTo, timeline, nextStep, similarProject, includeCalendar, extra });

  return (
    <Card aria-labelledby="reply-title" className="min-w-0 flex-[1.5_1_520px] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 id="reply-title" className="m-0 font-display text-lg font-semibold">Reply to {recipientName.split(/\s+/)[0]}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-[#15627b]"><SparkleIcon size={14} />Compose with AI</span>
      </div>

      <div className="flex flex-col gap-4 border-b border-line bg-[#fbfcfe] p-5">
        {!aiReady && <Notice tone="warn">AI drafting isn’t set up yet (OPENAI_API_KEY is empty). You can still write and send the reply yourself.</Notice>}
        <p className="m-0 text-muted">The AI uses the request on the left, our company details and anything you add here.</p>
        <ToneButtons legend="Tone" value={tone} options={tones} onChange={setTone} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3.5">
          <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 text-sm font-medium">Estimate range ({currency})</legend>
            <div className="flex items-center gap-1.5">
              <input aria-label="Estimate from" value={estimateFrom} onChange={(event) => setEstimateFrom(event.target.value)} placeholder="8,500,000" className={inputClass} />
              <span aria-hidden="true">–</span>
              <input aria-label="Estimate to" value={estimateTo} onChange={(event) => setEstimateTo(event.target.value)} placeholder="11,000,000" className={inputClass} />
            </div>
          </fieldset>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="est-time" className="text-sm font-medium">Proposed timeline</label>
            <input id="est-time" value={timeline} onChange={(event) => setTimeline(event.target.value)} placeholder="About 10 weeks" className={inputClass} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="next-step" className="text-sm font-medium">Next step to ask for</label>
            <select id="next-step" value={nextStep} onChange={(event) => setNextStep(event.target.value)} className={inputClass}>
              {nextSteps.map((step) => <option key={step}>{step}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="similar" className="text-sm font-medium">Similar past project to mention <span className="font-normal text-muted">(optional)</span></label>
          <input id="similar" value={similarProject} onChange={(event) => setSimilarProject(event.target.value)} placeholder="e.g. the MetroEyes appointment booking platform" className={inputClass} />
        </div>
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2">
          <input type="checkbox" checked={includeCalendar} onChange={(event) => setIncludeCalendar(event.target.checked)} className="size-[18px] accent-midnight" />
          Include a calendar booking link
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="extra" className="text-sm font-medium">Anything else the AI should know? <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="extra" rows={2} value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="e.g. Ask whether they need SMS reminders" className={textareaClass} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!aiReady || draft.phase === "generating"} onClick={() => draft.generate(request)} className={`${btnPrimary} min-h-11`}>
            <SparkleIcon size={18} />
            {draft.phase === "idle" ? "Generate reply" : draft.phase === "generating" ? "Generating…" : "Generate again"}
          </button>
          <span className="text-[13px] text-muted">AI drafts are suggestions. Check prices and dates before sending.</span>
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
          onSend={() => draft.send((payload, files) => sendQuoteReply(quoteId, payload, files))}
          sending={draft.sending}
          error={draft.error}
          warning={draft.warning}
          sentMessage={`Reply sent to ${recipientEmail}. The quote is now marked as Replied.`}
          recipients={`${recipientName} <${recipientEmail}>`}
          generatingLabel={`Writing a reply for ${recipientName.split(/\s+/)[0]}…`}
          sendLabel="Send reply"
        />
      </div>
    </Card>
  );
}
