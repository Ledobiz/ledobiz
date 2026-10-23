import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/server/db";
import { receiptNumber } from "@/lib/server/payments";
import { getSettings } from "@/lib/server/settings";

/** The client's printable copy of their invoice, or its receipt once paid. */
export async function DocumentPage({ token, kind }: { token: string; kind: "invoice" | "receipt" }) {
  const [invoice, settings] = await Promise.all([
    db().invoice.findUnique({
      where: { payToken: token },
      include: { items: { orderBy: { position: "asc" } }, client: { include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } } }, project: { select: { name: true } } },
    }),
    getSettings(),
  ]);
  if (!invoice || invoice.status === "DRAFT" || (kind === "receipt" && invoice.status !== "PAID")) {
    notFound();
  }
  return (
    <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/pay/${token}`} className="text-sm text-link">← Back to payment page</Link>
        <PrintButton label="Download PDF" />
      </div>
      <p className="m-0 text-[13px] text-muted print:hidden">Choose “Save as PDF” as the printer to download a copy.</p>
      <InvoiceDocument
        invoice={invoice}
        company={settings}
        receipt={kind === "receipt" ? { number: receiptNumber(invoice.number), method: invoice.paymentMethod, reference: invoice.paymentReference } : undefined}
      />
    </main>
  );
}
