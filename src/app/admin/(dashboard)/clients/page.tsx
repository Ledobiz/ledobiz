import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/admin/icons";
import { clientLabel, clientTone } from "@/components/admin/status";
import { btnPrimary, btnSecondary, Card, Chip, cx, DataTable, EmptyState, inputClass, PageHeader, td } from "@/components/admin/ui";
import { type ClientStatus, clientStatus, invoiceTotals } from "@/lib/admin/domain";
import { formatShortDate, moneyShort } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings, readRates, toReporting } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Clients" };

const tabs: { id: ClientStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "PROSPECT", label: "Prospects" },
  { id: "PAST", label: "Past clients" },
];

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clients">) {
  await requireUser("clients");
  const params = await searchParams;
  const tab = tabs.some((item) => item.id === params.status) ? (params.status as ClientStatus | "ALL") : "ALL";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const now = new Date();
  const settings = await getSettings();
  const rates = readRates(settings);
  const cur = settings.reportingCurrency;

  const clients = await db().client.findMany({
    where: q ? { OR: [{ company: { contains: q, mode: "insensitive" } }, { contacts: { some: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } }] } : undefined,
    include: {
      contacts: { orderBy: { isPrimary: "desc" }, take: 1 },
      projects: { select: { status: true, deliveredAt: true } },
      invoices: { where: { status: { in: ["SENT", "PAID"] } }, include: { items: true } },
      emails: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { company: "asc" },
  });

  const rows = clients.map((client) => {
    const status = clientStatus(client, now);
    let paid = 0;
    let owed = 0;
    for (const invoice of client.invoices) {
      const total = toReporting(invoiceTotals(invoice.items, invoice.vatRate, invoice.discount).total, invoice.currency, rates);
      if (invoice.status === "PAID") {
        paid += total;
      } else {
        owed += total;
      }
    }
    return { client, status, paid, owed };
  });
  const counts: Record<string, number> = { ALL: rows.length };
  for (const row of rows) {
    counts[row.status.status] = (counts[row.status.status] ?? 0) + 1;
  }
  const visible = tab === "ALL" ? rows : rows.filter((row) => row.status.status === tab);

  return (
    <>
      <PageHeader title="Clients" subtitle="Everyone we’ve quoted or worked with, and every email we’ve exchanged." actions={<Link href="/admin/clients/new" className={btnPrimary}><PlusIcon size={16} />New client</Link>} />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
          {tabs.map((item) => {
            const active = item.id === tab;
            const href = `/admin/clients?${new URLSearchParams({ ...(item.id !== "ALL" ? { status: item.id } : {}), ...(q ? { q } : {}) })}`;
            return (
              <Link key={item.id} href={href} aria-current={active ? "page" : undefined} className={cx("-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3.5 text-sm font-medium no-underline", active ? "border-midnight text-midnight" : "border-transparent text-muted hover:text-midnight")}>
                {item.label}
                <span className={cx("rounded-full px-[7px] text-xs", active ? "bg-midnight text-white" : "bg-line text-muted")}>{counts[item.id] ?? 0}</span>
              </Link>
            );
          })}
        </nav>
        <form className="mb-2 flex gap-2" role="search">
          {tab !== "ALL" && <input type="hidden" name="status" value={tab} />}
          <label htmlFor="client-search" className="sr-only">Search clients</label>
          <input id="client-search" name="q" defaultValue={q} placeholder="Company, name or email" className={cx(inputClass, "w-56")} />
          <button type="submit" className={btnSecondary}>Search</button>
        </form>
      </div>

      <details className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">How is a client’s status decided?</summary>
        <ul className="mt-2 mb-0 flex flex-col gap-1.5 pl-5 text-muted">
          <li><strong className="text-midnight">Active</strong>: a project in progress, a scheduled project with a paid deposit, an active support plan, or an unpaid invoice.</li>
          <li><strong className="text-midnight">Past client</strong>: every project delivered, nothing owed and no active support plan.</li>
          <li><strong className="text-midnight">Prospect</strong>: we’ve quoted or talked, but nothing is signed and paid yet.</li>
        </ul>
      </details>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title={q ? "No clients match your search" : "No clients here yet"}>Clients are added when you reply to a quote, create a project, or add one yourself.</EmptyState>
        ) : (
          <DataTable head={[{ label: "Client" }, { label: "Status" }, { label: "Main contact" }, { label: "Projects", align: "right" }, { label: "Paid to date", align: "right" }, { label: "Owed", align: "right" }, { label: "Last email" }]} minWidth={940}>
            {visible.map(({ client, status, paid, owed }) => (
              <tr key={client.id} className="hover:bg-[#f8f9fc]">
                <td className={td}>
                  <Link href={`/admin/clients/${client.id}`} className="flex flex-col text-midnight no-underline">
                    <strong className="underline decoration-line underline-offset-[3px]">{client.company}</strong>
                    <span className="text-[13px] text-muted">{[client.industry, client.city].filter(Boolean).join(" · ") || "—"}</span>
                  </Link>
                </td>
                <td className={td}><span className="flex flex-col items-start gap-1"><Chip tone={clientTone[status.status]}>{clientLabel[status.status]}</Chip><span className="text-xs text-muted">{status.reason}</span></span></td>
                <td className={td}>{client.contacts[0] ? <span className="flex flex-col"><span>{client.contacts[0].name}</span><span className="text-[13px] text-muted">{client.contacts[0].email}</span></span> : "—"}</td>
                <td className={`${td} text-right`}>{client.projects.length}</td>
                <td className={`${td} text-right whitespace-nowrap`}>{paid ? moneyShort(paid, cur) : "—"}</td>
                <td className={cx(td, "text-right whitespace-nowrap", owed > 0 && "font-medium text-[#7a4800]")}>{owed ? moneyShort(owed, cur) : "—"}</td>
                <td className={`${td} whitespace-nowrap`}>{client.emails[0] ? formatShortDate(client.emails[0].createdAt) : "—"}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
