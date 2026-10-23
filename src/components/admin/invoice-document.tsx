import Image from "next/image";
import { invoiceTotals } from "@/lib/admin/domain";
import { formatDate, money, num } from "@/lib/admin/format";

type Props = {
  invoice: {
    number: string;
    status: string;
    currency: string;
    issueDate: Date;
    dueDate: Date;
    paidAt: Date | null;
    vatRate: Parameters<typeof num>[0];
    discount: Parameters<typeof num>[0];
    notes: string | null;
    items: { id: string; description: string; quantity: Parameters<typeof num>[0]; rate: Parameters<typeof num>[0] }[];
    client: { company: string; city: string | null; country: string | null; contacts: { name: string; email: string }[] };
    project: { name: string } | null;
  };
  /** Renders the document as a receipt for a paid invoice. */
  receipt?: { number: string; method: string | null; reference: string | null };
  company: { legalName: string; address: string | null; email: string; phone: string | null; website: string; rcNumber: string | null; taxId: string | null };
};

/** The client-facing A4 invoice. Print it from the browser to save a PDF. */
export function InvoiceDocument({ invoice, company, receipt }: Props) {
  const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
  const contact = invoice.client.contacts[0];
  const cur = invoice.currency;

  return (
    <article aria-label={receipt ? `Receipt ${receipt.number}` : `Invoice ${invoice.number}`} className="relative mx-auto flex aspect-[210/297] w-full max-w-[794px] flex-col gap-8 overflow-hidden bg-white p-[clamp(24px,6%,56px)] text-[13px] leading-5 text-midnight shadow-[0_1px_3px_rgba(0,0,51,.08)] print:aspect-auto print:max-w-none print:p-0 print:shadow-none">
      {invoice.status === "PAID" && <span aria-hidden="true" className="absolute top-12 right-[-56px] rotate-45 bg-salsify px-16 py-1.5 text-sm font-bold tracking-[0.12em] text-midnight">PAID</span>}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Image src="/brand/ledobiz-logo-on-light.svg" alt="Ledobiz" width={150} height={36} />
          <div className="flex flex-col text-muted">
            <span className="font-medium text-midnight">{company.legalName}</span>
            {company.address && <span className="whitespace-pre-line">{company.address}</span>}
            <span>{company.email}{company.phone ? ` · ${company.phone}` : ""}</span>
            {(company.rcNumber || company.taxId) && <span>{[company.rcNumber && `RC ${company.rcNumber}`, company.taxId && `TIN ${company.taxId}`].filter(Boolean).join(" · ")}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-display text-[28px] leading-8 font-bold">{receipt ? "Receipt" : "Invoice"}</span>
          <span className="font-mono text-sm">{receipt ? receipt.number : invoice.number}</span>
          {receipt && <span className="text-xs text-muted">for invoice {invoice.number}</span>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.06em] text-muted">BILL TO</span>
          <strong className="text-sm">{invoice.client.company}</strong>
          {contact && <span>{contact.name} · {contact.email}</span>}
          {(invoice.client.city || invoice.client.country) && <span className="text-muted">{[invoice.client.city, invoice.client.country].filter(Boolean).join(", ")}</span>}
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:justify-self-end">
          <dt className="text-muted">Issued</dt><dd className="m-0 text-right">{formatDate(invoice.issueDate)}</dd>
          <dt className="text-muted">Due</dt><dd className="m-0 text-right font-medium">{formatDate(invoice.dueDate)}</dd>
          {invoice.project && <><dt className="text-muted">Project</dt><dd className="m-0 text-right">{invoice.project.name}</dd></>}
          {invoice.paidAt && <><dt className="text-muted">Paid</dt><dd className="m-0 text-right">{formatDate(invoice.paidAt)}</dd></>}
          {receipt?.method && <><dt className="text-muted">Paid with</dt><dd className="m-0 text-right">{receipt.method}</dd></>}
          {receipt?.reference && <><dt className="text-muted">Reference</dt><dd className="m-0 text-right break-all">{receipt.reference}</dd></>}
        </dl>
      </section>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-midnight text-left text-xs tracking-[0.06em] text-muted">
            <th scope="col" className="py-2 font-medium">DESCRIPTION</th>
            <th scope="col" className="w-14 py-2 text-right font-medium">QTY</th>
            <th scope="col" className="w-32 py-2 text-right font-medium">RATE</th>
            <th scope="col" className="w-36 py-2 text-right font-medium">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-line align-top">
              <td className="py-3 pr-3">{item.description}</td>
              <td className="py-3 text-right">{num(item.quantity)}</td>
              <td className="py-3 text-right whitespace-nowrap">{money(item.rate, cur, { decimals: true })}</td>
              <td className="py-3 text-right whitespace-nowrap">{money(num(item.quantity) * num(item.rate), cur, { decimals: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="m-0 grid w-full max-w-[300px] grid-cols-[1fr_auto] gap-y-1.5 self-end">
        <dt className="text-muted">Subtotal</dt><dd className="m-0 text-right">{money(totals.subtotal, cur, { decimals: true })}</dd>
        {totals.discount > 0 && <><dt className="text-muted">Discount</dt><dd className="m-0 text-right">−{money(totals.discount, cur, { decimals: true })}</dd></>}
        <dt className="text-muted">VAT ({num(invoice.vatRate)}%)</dt><dd className="m-0 text-right">{money(totals.vat, cur, { decimals: true })}</dd>
        <dt className="mt-1 border-t-2 border-midnight pt-2 font-semibold">{invoice.status === "PAID" ? "Total paid" : "Total due"}</dt>
        <dd className="m-0 mt-1 border-t-2 border-midnight pt-2 text-right font-display text-lg font-bold">{money(totals.total, cur, { decimals: true })}</dd>
      </dl>

      {invoice.notes && !receipt && (
        <section className="flex flex-col gap-1 rounded-lg bg-surface p-4 print:border print:border-line print:bg-white">
          <span className="text-xs font-medium tracking-[0.06em] text-muted">NOTES</span>
          <p className="m-0 whitespace-pre-line">{invoice.notes}</p>
        </section>
      )}

      <footer className="mt-auto flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
        <span>{receipt ? "Thank you for your payment." : `Please use ${invoice.number} as your payment reference.`}</span>
        <span>{company.website.replace(/^https?:\/\//, "")}</span>
      </footer>
    </article>
  );
}
