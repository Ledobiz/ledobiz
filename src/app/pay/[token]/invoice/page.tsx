import type { Metadata } from "next";
import { DocumentPage } from "../document-page";

export const metadata: Metadata = { title: "Invoice" };

export default async function ClientInvoicePage({ params }: PageProps<"/pay/[token]/invoice">) {
  const { token } = await params;
  return <DocumentPage token={token} kind="invoice" />;
}
