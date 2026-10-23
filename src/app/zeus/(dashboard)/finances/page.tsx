import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/admin/icons";
import { invoiceLabel, invoiceTone } from "@/components/admin/status";
import { btnPrimary, Card, CardHeader, Chip, cx, DataTable, EmptyState, PageHeader, Stat, td } from "@/components/admin/ui";
import { type InvoiceDisplayStatus, invoiceStatus, invoiceTotals } from "@/lib/admin/domain";
import { dueLabel, formatShortDate, money, moneyShort, num } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings, readRates, toReporting } from "@/lib/server/settings";
import { AddExpenseForm } from "../projects/[id]/inline-forms";
import { type MonthPoint, RevenueChart } from "./revenue-chart";

export const metadata: Metadata = { title: "Finances" };

const invoiceFilters: { id: "outstanding" | InvoiceDisplayStatus | "ALL"; label: string }[] = [
  { id: "outstanding", label: "Outstanding" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "DRAFT", label: "Drafts" },
  { id: "PAID", label: "Paid" },
  { id: "ALL", label: "All" },
];

export default async function FinancesPage({ searchParams }: PageProps<"/zeus/finances">) {
  await requireUser("finance");
  const params = await searchParams;
  const filter = invoiceFilters.find((item) => item.id === params.invoices)?.id ?? "outstanding";
  const settings = await getSettings();
  const rates = readRates(settings);
  const cur = settings.reportingCurrency;
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [invoices, expenses, projects] = await Promise.all([
    db().invoice.findMany({ orderBy: { issueDate: "desc" }, include: { items: true, client: { select: { id: true, company: true } }, project: { select: { name: true } } } }),
    db().expense.findMany({ where: { spentOn: { gte: yearAgo } }, orderBy: { spentOn: "desc" }, include: { project: { select: { id: true, name: true } } } }),
    db().project.findMany({ where: { status: { in: ["ONGOING", "COMPLETED"] } }, select: { id: true, name: true, status: true, currency: true, contractValue: true, expenseBudget: true, client: { select: { company: true } }, expenses: { select: { amount: true, currency: true } } } }),
  ]);

  const rows = invoices.map((invoice) => {
    const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
    return { invoice, totals, display: invoiceStatus(invoice, now), totalReporting: toReporting(totals.total, invoice.currency, rates), netReporting: toReporting(totals.subtotal - totals.discount, invoice.currency, rates) };
  });

  const months: MonthPoint[] = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return { label: date.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), revenue: 0, expenses: 0 };
  });
  const monthIndex = (date: Date) => (date.getFullYear() - yearAgo.getFullYear()) * 12 + date.getMonth() - yearAgo.getMonth();
  for (const row of rows) {
    if (row.invoice.status === "PAID" && row.invoice.paidAt && row.invoice.paidAt >= yearAgo) {
      const slot = months[monthIndex(row.invoice.paidAt)];
      if (slot) {
        slot.revenue += row.netReporting;
      }
    }
  }
  for (const expense of expenses) {
    const slot = months[monthIndex(expense.spentOn)];
    if (slot) {
      slot.expenses += toReporting(expense.amount, expense.currency, rates);
    }
  }
  const revenue = months.reduce((sum, month) => sum + month.revenue, 0);
  const spent = months.reduce((sum, month) => sum + month.expenses, 0);
  const outstanding = rows.filter((row) => row.invoice.status === "SENT");
  const overdue = outstanding.filter((row) => row.display === "OVERDUE");
  const vatCollected = rows.filter((row) => row.invoice.status === "PAID" && row.invoice.paidAt && row.invoice.paidAt >= yearAgo).reduce((sum, row) => sum + toReporting(row.totals.vat, row.invoice.currency, rates), 0);

  const visible = rows.filter((row) => (filter === "ALL" ? true : filter === "outstanding" ? row.invoice.status === "SENT" : row.display === filter));

  const projectProfit = projects
    .map((project) => {
      const projectSpent = project.expenses.reduce((sum, expense) => sum + toReporting(expense.amount, expense.currency, rates), 0);
      const value = toReporting(project.contractValue, project.currency, rates);
      const cost = Math.max(toReporting(project.expenseBudget, project.currency, rates), projectSpent);
      return { project, value, profit: value - cost, margin: value ? ((value - cost) / value) * 100 : 0 };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + toReporting(expense.amount, expense.currency, rates));
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader title="Finances" subtitle={`Last 12 months, converted to ${cur} at the rates in Settings. Revenue is counted when paid, before VAT.`} actions={<Link href="/zeus/finances/invoices/new" className={btnPrimary}><PlusIcon size={16} />New invoice</Link>} />

      <section aria-label="Totals" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-3">
        <Stat label="Revenue received" value={moneyShort(revenue, cur)} note="Paid invoices, before VAT" />
        <Stat label="Expenses" value={moneyShort(spent, cur)} />
        <Stat label="Profit" value={moneyShort(revenue - spent, cur)} note={revenue ? `${Math.round(((revenue - spent) / revenue) * 100)}% margin · target ${settings.targetMargin}%` : undefined} noteTone={revenue && ((revenue - spent) / revenue) * 100 >= settings.targetMargin ? "ok" : "warn"} />
        <Stat label="Outstanding" value={moneyShort(outstanding.reduce((sum, row) => sum + row.totalReporting, 0), cur)} note={`${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}`} />
        <Stat label="Overdue" value={moneyShort(overdue.reduce((sum, row) => sum + row.totalReporting, 0), cur)} note={overdue.length ? `${overdue.length} need a reminder` : "Nothing overdue"} noteTone={overdue.length ? "bad" : "ok"} />
        <Stat label="VAT collected" value={moneyShort(vatCollected, cur)} note="To remit to FIRS" />
      </section>

      <Card aria-labelledby="chart-title" className="overflow-hidden">
        <CardHeader id="chart-title" title="Revenue and expenses" subtitle="By month" />
        <div className="p-5"><RevenueChart data={months} currency={cur} /></div>
      </Card>

      <Card aria-labelledby="invoices-title" className="overflow-hidden">
        <CardHeader id="invoices-title" title="Invoices" />
        <nav aria-label="Filter invoices" className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
          {invoiceFilters.map((item) => (
            <Link key={item.id} href={item.id === "outstanding" ? "/zeus/finances" : `/zeus/finances?invoices=${item.id}`} aria-current={item.id === filter ? "page" : undefined} className={cx("inline-flex min-h-8 items-center rounded-full border px-3 text-[13px] font-medium no-underline", item.id === filter ? "border-midnight bg-midnight text-white" : "border-control text-midnight")}>
              {item.label}
            </Link>
          ))}
        </nav>
        {visible.length === 0 ? (
          <EmptyState title="No invoices here">{filter === "OVERDUE" ? "Nothing is overdue." : "Create an invoice from a project or with the button above."}</EmptyState>
        ) : (
          <DataTable head={[{ label: "Invoice" }, { label: "Client" }, { label: "Issued" }, { label: "Due" }, { label: "Status" }, { label: "Total", align: "right" }, { label: "Actions", srOnly: true }]} minWidth={880}>
            {visible.map(({ invoice, totals, display }) => {
              const due = dueLabel(invoice.dueDate, now);
              return (
                <tr key={invoice.id} className="hover:bg-[#f8f9fc]">
                  <td className={td}><Link href={`/zeus/finances/invoices/${invoice.id}`} className="font-medium text-link">{invoice.number}</Link></td>
                  <td className={td}><span className="flex flex-col"><span>{invoice.client.company}</span>{invoice.project && <span className="text-[13px] text-muted">{invoice.project.name}</span>}</span></td>
                  <td className={`${td} whitespace-nowrap`}>{formatShortDate(invoice.issueDate)}</td>
                  <td className={`${td} whitespace-nowrap`}><span className="flex flex-col"><span>{formatShortDate(invoice.dueDate)}</span>{invoice.status === "SENT" && <span className={cx("text-xs", due.overdue ? "text-danger" : "text-muted")}>{due.text}</span>}</span></td>
                  <td className={td}><Chip tone={invoiceTone[display]}>{invoiceLabel[display]}</Chip></td>
                  <td className={`${td} text-right font-medium whitespace-nowrap`}>{money(totals.total, invoice.currency)}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    {display === "OVERDUE" && <Link href={`/zeus/clients/${invoice.client.id}?compose=1`} className="text-[13px] text-link">Send reminder</Link>}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>

      <div className="flex flex-wrap items-start gap-5">
        <Card aria-labelledby="profit-title" className="min-w-0 flex-[1.3_1_480px] overflow-hidden">
          <CardHeader id="profit-title" title="Profit by project" subtitle="Contract value minus the larger of budget or actual spend" />
          {projectProfit.length === 0 ? <EmptyState title="No active or delivered projects yet" /> : (
            <DataTable head={[{ label: "Project" }, { label: "Value", align: "right" }, { label: "Profit", align: "right" }, { label: "Margin", align: "right" }]} minWidth={480}>
              {projectProfit.map(({ project, value, profit, margin }) => (
                <tr key={project.id}>
                  <td className={td}><Link href={`/zeus/projects/${project.id}`} className="flex flex-col text-midnight no-underline"><span className="font-medium underline decoration-line underline-offset-[3px]">{project.name}</span><span className="text-[13px] text-muted">{project.client.company}</span></Link></td>
                  <td className={`${td} text-right whitespace-nowrap`}>{moneyShort(value, cur)}</td>
                  <td className={`${td} text-right font-medium whitespace-nowrap`}>{moneyShort(profit, cur)}</td>
                  <td className={cx(td, "text-right", margin < num(settings.targetMargin) ? "text-[#7a4800]" : "text-success")}>{Math.round(margin)}%</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card aria-labelledby="expenses-title" className="min-w-0 flex-[1_1_340px] overflow-hidden">
          <CardHeader id="expenses-title" title="Expenses by category" subtitle={`${moneyShort(spent, cur)} in the last 12 months`} />
          {categories.length === 0 ? <EmptyState title="No expenses recorded" /> : (
            <ul className="m-0 flex list-none flex-col gap-3 px-5 py-4">
              {categories.map(([category, amount]) => (
                <li key={category} className="flex flex-col gap-1">
                  <span className="flex justify-between text-sm"><span>{category}</span><span className="font-medium">{moneyShort(amount, cur)}</span></span>
                  <span className="block h-2 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-[#d97f00]" style={{ width: `${(amount / categories[0][1]) * 100}%` }} /></span>
                </li>
              ))}
            </ul>
          )}
          <details className="border-t border-line">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Add a company expense <span className="font-normal text-muted">(not tied to a project)</span></summary>
            <AddExpenseForm projectId={null} currency={cur} />
          </details>
        </Card>
      </div>
    </>
  );
}
