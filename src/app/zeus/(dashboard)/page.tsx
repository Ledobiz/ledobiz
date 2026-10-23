import type { Metadata } from "next";
import Link from "next/link";
import { MailIcon, PlusIcon, SparkleIcon } from "@/components/admin/icons";
import { healthTone, projectTypeLabel } from "@/components/admin/status";
import { btnPrimary, btnSmall, Card, CardHeader, Chip, DataTable, EmptyState, Notice, PageHeader, Stat, td, type Tone } from "@/components/admin/ui";
import { invoiceTotals, milestoneEnd, projectHealth } from "@/lib/admin/domain";
import { dueLabel, formatShortDate, moneyShort } from "@/lib/admin/format";
import { canAccess, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings, readRates, toReporting } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Overview" };

const DAY = 86_400_000;

export default async function OverviewPage({ searchParams }: PageProps<"/zeus">) {
  const user = await requireUser("overview");
  const { denied } = await searchParams;
  const now = new Date();
  const settings = await getSettings();
  const rates = readRates(settings);
  const since = new Date(now.getTime() - 90 * DAY);
  const showFinance = canAccess(user.role, "finance");
  const showQuotes = canAccess(user.role, "quotes");

  const [newQuotes, ongoing, paidInvoices, expenses] = await Promise.all([
    showQuotes ? db().quoteRequest.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "asc" }, take: 6 }) : [],
    db().project.findMany({
      where: { status: "ONGOING" },
      include: { client: { select: { company: true } }, milestones: { orderBy: { position: "asc" } } },
      orderBy: { deadline: "asc" },
    }),
    showFinance ? db().invoice.findMany({ where: { status: "PAID", paidAt: { gte: since } }, include: { items: true } }) : [],
    showFinance ? db().expense.findMany({ where: { spentOn: { gte: since } } }) : [],
  ]);
  const newQuoteCount = showQuotes ? await db().quoteRequest.count({ where: { status: "NEW" } }) : 0;

  const replyMs = settings.quoteReplyHours * 3_600_000;
  const lateQuotes = newQuotes.filter((quote) => quote.createdAt.getTime() + replyMs < now.getTime()).length;
  const revenue = paidInvoices.reduce((sum, invoice) => {
    const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
    return sum + toReporting(totals.subtotal - totals.discount, invoice.currency, rates);
  }, 0);
  const spent = expenses.reduce((sum, expense) => sum + toReporting(expense.amount, expense.currency, rates), 0);
  const profit = revenue - spent;

  const health = ongoing.map((project) => ({ project, health: projectHealth(project, project.milestones, now) }));
  const behind = health.filter((item) => item.health.health === "BEHIND" || item.health.health === "AT_RISK").length;

  const horizon = new Date(now.getTime() + 14 * DAY);
  const upcoming = ongoing
    .flatMap((project) => project.milestones.filter((m) => m.status !== "COMPLETED").map((m) => ({ project, milestone: m, end: milestoneEnd(m) })))
    .filter((item) => item.end <= horizon)
    .sort((a, b) => a.end.getTime() - b.end.getTime())
    .slice(0, 6);

  const firstName = user.name.split(/\s+/)[0];
  const cur = settings.reportingCurrency;

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" })}
        actions={canAccess(user.role, "projects") && user.role !== "MEMBER" ? <Link href="/zeus/projects/new" className={btnPrimary}><PlusIcon size={16} />New project</Link> : undefined}
      />
      {denied && <Notice tone="warn">Your role doesn’t have access to that section. Ask an admin if you need it.</Notice>}

      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
        {showQuotes && <Stat label="New quote requests" value={newQuoteCount} note={lateQuotes ? `${lateQuotes} past the ${settings.quoteReplyHours}-hour reply promise` : "All within the reply promise"} noteTone={lateQuotes ? "bad" : "ok"} />}
        <Stat label="Ongoing projects" value={ongoing.length} note={behind ? `${ongoing.length - behind} on track · ${behind} need attention` : "All on track"} noteTone={behind ? "warn" : "ok"} />
        {showFinance && <Stat label="Revenue · last 90 days" value={moneyShort(revenue, cur)} note="Paid invoices, before VAT" />}
        {showFinance && <Stat label="Profit · last 90 days" value={moneyShort(profit, cur)} note={revenue > 0 ? `${Math.round((profit / revenue) * 100)}% margin after expenses` : "No revenue yet"} noteTone={profit >= 0 ? "ok" : "bad"} />}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        {showQuotes && (
          <Card aria-labelledby="awaiting-title" className="min-w-0 flex-[999_1_560px] overflow-hidden">
            <CardHeader id="awaiting-title" title="Quotes awaiting a reply" subtitle={`We promise a reply within ${settings.quoteReplyHours} hours of each request.`} action={<Link href="/zeus/quotes" className="text-sm font-medium text-link">View all quotes</Link>} />
            {newQuotes.length === 0 ? (
              <EmptyState title="You’re all caught up">New requests from the website appear here.</EmptyState>
            ) : (
              <DataTable head={[{ label: "Contact" }, { label: "Project" }, { label: "Budget" }, { label: "Reply due" }, { label: "Action", srOnly: true }]} minWidth={640}>
                {newQuotes.map((quote) => {
                  const due = dueLabel(new Date(quote.createdAt.getTime() + replyMs), now);
                  const tone: Tone = due.overdue ? "bad" : due.soon ? "warn" : "neutral";
                  return (
                    <tr key={quote.id} className="hover:bg-[#f8f9fc]">
                      <td className={td}><span className="flex flex-col"><strong>{quote.name}</strong><span className="text-[13px] text-muted">{quote.company ?? quote.email}</span></span></td>
                      <td className={td}>{projectTypeLabel[quote.projectType] ?? quote.projectType}</td>
                      <td className={`${td} whitespace-nowrap`}>{quote.budget}</td>
                      <td className={td}><Chip tone={tone}>{due.text}</Chip></td>
                      <td className={`${td} text-right`}><Link href={`/zeus/quotes/${quote.id}`} className={btnSmall}><SparkleIcon size={15} className="text-link" />Reply</Link></td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </Card>
        )}

        <Card aria-labelledby="upcoming-title" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 px-5 py-4">
          <h2 id="upcoming-title" className="m-0 font-display text-lg font-semibold">Due in the next 14 days</h2>
          {upcoming.length === 0 ? (
            <p className="m-0 text-muted">No milestones due in the next two weeks.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {upcoming.map(({ project, milestone, end }) => {
                const late = end < now || (milestone.forecastEnd !== null && milestone.forecastEnd > milestone.plannedEnd);
                return (
                  <li key={milestone.id} className="flex items-center gap-3">
                    <span className="flex w-[46px] flex-none flex-col items-center rounded-lg bg-surface py-1">
                      <strong className="font-display text-lg leading-[22px]">{end.getDate()}</strong>
                      <span className="text-[11px] leading-[14px] text-muted">{end.toLocaleDateString("en-GB", { month: "short" })}</span>
                    </span>
                    <Link href={`/zeus/projects/${project.id}`} className="flex min-w-0 flex-1 flex-col text-midnight no-underline">
                      <strong className="truncate">{milestone.name}</strong>
                      <span className="truncate text-[13px] text-muted">{project.client.company} · {project.name}</span>
                    </Link>
                    <Chip tone={late ? "bad" : milestone.status === "ONGOING" ? "info" : "neutral"}>{late ? "Late" : milestone.status === "ONGOING" ? "In progress" : "Not started"}</Chip>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card aria-labelledby="health-title" className="overflow-hidden">
        <CardHeader
          id="health-title"
          title="Deadline health · ongoing projects"
          subtitle={<span className="flex flex-wrap gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-[18px] rounded-full bg-river" />Work complete</span><span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-0.5 bg-midnight" />Time used</span></span>}
          action={<Link href="/zeus/projects" className="text-sm font-medium text-link">All projects</Link>}
        />
        {health.length === 0 ? (
          <EmptyState title="No ongoing projects">Projects you start appear here with their deadline health.</EmptyState>
        ) : (
          <ul className="m-0 list-none p-0">
            {health.map(({ project, health: h }) => {
              const fill = { ok: "bg-salsify", warn: "bg-gold", bad: "bg-danger", info: "bg-river", neutral: "bg-control" }[healthTone[h.health]];
              return (
                <li key={project.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line px-5 py-3.5">
                  <Link href={`/zeus/projects/${project.id}`} className="flex min-w-0 flex-[1_1_240px] flex-col text-midnight no-underline">
                    <strong>{project.name}</strong>
                    <span className="text-[13px] text-muted">{project.client.company} · due {formatShortDate(project.deadline)}</span>
                  </Link>
                  <div className="flex flex-[2_1_300px] items-center gap-3">
                    <span role="img" aria-label={`${h.workPercent}% of work complete, ${h.timePercent}% of time used`} className="relative h-2.5 flex-1 rounded-full bg-line">
                      <span className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${h.workPercent}%` }} />
                      <span className="absolute -inset-y-1 w-0.5 bg-midnight" style={{ left: `${h.timePercent}%` }} />
                    </span>
                    <span className="w-10 text-right font-bold">{h.workPercent}%</span>
                  </div>
                  <Chip tone={healthTone[h.health]}>{h.label}</Chip>
                  <span className="flex w-[150px] justify-end">
                    {(h.health === "BEHIND" || h.health === "AT_RISK") && (
                      <Link href={`/zeus/projects/${project.id}/notify`} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#fff1db] px-2.5 text-[13px] font-medium text-[#7a4800] no-underline">
                        <MailIcon size={14} />Notify client
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
