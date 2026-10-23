import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { saveQuoteNotes, setQuoteStatus } from "@/app/admin/actions/quotes";
import { projectTypeLabel, quoteLabel, quoteTone } from "@/components/admin/status";
import { btnSecondary, btnSmall, Card, Chip, cx, inputClass, PageHeader, textareaClass } from "@/components/admin/ui";
import { dueLabel, formatDateTime } from "@/lib/admin/format";
import { isAiConfigured } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { ReplyComposer } from "./reply-composer";

export const metadata: Metadata = { title: "Quote request" };

export default async function QuoteDetailPage({ params }: PageProps<"/admin/quotes/[id]">) {
  await requireUser("quotes");
  const { id } = await params;
  const quote = await db().quoteRequest.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
      emails: { orderBy: { createdAt: "desc" }, select: { id: true, subject: true, status: true, createdAt: true, category: true } },
      projects: { select: { id: true, name: true } },
    },
  });
  if (!quote) {
    notFound();
  }
  const settings = await getSettings();
  const due = dueLabel(new Date(quote.createdAt.getTime() + settings.quoteReplyHours * 3_600_000), new Date());
  const typeLabel = projectTypeLabel[quote.projectType] ?? quote.projectType;

  const timeline = [
    ...quote.activities.map((activity) => ({ when: activity.createdAt, text: `${activity.message}${activity.user ? ` · ${activity.user.name}` : ""}` })),
    ...quote.emails.map((email) => ({ when: email.createdAt, text: `Email: ${email.subject}${email.status === "SENT" ? "" : ` (${email.status === "NOT_SENT" ? "not sent" : "failed"})`}` })),
    { when: quote.createdAt, text: "Quote request received from the website" },
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/admin/quotes", label: "Quote requests" }]}
        title={<span className="flex flex-wrap items-center gap-2.5">{quote.name}<Chip tone={quoteTone[quote.status]}>{quoteLabel[quote.status]}</Chip></span>}
        subtitle={`${quote.company ? `${quote.company} · ` : ""}received ${formatDateTime(quote.createdAt)}${quote.sourcePath ? ` from ${quote.sourcePath}` : ""}`}
        actions={
          <>
            {quote.status === "NEW" && <Chip tone={due.overdue ? "bad" : due.soon ? "warn" : "neutral"} className="min-h-9 px-3">{due.text.replace("Due", "Reply due")}</Chip>}
            <form action={setQuoteStatus.bind(null, quote.id)} className="flex items-center gap-2">
              <label htmlFor="status" className="text-muted">Mark as</label>
              <select id="status" name="status" defaultValue={quote.status} className={cx(inputClass, "w-auto")}>
                <option value="NEW">New</option>
                <option value="REPLIED">Replied</option>
                <option value="WON">Won · create project</option>
                <option value="LOST">Lost</option>
              </select>
              <button type="submit" className={btnSecondary}>Update</button>
            </form>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 font-display text-lg font-semibold">What they submitted</h2>
              <span className="font-mono text-xs text-muted">{quote.reference}</span>
            </div>
            <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-3">
              <dt className="text-muted">Project type</dt><dd className="m-0 font-medium">{typeLabel}</dd>
              <dt className="text-muted">Budget</dt><dd className="m-0 font-medium">{quote.budget} {!quote.budget.startsWith("Not sure") && <span className="font-normal text-muted">({quote.currency})</span>}</dd>
              <dt className="text-muted">Launch</dt><dd className="m-0 font-medium">{quote.timeline}</dd>
              <dt className="text-muted">Features</dt>
              <dd className="m-0 flex flex-wrap gap-1.5">{quote.features.length ? quote.features.map((feature) => <span key={feature} className="rounded bg-surface px-2 py-0.5 text-[13px]">{feature}</span>) : <span className="text-muted">None picked</span>}</dd>
              <dt className="text-muted">Details</dt><dd className="m-0 whitespace-pre-line">{quote.details ? `“${quote.details}”` : <span className="text-muted">None given</span>}</dd>
            </dl>
            <div className="h-px bg-line" />
            <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-3">
              <dt className="text-muted">Email</dt><dd className="m-0"><a href={`mailto:${quote.email}`} className="text-link">{quote.email}</a></dd>
              <dt className="text-muted">Phone</dt><dd className="m-0">{quote.phone ? <>{quote.phone} <a href={`https://wa.me/${quote.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[13px] text-link">WhatsApp</a></> : "—"}</dd>
              <dt className="text-muted">Company</dt><dd className="m-0">{quote.company ?? "—"}</dd>
              {quote.clientId && <><dt className="text-muted">Client</dt><dd className="m-0"><Link href={`/admin/clients/${quote.clientId}`} className="text-link">Open client record</Link></dd></>}
              {quote.projects.map((project) => (
                <Fragment key={project.id}>
                  <dt className="text-muted">Project</dt>
                  <dd className="m-0"><Link href={`/admin/projects/${project.id}`} className="text-link">{project.name}</Link></dd>
                </Fragment>
              ))}
            </dl>
          </Card>

          <Card className="flex flex-col gap-2.5 p-5">
            <form action={saveQuoteNotes.bind(null, quote.id)} className="flex flex-col gap-2.5">
              <label htmlFor="notes" className="font-display text-lg font-semibold">Internal notes</label>
              <textarea id="notes" name="notes" rows={3} defaultValue={quote.internalNotes ?? ""} placeholder="Only your team can see these notes." className={textareaClass} />
              <button type="submit" className={cx(btnSmall, "self-start")}>Save notes</button>
            </form>
          </Card>

          <Card className="flex flex-col gap-3.5 p-5">
            <h2 className="m-0 font-display text-lg font-semibold">Activity</h2>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {timeline.map((item, index) => (
                <li key={`${item.when.getTime()}-${index}`} className="flex gap-3">
                  <span className="mt-[5px] size-2.5 flex-none rounded-full bg-river" />
                  <span className="flex flex-col"><span>{item.text}</span><span className="text-xs text-muted">{formatDateTime(item.when)}</span></span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <ReplyComposer
          quoteId={quote.id}
          recipientName={quote.name}
          recipientEmail={quote.email}
          currency={quote.currency}
          aiReady={isAiConfigured()}
          defaultSubject={`Your ${typeLabel.toLowerCase()} quote from Ledobiz · ${quote.reference}`}
        />
      </div>
    </>
  );
}
