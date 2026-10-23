import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDraftInvoice, invoiceEmailText, voidInvoice } from "@/app/zeus/actions/finance";
import { invoiceLabel, invoiceTone } from "@/components/admin/status";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { btnSmall, Card, Chip, cx, Notice, PageHeader } from "@/components/admin/ui";
import { invoiceStatus } from "@/lib/admin/domain";
import { formatDate, formatDateTime, money, toDateInput } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isProviderConfigured } from "@/lib/server/payment-providers";
import { channelLabel, paymentLink } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";
import { PrintButton } from "@/components/print-button";
import { CopyLinkButton, MarkPaidPanel, SendInvoicePanel } from "./invoice-actions";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params, searchParams }: PageProps<"/zeus/finances/invoices/[id]">) {
  await requireUser("finance");
  const { id } = await params;
  const query = await searchParams;
  const [invoice, settings] = await Promise.all([
    db().invoice.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } },
        client: { include: { contacts: { orderBy: { isPrimary: "desc" } } } },
        project: { select: { id: true, name: true } },
        emails: { orderBy: { createdAt: "desc" }, select: { id: true, subject: true, status: true, createdAt: true, toAddress: true, attachments: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    getSettings(),
  ]);
  if (!invoice) {
    notFound();
  }
  const display = invoiceStatus(invoice, new Date());
  const onlineReady = isProviderConfigured("PAYSTACK") || isProviderConfigured("FLUTTERWAVE");
  const pendingTransfer = invoice.payments.find((payment) => payment.provider === "BANK_TRANSFER" && payment.status === "PENDING");
  const contact = invoice.client.contacts[0];
  const canSend = (invoice.status === "DRAFT" || invoice.status === "SENT") && contact;
  const email = canSend ? await invoiceEmailText(invoice.id) : null;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          breadcrumb={[{ href: "/zeus/finances", label: "Finances" }]}
          title={<span className="flex flex-wrap items-center gap-2.5">{invoice.number}<Chip tone={invoiceTone[display]}>{invoiceLabel[display]}</Chip></span>}
          subtitle={<><Link href={`/zeus/clients/${invoice.clientId}`} className="text-link">{invoice.client.company}</Link>{invoice.project && <> · <Link href={`/zeus/projects/${invoice.project.id}`} className="text-link">{invoice.project.name}</Link></>} · due {formatDate(invoice.dueDate)}</>}
          actions={
            <>
              <a href={`/zeus/finances/invoices/${invoice.id}/pdf${invoice.status === "PAID" ? "?kind=receipt" : ""}`} target="_blank" rel="noopener noreferrer" className={btnSmall}>
                {invoice.status === "PAID" ? "Receipt PDF" : "Invoice PDF"}
              </a>
              <PrintButton />
            </>
          }
        />
      </div>
      <div className="flex flex-col gap-3 print:hidden">
        {query.sent === "1" && <Notice tone="ok">Invoice created and emailed to {contact?.email}.</Notice>}
        {pendingTransfer && invoice.status === "SENT" && <Notice tone="warn">The client says they sent a bank transfer on {formatDateTime(pendingTransfer.createdAt)}. Check the account for {money(pendingTransfer.amount, pendingTransfer.currency, { decimals: true })} with reference {invoice.number}, then record the payment. The receipt goes to {pendingTransfer.receiptEmail}.</Notice>}
        {typeof query.error === "string" && <Notice tone="bad">The invoice was saved as a draft, but sending failed: {query.error}</Notice>}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[2_1_560px] print:flex-none">
          <InvoiceDocument invoice={{ ...invoice, client: { ...invoice.client, contacts: contact ? [contact] : [] } }} company={settings} />
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-5 print:hidden">
          {canSend && email && <SendInvoicePanel invoiceId={invoice.id} defaultSubject={email.subject} defaultBody={email.body} recipient={`${contact.name} <${contact.email}>`} resend={invoice.status === "SENT"} attachByDefault={settings.attachInvoicePdf} />}
          {!contact && invoice.status === "DRAFT" && <Notice tone="warn">Add a contact to {invoice.client.company} before sending this invoice.</Notice>}
          {invoice.status === "SENT" && <MarkPaidPanel invoiceId={invoice.id} today={toDateInput(new Date())} attachByDefault={settings.attachReceiptPdf} />}
          {invoice.status === "PAID" && (
            <Card className="flex flex-col gap-1.5 p-5 text-sm">
              <h2 className="m-0 font-display text-lg font-semibold">Paid</h2>
              <span>{formatDate(invoice.paidAt)} by {invoice.paymentMethod}{invoice.paymentReference ? ` · ref ${invoice.paymentReference}` : ""}</span>
            </Card>
          )}

          {invoice.payToken && invoice.status !== "DRAFT" && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="m-0 font-display text-lg font-semibold">Client payment page</h2>
              <span className="text-[13px] text-muted">{onlineReady ? "The client can pay by card, transfer or USSD here. It’s linked in the invoice email." : "Add PAYSTACK_SECRET_KEY or FLUTTERWAVE_SECRET_KEY to take payments online. Until then the page shows your bank details."}</span>
              <span className="flex flex-wrap items-center gap-2">
                <a href={paymentLink(invoice.payToken)} target="_blank" rel="noopener noreferrer" className={btnSmall}>Open page</a>
                <CopyLinkButton url={paymentLink(invoice.payToken)} />
              </span>
              {invoice.payments.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-line p-0 pt-3 text-sm">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id} className="flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong>{payment.provider === "BANK_TRANSFER" ? "Bank transfer (client says sent)" : payment.provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}</strong>
                        <Chip tone={payment.status === "SUCCESS" ? "ok" : payment.status === "FAILED" ? "bad" : "warn"}>{payment.status === "SUCCESS" ? "Paid" : payment.status === "FAILED" ? "Failed" : payment.provider === "BANK_TRANSFER" ? "To confirm" : "Pending"}</Chip>
                      </span>
                      <span className="text-xs text-muted">
                        {formatDateTime(payment.createdAt)} · {money(payment.amount, payment.currency, { decimals: true })}{payment.channel ? ` · ${channelLabel(payment.channel)}` : ""}{payment.cardLast4 ? ` ending ${payment.cardLast4}` : ""} · {payment.receiptEmail}
                      </span>
                      {payment.failureReason && <span className="text-xs text-danger">{payment.failureReason}</span>}
                      <span className="font-mono text-[11px] text-muted">{payment.reference}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="m-0 font-display text-lg font-semibold">Emails</h2>
            {invoice.emails.length === 0 ? <span className="text-sm text-muted">Not sent yet.</span> : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
                {invoice.emails.map((item) => (
                  <li key={item.id} className="flex flex-col">
                    <Link href={`/zeus/clients/${invoice.clientId}?email=${item.id}`} className="text-link">{item.subject}</Link>
                    <span className="text-xs text-muted">{formatDateTime(item.createdAt)} · {item.toAddress}{item.status !== "SENT" ? ` · ${item.status === "NOT_SENT" ? "not sent" : "failed"}` : ""}{item.attachments.length ? ` · ${item.attachments.join(", ")} attached` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
            <div className="flex flex-wrap gap-2">
              {invoice.status === "SENT" && <form action={voidInvoice.bind(null, invoice.id)}><button type="submit" className={cx(btnSmall, "text-danger")}>Void invoice</button></form>}
              {invoice.status === "DRAFT" && <form action={deleteDraftInvoice.bind(null, invoice.id)}><button type="submit" className={cx(btnSmall, "text-danger")}>Delete draft</button></form>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
