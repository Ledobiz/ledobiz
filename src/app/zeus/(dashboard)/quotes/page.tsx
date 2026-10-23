import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, QuoteStatus } from "@/generated/prisma/client";
import { projectTypeLabel, quoteLabel, quoteTone } from "@/components/admin/status";
import { btnSecondary, btnSmall, Card, Chip, cx, DataTable, EmptyState, inputClass, PageHeader, td } from "@/components/admin/ui";
import { dueLabel, formatDateTime } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Quote requests" };

const tabs: { id: QuoteStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "NEW", label: "New" },
  { id: "REPLIED", label: "Replied" },
  { id: "WON", label: "Won" },
  { id: "LOST", label: "Lost" },
];

export default async function QuotesPage({ searchParams }: PageProps<"/zeus/quotes">) {
  await requireUser("quotes");
  const params = await searchParams;
  const status = tabs.some((tab) => tab.id === params.status) ? (params.status as QuoteStatus | "ALL") : "ALL";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const type = typeof params.type === "string" && params.type in projectTypeLabel ? params.type : "";
  const now = new Date();
  const settings = await getSettings();

  const where: Prisma.QuoteRequestWhereInput = {
    ...(status !== "ALL" ? { status } : {}),
    ...(type ? { projectType: type } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { reference: { contains: q, mode: "insensitive" } }] }
      : {}),
  };

  const [quotes, grouped] = await Promise.all([
    db().quoteRequest.findMany({ where, orderBy: [{ createdAt: "desc" }], take: 100 }),
    db().quoteRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts: Record<string, number> = Object.fromEntries(grouped.map((group) => [group.status, group._count._all]));
  counts.ALL = grouped.reduce((sum, group) => sum + group._count._all, 0);

  const tabHref = (id: string) => {
    const search = new URLSearchParams();
    if (id !== "ALL") {
      search.set("status", id);
    }
    if (q) {
      search.set("q", q);
    }
    if (type) {
      search.set("type", type);
    }
    const query = search.toString();
    return `/zeus/quotes${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Quote requests"
        subtitle={`Requests from the website’s free quote form. Reply within ${settings.quoteReplyHours} hours.`}
        actions={
          <form className="flex flex-wrap items-center gap-2.5" role="search">
            {status !== "ALL" && <input type="hidden" name="status" value={status} />}
            <label htmlFor="quote-search" className="sr-only">Search quotes</label>
            <input id="quote-search" name="q" type="search" defaultValue={q} placeholder="Name, company or reference" className={cx(inputClass, "w-[240px] max-w-full")} />
            <label htmlFor="quote-type" className="sr-only">Project type</label>
            <select id="quote-type" name="type" defaultValue={type} className={cx(inputClass, "w-auto")}>
              <option value="">All project types</option>
              {Object.entries(projectTypeLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit" className={btnSecondary}>Filter</button>
          </form>
        }
      />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((tab) => {
          const active = tab.id === status;
          return (
            <Link key={tab.id} href={tabHref(tab.id)} aria-current={active ? "page" : undefined} className={cx("-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3.5 text-sm font-medium no-underline", active ? "border-midnight text-midnight" : "border-transparent text-muted hover:text-midnight")}>
              {tab.label}
              <span className={cx("rounded-full px-[7px] text-xs", active ? "bg-midnight text-white" : "bg-line text-muted")}>{counts[tab.id] ?? 0}</span>
            </Link>
          );
        })}
      </nav>

      <Card className="overflow-hidden">
        {quotes.length === 0 ? (
          <EmptyState title={q || type || status !== "ALL" ? "No requests match these filters" : "No quote requests yet"}>
            {q || type || status !== "ALL" ? "Try another status or clear the search." : "When someone fills in the quote form on the website, it appears here."}
          </EmptyState>
        ) : (
          <DataTable head={[{ label: "Reference" }, { label: "Contact" }, { label: "Project" }, { label: "Budget" }, { label: "Launch" }, { label: "Received" }, { label: "Status" }, { label: "Open", srOnly: true }]} minWidth={980}>
            {quotes.map((quote) => {
              const due = dueLabel(new Date(quote.createdAt.getTime() + settings.quoteReplyHours * 3_600_000), now);
              return (
                <tr key={quote.id} className="hover:bg-[#f8f9fc]">
                  <td className={`${td} font-mono text-[13px] text-muted`}>{quote.reference}</td>
                  <td className={td}><span className="flex flex-col"><strong>{quote.name}</strong><span className="text-[13px] text-muted">{quote.company ?? quote.email}</span></span></td>
                  <td className={td}><span className="flex flex-col"><span>{projectTypeLabel[quote.projectType] ?? quote.projectType}</span><span className="text-[13px] text-muted">{quote.features.length ? quote.features.slice(0, 3).join(", ") : "No features picked"}</span></span></td>
                  <td className={`${td} whitespace-nowrap`}>{quote.budget}</td>
                  <td className={`${td} whitespace-nowrap`}>{quote.timeline}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(quote.createdAt)}</td>
                  <td className={td}>
                    <span className="flex flex-col items-start gap-1">
                      <Chip tone={quoteTone[quote.status]}>{quoteLabel[quote.status]}</Chip>
                      {quote.status === "NEW" && <Chip tone={due.overdue ? "bad" : due.soon ? "warn" : "neutral"}>{due.text}</Chip>}
                    </span>
                  </td>
                  <td className={`${td} text-right`}><Link href={`/zeus/quotes/${quote.id}`} className={btnSmall}>{quote.status === "NEW" ? "Reply" : "Open"}</Link></td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>
    </>
  );
}
