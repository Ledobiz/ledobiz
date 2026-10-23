import type { Metadata } from "next";
import Link from "next/link";
import type { ProjectStatus } from "@/generated/prisma/client";
import { PlusIcon } from "@/components/admin/icons";
import { healthTone } from "@/components/admin/status";
import { Avatar, avatarColors, btnPrimary, Card, Chip, cx, DataTable, EmptyState, PageHeader, ProgressBar, Stat, td } from "@/components/admin/ui";
import { invoiceTotals, projectHealth } from "@/lib/admin/domain";
import { formatDate, money, moneyShort, num } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings, readRates, toReporting } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Projects" };

const tabs: { id: ProjectStatus | "ALL"; label: string; dot: string }[] = [
  { id: "ONGOING", label: "Ongoing", dot: "bg-river" },
  { id: "PENDING", label: "Pending", dot: "bg-gold" },
  { id: "COMPLETED", label: "Completed", dot: "bg-salsify" },
  { id: "ALL", label: "All", dot: "bg-midnight" },
];

export default async function ProjectsPage({ searchParams }: PageProps<"/admin/projects">) {
  const user = await requireUser("projects");
  const params = await searchParams;
  const tab = tabs.some((item) => item.id === params.status) ? (params.status as ProjectStatus | "ALL") : "ONGOING";
  const now = new Date();
  const settings = await getSettings();
  const rates = readRates(settings);
  const cur = settings.reportingCurrency;

  const [projects, grouped] = await Promise.all([
    db().project.findMany({
      where: {
        ...(tab === "ALL" ? { status: { not: "CANCELLED" } } : { status: tab }),
        ...(user.role === "MEMBER" ? { OR: [{ leadId: user.id }, { milestones: { some: { ownerId: user.id } } }] } : {}),
      },
      include: {
        client: { select: { company: true } },
        lead: { select: { name: true } },
        milestones: true,
        expenses: { select: { amount: true, currency: true } },
        invoices: { where: { status: "PAID" }, include: { items: true } },
      },
      orderBy: tab === "COMPLETED" ? { deliveredAt: "desc" } : { deadline: "asc" },
    }),
    db().project.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts: Record<string, number> = Object.fromEntries(grouped.map((group) => [group.status, group._count._all]));
  counts.ALL = grouped.filter((group) => group.status !== "CANCELLED").reduce((sum, group) => sum + group._count._all, 0);

  const rows = projects.map((project) => {
    const spent = project.expenses.reduce((sum, expense) => sum + toReporting(expense.amount, expense.currency, rates) / (rates[project.currency] ?? 1), 0);
    const plannedCost = Math.max(num(project.expenseBudget), spent);
    const profit = num(project.contractValue) - plannedCost;
    const received = project.invoices.reduce((sum, invoice) => {
      const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
      return sum + totals.subtotal - totals.discount;
    }, 0);
    return { project, spent, profit, received, health: projectHealth(project, project.milestones, now) };
  });

  const totalValue = rows.reduce((sum, row) => sum + toReporting(row.project.contractValue, row.project.currency, rates), 0);
  const totalReceived = rows.reduce((sum, row) => sum + toReporting(row.received, row.project.currency, rates), 0);
  const totalSpent = rows.reduce((sum, row) => sum + toReporting(row.spent, row.project.currency, rates), 0);
  const totalProfit = rows.reduce((sum, row) => sum + toReporting(row.profit, row.project.currency, rates), 0);
  const leadNames = [...new Set(projects.map((project) => project.lead?.name).filter(Boolean))] as string[];

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every client project, its money and its deadlines in one place."
        actions={user.role !== "MEMBER" ? <Link href="/admin/projects/new" className={btnPrimary}><PlusIcon size={16} />New project</Link> : undefined}
      />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <Link key={item.id} href={item.id === "ONGOING" ? "/admin/projects" : `/admin/projects?status=${item.id}`} aria-current={active ? "page" : undefined} className={cx("-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3.5 text-sm font-medium no-underline", active ? "border-midnight text-midnight" : "border-transparent text-muted hover:text-midnight")}>
              <span className={cx("size-2 rounded-full", item.dot)} />
              {item.label}
              <span className={cx("rounded-full px-[7px] text-xs", active ? "bg-midnight text-white" : "bg-line text-muted")}>{counts[item.id] ?? 0}</span>
            </Link>
          );
        })}
      </nav>

      <section aria-label="Totals" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3">
        <Stat label={tab === "PENDING" ? "Pipeline value" : "Contract value"} value={moneyShort(totalValue, cur)} note={`${rows.length} project${rows.length === 1 ? "" : "s"} · converted to ${cur}`} />
        <Stat label="Received so far" value={moneyShort(totalReceived, cur)} note={totalValue ? `${Math.round((totalReceived / totalValue) * 100)}% of contract value` : "—"} />
        <Stat label="Expenses to date" value={moneyShort(totalSpent, cur)} />
        <Stat label={tab === "COMPLETED" ? "Final profit" : "Projected profit"} value={moneyShort(totalProfit, cur)} note={totalValue ? `${Math.round((totalProfit / totalValue) * 100)}% average margin` : "—"} noteTone="ok" />
      </section>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No projects here yet">{tab === "PENDING" ? "Projects created from won quotes start here until work begins." : "Create a project, or mark a quote as won to start one."}</EmptyState>
        ) : (
          <DataTable
            head={[{ label: "Project" }, { label: "Service" }, { label: "Contract value", align: "right" }, { label: tab === "ONGOING" ? "Progress" : "Stage" }, { label: tab === "COMPLETED" ? "Delivered" : tab === "PENDING" ? "Start" : "Deadline" }, { label: tab === "COMPLETED" ? "Final profit" : "Profit", align: "right" }, { label: "Lead" }]}
            minWidth={1000}
          >
            {rows.map(({ project, profit, health }) => (
              <tr key={project.id} className="hover:bg-[#f8f9fc]">
                <td className={td}>
                  <Link href={`/admin/projects/${project.id}`} className="flex flex-col text-midnight no-underline">
                    <strong className="underline decoration-line underline-offset-[3px]">{project.name}</strong>
                    <span className="text-[13px] text-muted">{project.client.company}</span>
                  </Link>
                </td>
                <td className={td}>{project.service}</td>
                <td className={`${td} text-right font-medium whitespace-nowrap`}>{money(project.contractValue, project.currency)}</td>
                <td className={`${td} min-w-[170px]`}>
                  {project.status === "ONGOING" ? (
                    <span className="flex items-center gap-2.5">
                      <ProgressBar value={health.workPercent} tone={healthTone[health.health]} label={`${health.workPercent}% complete`} />
                      <span className="w-9 text-right font-medium">{health.workPercent}%</span>
                    </span>
                  ) : (
                    <Chip tone={project.status === "COMPLETED" ? "ok" : "neutral"}>{project.stage ?? (project.status === "COMPLETED" ? "Delivered" : "Pending")}</Chip>
                  )}
                </td>
                <td className={td}>
                  <span className="flex flex-col items-start gap-1">
                    <span className="whitespace-nowrap">{formatDate(project.status === "COMPLETED" ? project.deliveredAt : project.status === "PENDING" ? project.startDate : project.deadline)}</span>
                    {project.status !== "PENDING" && <Chip tone={healthTone[health.health]}>{health.label}</Chip>}
                  </span>
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <span className="flex flex-col">
                    <strong>{moneyShort(profit, project.currency)}</strong>
                    <span className="text-[13px] text-muted">{num(project.contractValue) ? `${Math.round((profit / num(project.contractValue)) * 100)}% ${project.status === "COMPLETED" ? "final" : "projected"}` : "—"}</span>
                  </span>
                </td>
                <td className={td}>{project.lead ? <span title={project.lead.name}><Avatar name={project.lead.name} color={avatarColors[leadNames.indexOf(project.lead.name) % avatarColors.length]} /></span> : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
