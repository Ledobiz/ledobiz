import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteExpense, deleteMilestone, logProjectUpdate } from "@/app/admin/actions/projects";
import { AlertIcon, ExternalIcon, MailIcon, PlusIcon } from "@/components/admin/icons";
import { healthTone, invoiceLabel, invoiceTone, milestoneStatusLabel, projectStatusLabel } from "@/components/admin/status";
import { Avatar, btnPrimary, btnSecondary, btnSmall, btnWarn, Card, CardHeader, Chip, cx, DataTable, EmptyState, inputClass, PageHeader, ProgressBar, Stat, td } from "@/components/admin/ui";
import { invoiceStatus, invoiceTotals, milestoneEnd, milestoneVariance, projectHealth } from "@/lib/admin/domain";
import { daysBetween, formatDate, formatDateTime, formatShortDate, money, moneyShort, num, toDateInput } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings, readRates, toReporting } from "@/lib/server/settings";
import { AddExpenseForm, AddMilestoneForm, MilestoneEditor } from "./inline-forms";
import { ProjectEmails } from "./project-emails";

export const metadata: Metadata = { title: "Project" };

const milestoneTone = { PENDING: "neutral", ONGOING: "info", COMPLETED: "ok" } as const;

export default async function ProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  const user = await requireUser("projects");
  const { id } = await params;
  const project = await db().project.findUnique({
    where: { id },
    include: {
      client: { include: { contacts: { orderBy: { isPrimary: "desc" } } } },
      lead: { select: { id: true, name: true, email: true } },
      quote: { select: { id: true, reference: true } },
      milestones: { orderBy: { position: "asc" }, include: { owner: { select: { name: true } } } },
      expenses: { orderBy: { spentOn: "desc" } },
      invoices: { orderBy: { issueDate: "desc" }, include: { items: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 15, include: { user: { select: { name: true } } } },
      emails: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, subject: true, category: true, status: true, createdAt: true } },
    },
  });
  if (!project) {
    notFound();
  }
  const [team, settings, welcome] = await Promise.all([
    db().user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSettings(),
    db().email.findFirst({ where: { projectId: id, category: "WELCOME", status: { in: ["SENT", "NOT_SENT"] } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const rates = readRates(settings);
  const now = new Date();
  const canEdit = user.role !== "MEMBER";
  const showMoney = user.role === "ADMIN" || user.role === "FINANCE" || user.role === "PROJECT_LEAD";
  const cur = project.currency;
  const health = projectHealth(project, project.milestones, now);

  const spent = project.expenses.reduce((sum, expense) => sum + toReporting(expense.amount, expense.currency, rates) / (rates[cur] ?? 1), 0);
  const contract = num(project.contractValue);
  const profit = contract - Math.max(num(project.expenseBudget), spent);
  const invoices = project.invoices.map((invoice) => ({ invoice, totals: invoiceTotals(invoice.items, invoice.vatRate, invoice.discount), display: invoiceStatus(invoice, now) }));
  const received = invoices.filter((row) => row.invoice.status === "PAID").reduce((sum, row) => sum + row.totals.subtotal - row.totals.discount, 0);
  const invoiced = invoices.filter((row) => row.invoice.status !== "VOID" && row.invoice.status !== "DRAFT").reduce((sum, row) => sum + row.totals.subtotal - row.totals.discount, 0);
  const contact = project.client.contacts[0];

  // Timeline scale: from the earliest planned start to the latest of the deadline and every forecast.
  const starts = project.milestones.map((m) => m.plannedStart.getTime());
  const ends = project.milestones.map((m) => Math.max(m.plannedEnd.getTime(), milestoneEnd(m).getTime()));
  const scaleStart = Math.min(...starts, project.startDate?.getTime() ?? Infinity);
  const scaleEnd = Math.max(...ends, project.deadline?.getTime() ?? 0, health.forecastLaunch?.getTime() ?? 0);
  const span = Math.max(scaleEnd - scaleStart, 1);
  const pos = (date: Date) => `${(((date.getTime() - scaleStart) / span) * 100).toFixed(2)}%`;
  const width = (from: Date, to: Date) => `${Math.max(((to.getTime() - from.getTime()) / span) * 100, 0.8).toFixed(2)}%`;
  const hasTimeline = project.milestones.length > 0 && Number.isFinite(scaleStart);

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/admin/projects", label: "Projects" }]}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {project.name}
            <Chip tone={project.status === "ONGOING" ? "info" : project.status === "COMPLETED" ? "ok" : "neutral"}>{projectStatusLabel[project.status]}</Chip>
            {project.status !== "PENDING" && <Chip tone={healthTone[health.health]}>{health.label}</Chip>}
          </span>
        }
        subtitle={<><Link href={`/admin/clients/${project.clientId}`} className="text-link">{project.client.company}</Link> · {project.service}{project.quote ? <> · from quote <Link href={`/admin/quotes/${project.quote.id}`} className="text-link">{project.quote.reference}</Link></> : null}</>}
        actions={
          <>
            {canEdit && <Link href={`/admin/projects/${project.id}/edit`} className={btnSecondary}>Edit details</Link>}
            {canEdit && user.role !== "PROJECT_LEAD" && <Link href={`/admin/finances/invoices/new?project=${project.id}`} className={btnSecondary}><PlusIcon size={16} />New invoice</Link>}
            {project.status === "ONGOING" && (
              <Link href={`/admin/projects/${project.id}/notify`} className={health.health === "BEHIND" || health.health === "AT_RISK" ? btnWarn : btnSecondary}>
                <MailIcon size={16} />Email client about deadline
              </Link>
            )}
          </>
        }
      />

      {health.health === "BEHIND" && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f1b4b4] bg-[#fdecec] px-4 py-3 text-sm text-[#7d1a1a]">
          <AlertIcon size={18} />
          <span className="flex-1">Forecast launch is <strong>{formatDate(health.forecastLaunch)}</strong>, {health.daysLate} day{health.daysLate === 1 ? "" : "s"} after the agreed deadline of {formatDate(project.deadline)}. Let the client know early.</span>
          <Link href={`/admin/projects/${project.id}/notify`} className={btnPrimary}>Write the email</Link>
        </div>
      )}

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-3">
        {showMoney && <Stat label="Contract value" value={moneyShort(contract, cur)} note={project.contractType} />}
        {showMoney && <Stat label="Received" value={moneyShort(received, cur)} note={contract ? `${Math.round((received / contract) * 100)}% paid · ${moneyShort(invoiced - received, cur)} outstanding` : undefined} />}
        {showMoney && <Stat label="Expenses" value={moneyShort(spent, cur)} note={num(project.expenseBudget) ? `of ${moneyShort(project.expenseBudget, cur)} budget` : "No budget set"} noteTone={spent > num(project.expenseBudget) && num(project.expenseBudget) > 0 ? "bad" : "neutral"} />}
        {showMoney && <Stat label={project.status === "COMPLETED" ? "Final profit" : "Projected profit"} value={moneyShort(profit, cur)} note={contract ? `${Math.round((profit / contract) * 100)}% margin · target ${num(settings.targetMargin)}%` : undefined} noteTone={contract && (profit / contract) * 100 >= num(settings.targetMargin) ? "ok" : "warn"} />}
        <Stat label="Work done" value={`${health.workPercent}%`} note={project.status === "ONGOING" ? `${health.timePercent}% of the time used` : undefined} noteTone={healthTone[health.health]} />
        <Stat label="Deadline" value={formatShortDate(project.deadline)} note={project.deadline && project.status !== "COMPLETED" ? (daysBetween(now, project.deadline) >= 0 ? `${daysBetween(now, project.deadline)} days left` : `${-daysBetween(now, project.deadline)} days ago`) : project.deliveredAt ? `Delivered ${formatShortDate(project.deliveredAt)}` : undefined} />
      </section>

      <Card aria-labelledby="timeline-title" className="overflow-hidden">
        <CardHeader id="timeline-title" title="Timeline" subtitle="Planned dates against the current forecast" action={
          <span className="flex flex-wrap gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-[#cfd6e2]" />Planned</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-river" />Forecast / actual</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-danger" />Deadline</span>
          </span>
        } />
        {hasTimeline ? (
          <div className="overflow-x-auto">
            <div className="flex min-w-[640px] flex-col gap-1 px-5 py-4">
              {project.milestones.map((milestone) => {
                const variance = milestoneVariance(milestone, now);
                const actualEnd = milestone.status !== "COMPLETED" && !milestone.forecastEnd && milestone.plannedEnd < now ? now : milestoneEnd(milestone);
                return (
                  <div key={milestone.id} className="grid grid-cols-[180px_1fr_90px] items-center gap-3 py-1.5">
                    <span className="truncate text-sm font-medium" title={milestone.name}>{milestone.name}</span>
                    <span className="relative block h-7">
                      <span className="absolute top-1 block h-2 rounded-full bg-[#cfd6e2]" style={{ left: pos(milestone.plannedStart), width: width(milestone.plannedStart, milestone.plannedEnd) }} title={`Planned ${formatShortDate(milestone.plannedStart)} – ${formatShortDate(milestone.plannedEnd)}`} />
                      <span className={cx("absolute top-4 block h-2 rounded-full", variance > 0 ? "bg-danger" : milestone.status === "COMPLETED" ? "bg-salsify" : "bg-river")} style={{ left: pos(milestone.plannedStart), width: width(milestone.plannedStart, actualEnd) }} title={`${milestone.status === "COMPLETED" ? "Finished" : "Forecast"} ${formatShortDate(actualEnd)}`} />
                      {project.deadline && <span aria-hidden="true" className="absolute top-0 h-7 w-0.5 bg-danger" style={{ left: pos(project.deadline) }} />}
                    </span>
                    <span className={cx("text-right text-xs font-medium", variance > 0 ? "text-danger" : "text-muted")}>{variance > 0 ? `+${variance}d late` : variance < 0 ? `${-variance}d early` : "On plan"}</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-[180px_1fr_90px] gap-3 pt-1 text-xs text-muted">
                <span />
                <span className="flex justify-between"><span>{formatShortDate(new Date(scaleStart))}</span>{project.deadline && <span className="text-danger">Deadline {formatShortDate(project.deadline)}</span>}<span>{formatShortDate(new Date(scaleEnd))}</span></span>
                <span />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No milestones yet">Add milestones below to see the timeline.</EmptyState>
        )}
      </Card>

      <Card aria-labelledby="milestones-title" className="overflow-hidden">
        <CardHeader id="milestones-title" title="Milestones" subtitle={`${project.milestones.filter((m) => m.status === "COMPLETED").length} of ${project.milestones.length} completed`} />
        <ol className="m-0 flex list-none flex-col p-0">
          {project.milestones.map((milestone) => {
            const variance = milestoneVariance(milestone, now);
            return (
              <li key={milestone.id} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-t border-line px-5 py-4 first:border-t-0">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong>{milestone.position}. {milestone.name}</strong>
                    <Chip tone={milestoneTone[milestone.status]}>{milestoneStatusLabel[milestone.status]}</Chip>
                    {variance > 0 && <Chip tone="bad">{variance} day{variance === 1 ? "" : "s"} late</Chip>}
                    {milestone.paymentPercent !== null && <Chip tone="neutral">{milestone.paymentPercent}% payment</Chip>}
                  </span>
                  <span className="text-[13px] text-muted">
                    Planned {formatShortDate(milestone.plannedStart)} – {formatShortDate(milestone.plannedEnd)}
                    {milestone.completedAt ? ` · finished ${formatShortDate(milestone.completedAt)}` : milestone.forecastEnd ? ` · forecast ${formatShortDate(milestone.forecastEnd)}` : ""}
                    {milestone.owner ? ` · ${milestone.owner.name}` : ""}
                  </span>
                  {milestone.status !== "PENDING" && (
                    <span className="flex max-w-[360px] items-center gap-2.5">
                      <ProgressBar value={milestone.status === "COMPLETED" ? 100 : milestone.progress} tone={milestone.status === "COMPLETED" ? "ok" : variance > 0 ? "bad" : "info"} label={`${milestone.name} progress`} />
                      <span className="w-9 text-right text-[13px] font-medium">{milestone.status === "COMPLETED" ? 100 : milestone.progress}%</span>
                    </span>
                  )}
                  {milestone.blocker && <span className="inline-flex items-start gap-1.5 text-[13px] text-[#7a4800]"><AlertIcon size={14} className="mt-[3px] flex-none" />Blocked: {milestone.blocker}</span>}
                </div>
                <span className="flex gap-2">
                  <MilestoneEditor team={team} milestone={{ id: milestone.id, status: milestone.status, progress: milestone.progress, forecastEnd: toDateInput(milestone.forecastEnd), blocker: milestone.blocker ?? "", ownerId: milestone.ownerId ?? "" }} />
                  {canEdit && (
                    <form action={deleteMilestone.bind(null, milestone.id)}>
                      <button type="submit" aria-label={`Remove ${milestone.name}`} className={cx(btnSmall, "text-danger")}>Remove</button>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        {canEdit && <AddMilestoneForm projectId={project.id} />}
      </Card>

      {project.status !== "CANCELLED" && (
        <ProjectEmails
          projectId={project.id}
          clientId={project.clientId}
          recipient={contact ? `${contact.name} <${contact.email}>` : null}
          milestones={project.milestones.map((milestone) => ({ id: milestone.id, name: milestone.name, status: milestone.status }))}
          stagingUrl={project.stagingUrl ?? ""}
          canLaunch={canEdit && project.status !== "PENDING"}
          welcomeSentAt={welcome ? formatDateTime(welcome.createdAt) : null}
          defaultFreeSupportUntil={toDateInput(project.freeSupportUntil ?? new Date(now.getTime() + 30 * 86_400_000))}
          delivered={project.status === "COMPLETED"}
        />
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1.4_1_520px] flex-col gap-5">
          {showMoney && (
            <Card aria-labelledby="invoices-title" className="overflow-hidden">
              <CardHeader id="invoices-title" title="Invoices and payments" subtitle={`${moneyShort(received, cur)} received of ${moneyShort(contract, cur)}`} />
              {invoices.length === 0 ? (
                <EmptyState title="No invoices yet">Raise the deposit invoice when the client signs.</EmptyState>
              ) : (
                <DataTable head={[{ label: "Invoice" }, { label: "Issued" }, { label: "Status" }, { label: "Total", align: "right" }]} minWidth={520}>
                  {invoices.map(({ invoice, totals, display }) => (
                    <tr key={invoice.id}>
                      <td className={td}><Link href={`/admin/finances/invoices/${invoice.id}`} className="font-medium text-link">{invoice.number}</Link></td>
                      <td className={td}>{formatShortDate(invoice.issueDate)}</td>
                      <td className={td}><Chip tone={invoiceTone[display]}>{invoiceLabel[display]}</Chip></td>
                      <td className={`${td} text-right font-medium whitespace-nowrap`}>{money(totals.total, invoice.currency)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </Card>
          )}

          {showMoney && (
            <Card aria-labelledby="expenses-title" className="overflow-hidden">
              <CardHeader id="expenses-title" title="Expenses" subtitle={`${money(spent, cur)} spent${num(project.expenseBudget) ? ` of ${money(project.expenseBudget, cur)} budget` : ""}`} />
              {project.expenses.length === 0 ? (
                <EmptyState title="No expenses recorded">Hosting, licences, freelancers and other project costs go here.</EmptyState>
              ) : (
                <DataTable head={[{ label: "Date" }, { label: "Description" }, { label: "Category" }, { label: "Amount", align: "right" }, { label: "Actions", srOnly: true }]} minWidth={560}>
                  {project.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className={`${td} whitespace-nowrap`}>{formatShortDate(expense.spentOn)}</td>
                      <td className={td}>{expense.description}</td>
                      <td className={td}>{expense.category}</td>
                      <td className={`${td} text-right whitespace-nowrap`}>{money(expense.amount, expense.currency)}</td>
                      <td className={`${td} text-right`}>
                        {canEdit && <form action={deleteExpense.bind(null, expense.id)}><button type="submit" aria-label={`Delete ${expense.description}`} className="cursor-pointer text-[13px] text-danger underline">Delete</button></form>}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
              {canEdit && <AddExpenseForm projectId={project.id} currency={cur} />}
            </Card>
          )}

          <Card aria-labelledby="activity-title" className="flex flex-col gap-3.5 p-5">
            <h2 id="activity-title" className="m-0 font-display text-lg font-semibold">Activity and emails</h2>
            <form action={logProjectUpdate.bind(null, project.id)} className="flex gap-2">
              <label htmlFor="update" className="sr-only">Log an update</label>
              <input id="update" name="message" placeholder="Log an update, e.g. “Client approved the designs”" className={inputClass} />
              <button type="submit" className={btnSmall}>Log</button>
            </form>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {[
                ...project.activities.map((activity) => ({ key: activity.id, when: activity.createdAt, text: `${activity.message}${activity.user ? ` · ${activity.user.name}` : ""}`, email: false })),
                ...project.emails.map((email) => ({ key: email.id, when: email.createdAt, text: `Email: ${email.subject}${email.status === "SENT" ? "" : email.status === "NOT_SENT" ? " (not sent)" : email.status === "FAILED" ? " (failed)" : ""}`, email: true })),
              ]
                .sort((a, b) => b.when.getTime() - a.when.getTime())
                .map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <span className={cx("mt-[5px] size-2.5 flex-none rounded-full", item.email ? "bg-gold" : "bg-river")} />
                    <span className="flex flex-col"><span>{item.text}</span><span className="text-xs text-muted">{formatDateTime(item.when)}</span></span>
                  </li>
                ))}
            </ol>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <Card className="flex flex-col gap-3.5 p-5">
            <h2 className="m-0 font-display text-lg font-semibold">Details</h2>
            <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-sm">
              <dt className="text-muted">Start</dt><dd className="m-0">{formatDate(project.startDate)}</dd>
              <dt className="text-muted">Deadline</dt><dd className="m-0">{formatDate(project.deadline)}</dd>
              <dt className="text-muted">Forecast</dt><dd className={cx("m-0", health.daysLate > 0 && "font-medium text-danger")}>{formatDate(health.forecastLaunch)}</dd>
              <dt className="text-muted">Lead</dt><dd className="m-0">{project.lead ? <span className="inline-flex items-center gap-2"><Avatar name={project.lead.name} />{project.lead.name}</span> : "—"}</dd>
              <dt className="text-muted">Support</dt><dd className="m-0">{project.supportTerms ?? "—"}</dd>
            </dl>
            {project.techStack.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted">Tech stack</span>
                <span className="flex flex-wrap gap-1.5">{project.techStack.map((item) => <span key={item} className="rounded bg-surface px-2 py-0.5 text-[13px]">{item}</span>)}</span>
              </div>
            )}
            {(project.stagingUrl || project.repoUrl || project.designUrl) && (
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                {[["Staging site", project.stagingUrl], ["Repository", project.repoUrl], ["Designs", project.designUrl]].filter(([, url]) => url).map(([label, url]) => (
                  <a key={label} href={url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-link">{label}<ExternalIcon size={14} /></a>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="m-0 font-display text-lg font-semibold">Client contact</h2>
            {contact ? (
              <div className="flex flex-col gap-1 text-sm">
                <strong>{contact.name}</strong>
                {contact.role && <span className="text-muted">{contact.role}</span>}
                <a href={`mailto:${contact.email}`} className="text-link">{contact.email}</a>
                {contact.phone && <span>{contact.phone}</span>}
              </div>
            ) : (
              <span className="text-sm text-muted">No contact on file.</span>
            )}
            <Link href={`/admin/clients/${project.clientId}`} className={cx(btnSmall, "self-start")}>Open client</Link>
          </Card>
        </div>
      </div>
    </>
  );
}
