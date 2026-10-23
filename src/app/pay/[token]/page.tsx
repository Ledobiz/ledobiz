import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { invoiceTotals } from "@/lib/admin/domain";
import { formatDate, formatDateTime, money, num } from "@/lib/admin/format";
import { db } from "@/lib/server/db";
import { isProviderConfigured, type OnlineProvider, providerSupports } from "@/lib/server/payment-providers";
import { receiptNumber } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";
import { type PayMethod, PayForm } from "./pay-form";
import { PendingRefresh } from "./pending-refresh";

export const metadata: Metadata = { title: "Pay invoice" };

const onlineMethods: Record<OnlineProvider, Omit<PayMethod, "id">> = {
  PAYSTACK: { label: "Paystack", hint: "Card, bank transfer or USSD", tag: "Instant" },
  FLUTTERWAVE: { label: "Flutterwave", hint: "Card, bank transfer, USSD or mobile money", tag: "Instant" },
};

const linkPrimary = "inline-flex min-h-11 items-center rounded-lg bg-midnight px-4 font-medium text-white no-underline hover:bg-midnight-hover hover:text-white";
const linkGhost = "inline-flex min-h-11 items-center rounded-lg border border-control bg-white px-4 font-medium text-midnight no-underline hover:bg-surface hover:text-midnight";

export default async function PayPage({ params, searchParams }: PageProps<"/pay/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  if (token.length < 20 || token.length > 64) {
    notFound();
  }
  const [invoice, settings] = await Promise.all([
    db().invoice.findUnique({
      where: { payToken: token },
      include: {
        items: { orderBy: { position: "asc" } },
        client: { include: { contacts: { orderBy: { isPrimary: "desc" } } } },
        project: { select: { name: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    getSettings(),
  ]);
  if (!invoice || invoice.status === "DRAFT") {
    notFound();
  }

  const now = new Date();
  const cur = invoice.currency;
  const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
  const amountLabel = money(totals.total, cur, { decimals: true });
  const contact = invoice.client.contacts.find((item) => item.receivesInvoices) ?? invoice.client.contacts[0];
  const paid = invoice.status === "PAID";
  const overdue = invoice.status === "SENT" && invoice.dueDate < now;
  const returned = typeof query.payment === "string" ? invoice.payments.find((payment) => payment.reference === query.payment) : undefined;
  const successful = invoice.payments.find((payment) => payment.status === "SUCCESS");

  const methods: PayMethod[] = [
    ...(["PAYSTACK", "FLUTTERWAVE"] as const).filter((provider) => isProviderConfigured(provider) && providerSupports(provider, cur)).map((provider) => ({ id: provider, ...onlineMethods[provider] })),
    ...(settings.bankDetails ? [{ id: "BANK_TRANSFER" as const, label: "Transfer to our bank account", hint: "Use your own banking app", tag: "Up to 1 day" }] : []),
  ];

  let panel: ReactNode;
  if (invoice.status === "VOID") {
    panel = (
      <StateBlock tone="neutral" title="This invoice has been cancelled">
        <p className="m-0 text-muted">There’s nothing to pay. If you think this is a mistake, email <a href={`mailto:${settings.invoicesFrom}`}>{settings.invoicesFrom}</a>.</p>
      </StateBlock>
    );
  } else if (paid) {
    const paidWith = [invoice.paymentMethod, successful?.cardLast4 ? `card ending ${successful.cardLast4}` : null].filter(Boolean).join(" · ");
    panel = (
      <StateBlock tone="ok" title={returned?.status === "SUCCESS" ? "Payment received. Thank you." : "This invoice is already paid"}>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[10px] bg-surface px-4 py-3.5 text-sm">
          <dt className="text-muted">Amount paid</dt><dd className="m-0 text-right font-bold">{amountLabel}</dd>
          <dt className="text-muted">Receipt</dt><dd className="m-0 text-right">{receiptNumber(invoice.number)}</dd>
          {paidWith && <><dt className="text-muted">Paid with</dt><dd className="m-0 text-right">{paidWith}</dd></>}
          {invoice.paymentReference && <><dt className="text-muted">Reference</dt><dd className="m-0 text-right break-all">{invoice.paymentReference}</dd></>}
          <dt className="text-muted">Date</dt><dd className="m-0 text-right">{formatDateTime(invoice.paidAt)}</dd>
        </dl>
        {(successful?.receiptEmail ?? contact?.email) && <p className="m-0 text-muted">We’ve emailed your receipt to <strong className="text-midnight">{successful?.receiptEmail ?? contact?.email}</strong>.</p>}
        <div className="flex flex-wrap gap-2.5">
          <Link href={`/pay/${token}/receipt`} className={linkPrimary}>Download receipt (PDF)</Link>
          <Link href="/" className={linkGhost}>Go to ledobiz.com</Link>
        </div>
      </StateBlock>
    );
  } else if (returned?.status === "PENDING" && returned.provider !== "BANK_TRANSFER") {
    panel = (
      <div className="flex flex-col items-center gap-3.5 px-2 py-8 text-center">
        <PendingRefresh reference={returned.reference} />
        <span aria-hidden="true" className="size-11 animate-spin rounded-full border-4 border-line border-t-midnight" />
        <h2 className="m-0 font-display text-[22px] leading-7 font-bold">Confirming your payment…</h2>
        <p className="m-0 max-w-[340px] text-muted">Transfers and USSD payments can take a few minutes to confirm. Please keep this page open; it updates automatically.</p>
        <Link href={`/pay/${token}`} className={linkGhost}>Choose another way to pay</Link>
      </div>
    );
  } else if (returned?.status === "FAILED") {
    panel = (
      <StateBlock tone="bad" title="Your payment didn’t go through">
        <div className="rounded-lg bg-[#fdecec] px-3.5 py-3 text-sm leading-[21px] text-[#8e1c1c]">
          <strong>{returned.failureReason ?? "The payment was declined."}</strong>
          <br />If money left your account, it will be reversed, or email us and we’ll sort it out.
        </div>
        <p className="m-0 text-muted">Large amounts often go through more easily by bank transfer or USSD.</p>
        <div className="flex flex-wrap gap-2.5">
          <Link href={`/pay/${token}`} className={linkPrimary}>Try again</Link>
          {settings.bankDetails && <Link href={`/pay/${token}?method=BANK_TRANSFER`} className={linkGhost}>Pay by bank transfer instead</Link>}
        </div>
      </StateBlock>
    );
  } else if (query.transfer === "sent") {
    panel = (
      <StateBlock tone="info" title="Thanks. We’re checking your transfer">
        <p className="m-0 text-muted">We’ll confirm your payment and email your receipt within 1 working day. You don’t need to do anything else.</p>
      </StateBlock>
    );
  } else if (methods.length === 0) {
    panel = (
      <StateBlock tone="neutral" title="Online payment isn’t available for this invoice">
        <p className="m-0 text-muted">Please email <a href={`mailto:${settings.invoicesFrom}`}>{settings.invoicesFrom}</a> and we’ll send you the payment details.</p>
      </StateBlock>
    );
  } else {
    const preferred = typeof query.method === "string" ? (query.method as PayMethod["id"]) : methods[0].id;
    panel = <PayForm token={token} amountLabel={amountLabel} invoiceNumber={invoice.number} methods={methods} defaultMethod={preferred} defaultEmail={returned?.receiptEmail ?? contact?.email ?? ""} bankDetails={settings.bankDetails} />;
  }

  const onlineNames = methods.filter((method) => method.id !== "BANK_TRANSFER").map((method) => method.label);

  return (
    <>
      <main className="mx-auto box-border flex w-full max-w-[1080px] flex-1 flex-wrap items-start gap-6 px-5 pt-7 pb-10">
        <section aria-labelledby="sum-title" className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs tracking-[0.14em] text-muted uppercase">Invoice {invoice.number} · from {settings.legalName}</span>
            <h1 id="sum-title" className="m-0 font-display text-2xl leading-[31px] font-bold">{invoice.project ? `${invoice.client.company} · ${invoice.project.name}` : invoice.client.company}</h1>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted">Billed to</dt><dd className="m-0 text-right">{contact ? `${contact.name}, ${invoice.client.company}` : invoice.client.company}</dd>
            <dt className="text-muted">Issued</dt><dd className="m-0 text-right">{formatDate(invoice.issueDate)}</dd>
            <dt className="text-muted">Due</dt>
            <dd className="m-0 text-right">
              <span className={`inline-flex min-h-[22px] items-center rounded-full px-[9px] text-xs font-medium ${paid ? "bg-[#e3f6ee] text-[#1a7f5a]" : overdue ? "bg-[#fdecec] text-[#b42323]" : "bg-[#fff1db] text-[#7a4800]"}`}>
                {paid ? "Paid" : invoice.status === "VOID" ? "Cancelled" : `${overdue ? "Overdue since" : "Due"} ${formatDate(invoice.dueDate)}`}
              </span>
            </dd>
          </dl>
          <div className="flex flex-col gap-1.5 border-y border-line py-3.5">
            {invoice.items.map((item) => (
              <span key={item.id} className="flex justify-between gap-4">
                <span>{item.description}{num(item.quantity) !== 1 ? ` × ${num(item.quantity)}` : ""}</span>
                <span className="whitespace-nowrap">{money(num(item.quantity) * num(item.rate), cur, { decimals: true })}</span>
              </span>
            ))}
            {totals.discount > 0 && <span className="flex justify-between gap-4 text-sm text-muted"><span>Discount</span><span>−{money(totals.discount, cur, { decimals: true })}</span></span>}
            {totals.vat > 0 && <span className="flex justify-between gap-4 text-sm text-muted"><span>VAT {num(invoice.vatRate)}%</span><span>{money(totals.vat, cur, { decimals: true })}</span></span>}
          </div>
          <span className="flex items-baseline justify-between gap-4"><strong>Total</strong><strong className="font-display text-2xl">{amountLabel}</strong></span>
          <Link href={`/pay/${token}/invoice`} className="inline-flex items-center gap-2 text-sm font-medium text-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
            Download invoice (PDF)
          </Link>
        </section>

        <section aria-labelledby="pay-title" aria-live="polite" className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-6">
          {panel}
        </section>
      </main>

      <footer className="px-5 pt-[18px] pb-7 text-center text-[13px] text-muted">
        Questions about this invoice? <a href={`mailto:${settings.invoicesFrom}`} className="text-link">{settings.invoicesFrom}</a> · <Link href="/privacy" className="text-link">Privacy</Link> · <Link href="/terms" className="text-link">Terms</Link>
        {onlineNames.length > 0 && <><br />Payments are processed by {onlineNames.join(" or ")}. Ledobiz never sees or stores your card details.</>}      </footer>
    </>
  );
}

function StateBlock({ tone, title, children }: { tone: "ok" | "bad" | "info" | "neutral"; title: string; children: ReactNode }) {
  const icon = {
    ok: <span className="inline-flex size-14 items-center justify-center rounded-full bg-salsify"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000033" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>,
    bad: <span className="inline-flex size-14 items-center justify-center rounded-full bg-[#fdecec]"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg></span>,
    info: <span className="inline-flex size-14 items-center justify-center rounded-full bg-tint"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#15627b" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>,
    neutral: <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4b5470" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg></span>,
  }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className="flex flex-col gap-4">
      {icon}
      <h2 id="pay-title" className="m-0 font-display text-2xl leading-[30px] font-bold">{title}</h2>
      {children}
    </div>
  );
}
