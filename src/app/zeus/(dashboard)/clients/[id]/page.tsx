import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { makePrimaryContact, removeContact } from "@/app/zeus/actions/clients";
import { ArrowInIcon, PlusIcon, SendIcon, SparkleIcon } from "@/components/admin/icons";
import { clientLabel, clientTone, invoiceLabel, invoiceTone, projectStatusLabel } from "@/components/admin/status";
import { btnPrimary, btnSecondary, Card, CardHeader, Chip, cx, EmptyState, PageHeader, Stat } from "@/components/admin/ui";
import { clientStatus, invoiceStatus, invoiceTotals } from "@/lib/admin/domain";
import { formatDate, formatDateTime, formatShortDate, money, moneyShort, toDateInput } from "@/lib/admin/format";
import { isAiConfigured } from "@/lib/server/ai";
import { canAccess, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings, readRates, toReporting } from "@/lib/server/settings";
import { AddContactForm, EditClientForm, LogEmailForm } from "../client-forms";
import { ClientComposer } from "./client-composer";

export const metadata: Metadata = { title: "Client" };

const filters = [
  { id: "all", label: "All" },
  { id: "sent", label: "Sent" },
  { id: "received", label: "Received" },
  { id: "money", label: "Invoices and payments" },
  { id: "ai", label: "AI-assisted" },
] as const;

const categoryLabel: Record<string, string> = {
  QUOTE_CONFIRMATION: "Quote received",
  QUOTE_REPLY: "Quote reply",
  QUOTE_FOLLOW_UP: "Follow-up",
  PROJECT_UPDATE: "Project update",
  DEADLINE_NOTICE: "Deadline notice",
  INVOICE: "Invoice",
  PAYMENT_REMINDER: "Payment reminder",
  RECEIPT: "Receipt",
  GENERAL: "Email",
  RECEIVED: "Received",
  WELCOME: "Welcome",
  MILESTONE_REVIEW: "Review request",
  ACTION_NEEDED: "Action needed",
  LAUNCH: "Launch",
  PAYMENT_OVERDUE: "Overdue reminder",
  TRANSFER_PENDING: "Transfer being checked",
  PAYMENT_FAILED: "Payment failed",
  FEEDBACK_REQUEST: "Feedback request",
  SUPPORT_RENEWAL: "Support renewal",
};

export default async function ClientPage({ params, searchParams }: PageProps<"/zeus/clients/[id]">) {
  const user = await requireUser("clients");
  const { id } = await params;
  const query = await searchParams;
  const filter = filters.find((item) => item.id === query.filter)?.id ?? "all";
  const openEmailId = typeof query.email === "string" ? query.email : undefined;

  const emailWhere: Prisma.EmailWhereInput = {
    clientId: id,
    ...(filter === "sent" ? { direction: "OUTBOUND" } : {}),
    ...(filter === "received" ? { direction: "INBOUND" } : {}),
    ...(filter === "money" ? { category: { in: ["INVOICE", "PAYMENT_REMINDER", "PAYMENT_OVERDUE", "RECEIPT", "TRANSFER_PENDING", "PAYMENT_FAILED", "SUPPORT_RENEWAL"] } } : {}),
    ...(filter === "ai" ? { aiAssisted: true } : {}),
  };

  const [client, emails, openEmail, settings] = await Promise.all([
    db().client.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        projects: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true, deliveredAt: true, deadline: true, contractValue: true, currency: true } },
        invoices: { orderBy: { issueDate: "desc" }, include: { items: true } },
        quotes: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, status: true, createdAt: true } },
      },
    }),
    db().email.findMany({ where: emailWhere, orderBy: { createdAt: "desc" }, take: 100, include: { sentBy: { select: { name: true } } } }),
    openEmailId ? db().email.findFirst({ where: { id: openEmailId, clientId: id }, include: { sentBy: { select: { name: true } } } }) : null,
    getSettings(),
  ]);
  if (!client) {
    notFound();
  }
  const now = new Date();
  const rates = readRates(settings);
  const cur = settings.reportingCurrency;
  const status = clientStatus(client, now);
  const invoices = client.invoices.map((invoice) => ({ invoice, total: invoiceTotals(invoice.items, invoice.vatRate, invoice.discount).total, display: invoiceStatus(invoice, now) }));
  const paid = invoices.filter((row) => row.invoice.status === "PAID").reduce((sum, row) => sum + toReporting(row.total, row.invoice.currency, rates), 0);
  const owed = invoices.filter((row) => row.invoice.status === "SENT").reduce((sum, row) => sum + toReporting(row.total, row.invoice.currency, rates), 0);
  const showFinance = canAccess(user.role, "finance");
  const href = (next: Record<string, string | undefined>) => {
    const entries: Record<string, string | undefined> = { filter: filter === "all" ? undefined : filter, ...next };
    const search = new URLSearchParams(Object.entries(entries).flatMap(([key, value]) => (value ? [[key, value]] : [])));
    return `/zeus/clients/${client.id}${search.size ? `?${search}` : ""}`;
  };

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/zeus/clients", label: "Clients" }]}
        title={<span className="flex flex-wrap items-center gap-2.5">{client.company}<Chip tone={clientTone[status.status]}>{clientLabel[status.status]}</Chip></span>}
        subtitle={<>{status.reason}{client.industry ? ` · ${client.industry}` : ""}{client.city ? ` · ${client.city}` : ""}</>}
        actions={
          <>
            {canAccess(user.role, "projects") && user.role !== "MEMBER" && <Link href="/zeus/projects/new" className={btnSecondary}><PlusIcon size={16} />New project</Link>}
            {showFinance && <Link href={`/zeus/finances/invoices/new?client=${client.id}`} className={btnSecondary}><PlusIcon size={16} />New invoice</Link>}
            {client.contacts.length > 0 && <Link href={href({ compose: "1" })} className={btnPrimary}><SparkleIcon size={16} />New email</Link>}
          </>
        }
      />

      {query.compose === "1" && client.contacts.length > 0 && (
        <ClientComposer
          clientId={client.id}
          company={client.company}
          aiReady={isAiConfigured()}
          contacts={client.contacts.map((contact) => ({ id: contact.id, name: contact.name, email: contact.email }))}
          projects={client.projects.filter((project) => project.status !== "CANCELLED").map((project) => ({ id: project.id, name: project.name }))}
          owes={owed > 0}
          closeHref={href({})}
        />
      )}

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-3">
        <Stat label="Projects" value={client.projects.length} note={`${client.projects.filter((p) => p.status === "ONGOING").length} ongoing · ${client.projects.filter((p) => p.status === "COMPLETED").length} delivered`} />
        {showFinance && <Stat label="Paid to date" value={moneyShort(paid, cur)} />}
        {showFinance && <Stat label="Owed" value={moneyShort(owed, cur)} noteTone={owed ? "warn" : "neutral"} note={owed ? `${invoices.filter((row) => row.display === "OVERDUE").length} overdue` : "Nothing owed"} />}
        <Stat label="Support plan" value={client.supportPlanName ?? "None"} note={client.supportPlanUntil ? `${client.supportPlanUntil > now ? "Until" : "Ended"} ${formatDate(client.supportPlanUntil)}` : undefined} />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <Card aria-labelledby="history-title" className="min-w-0 flex-[1.6_1_560px] overflow-hidden">
          <CardHeader id="history-title" title="Correspondence" subtitle="Every email sent from the dashboard, plus replies you’ve logged" action={<LogEmailForm clientId={client.id} defaultFrom={client.contacts[0]?.email ?? ""} />} />
          <nav aria-label="Filter emails" className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
            {filters.map((item) => (
              <Link key={item.id} href={href({ filter: item.id === "all" ? undefined : item.id })} aria-current={item.id === filter ? "page" : undefined} className={cx("inline-flex min-h-8 items-center rounded-full border px-3 text-[13px] font-medium no-underline", item.id === filter ? "border-midnight bg-midnight text-white" : "border-control text-midnight")}>
                {item.label}
              </Link>
            ))}
          </nav>
          {openEmail && (
            <article aria-label="Email" className="flex flex-col gap-3 border-b border-line bg-[#fbfcfe] px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <strong className="text-base">{openEmail.subject}</strong>
                  <span className="text-[13px] text-muted">
                    {openEmail.direction === "INBOUND" ? `From ${openEmail.fromAddress}` : `To ${openEmail.toAddress}${openEmail.cc ? `, cc ${openEmail.cc}` : ""}`} · {formatDateTime(openEmail.createdAt)}{openEmail.sentBy ? ` · sent by ${openEmail.sentBy.name}` : ""}
                  </span>
                </div>
                <Link href={href({})} className="text-sm text-link">Close</Link>
              </div>
              {openEmail.attachments.length > 0 && <span className="text-[13px] text-muted">Attached: {openEmail.attachments.join(", ")}</span>}
              {openEmail.status === "NOT_SENT" && <span className="text-[13px] text-[#7a4800]">Not delivered: {openEmail.error}</span>}
              {openEmail.status === "FAILED" && <span className="text-[13px] text-danger">Failed: {openEmail.error}</span>}
              <div className="rounded-lg border border-line bg-white p-4 text-[15px] leading-[23px] whitespace-pre-line">{openEmail.body}</div>
            </article>
          )}
          {emails.length === 0 ? (
            <EmptyState title="No emails yet">Emails you send from quotes, projects, invoices or here will show up in this history.</EmptyState>
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {emails.map((email) => (
                <li key={email.id} className={cx("border-t border-line first:border-t-0", email.id === openEmailId && "bg-tint")}>
                  <Link href={href({ email: email.id })} className="grid grid-cols-[28px_1fr_auto] items-start gap-3 px-5 py-3 text-midnight no-underline hover:bg-[#f8f9fc]">
                    <span className={cx("mt-0.5 flex size-7 items-center justify-center rounded-full", email.direction === "INBOUND" ? "bg-[#e3f6ee] text-[#1a7f5a]" : "bg-tint text-[#15627b]")}>
                      {email.direction === "INBOUND" ? <ArrowInIcon size={14} /> : <SendIcon size={14} />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <strong className="truncate">{email.subject}</strong>
                        <Chip tone="neutral">{categoryLabel[email.category] ?? "Email"}</Chip>
                        {email.attachments.length > 0 && <span title={`Attached: ${email.attachments.join(", ")}`} className="text-xs text-muted">{email.attachments.length} attached</span>}
                        {email.aiAssisted && <span title="Drafted with AI" className="inline-flex text-link"><SparkleIcon size={14} /></span>}
                        {email.status === "NOT_SENT" && <Chip tone="warn">Not sent</Chip>}
                        {email.status === "FAILED" && <Chip tone="bad">Failed</Chip>}
                      </span>
                      <span className="truncate text-[13px] text-muted">{email.body.replace(/\s+/g, " ").slice(0, 140)}</span>
                    </span>
                    <span className="text-xs whitespace-nowrap text-muted">{formatShortDate(email.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 font-display text-lg font-semibold">Company</h2>
              <EditClientForm clientId={client.id} values={{ company: client.company, industry: client.industry ?? "", city: client.city ?? "", country: client.country ?? "", notes: client.notes ?? "", supportPlanName: client.supportPlanName ?? "", supportPlanPrice: client.supportPlanPrice?.toString() ?? "", supportPlanUntil: toDateInput(client.supportPlanUntil) }} />
            </div>
            <dl className="m-0 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted">Location</dt><dd className="m-0">{[client.city, client.country].filter(Boolean).join(", ") || "—"}</dd>
              <dt className="text-muted">Support</dt><dd className="m-0">{client.supportPlanName ? `${client.supportPlanName}${client.supportPlanPrice ? ` · ${money(client.supportPlanPrice, cur)}/mo` : ""}` : "—"}</dd>
              <dt className="text-muted">Since</dt><dd className="m-0">{formatDate(client.createdAt)}</dd>
            </dl>
            {client.notes && <p className="m-0 rounded-lg bg-surface p-3 text-sm whitespace-pre-line">{client.notes}</p>}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="m-0 font-display text-lg font-semibold">Contacts</h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {client.contacts.map((contact) => (
                <li key={contact.id} className="flex flex-col gap-0.5 text-sm">
                  <span className="flex flex-wrap items-center gap-1.5"><strong>{contact.name}</strong>{contact.isPrimary && <Chip tone="info">Main</Chip>}{contact.receivesInvoices && <Chip tone="neutral">Invoices</Chip>}</span>
                  {contact.role && <span className="text-muted">{contact.role}</span>}
                  <a href={`mailto:${contact.email}`} className="text-link">{contact.email}</a>
                  {contact.phone && <span>{contact.phone}</span>}
                  {!contact.isPrimary && (
                    <span className="flex gap-3 pt-0.5 text-[13px]">
                      <form action={makePrimaryContact.bind(null, contact.id)}><button type="submit" className="cursor-pointer text-link underline">Make main</button></form>
                      <form action={removeContact.bind(null, contact.id)}><button type="submit" className="cursor-pointer text-danger underline">Remove</button></form>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <AddContactForm clientId={client.id} />
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="m-0 font-display text-lg font-semibold">Projects and quotes</h2>
            {client.projects.length === 0 && client.quotes.length === 0 && <span className="text-sm text-muted">Nothing yet.</span>}
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
              {client.projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-2">
                  <Link href={`/zeus/projects/${project.id}`} className="text-link">{project.name}</Link>
                  <Chip tone={project.status === "ONGOING" ? "info" : project.status === "COMPLETED" ? "ok" : "neutral"}>{projectStatusLabel[project.status]}</Chip>
                </li>
              ))}
              {client.quotes.map((quote) => (
                <li key={quote.id} className="flex items-center justify-between gap-2">
                  <Link href={`/zeus/quotes/${quote.id}`} className="text-link">Quote {quote.reference}</Link>
                  <span className="text-xs text-muted">{formatShortDate(quote.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>

          {showFinance && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="m-0 font-display text-lg font-semibold">Invoices</h2>
              {invoices.length === 0 && <span className="text-sm text-muted">No invoices yet.</span>}
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
                {invoices.map(({ invoice, total, display }) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-2">
                    <Link href={`/zeus/finances/invoices/${invoice.id}`} className="flex flex-col text-link"><span>{invoice.number}</span><span className="text-xs text-muted no-underline">{money(total, invoice.currency)}</span></Link>
                    <Chip tone={invoiceTone[display]}>{invoiceLabel[display]}</Chip>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
