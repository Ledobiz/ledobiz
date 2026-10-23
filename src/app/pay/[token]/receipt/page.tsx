import type { Metadata } from "next";
import { DocumentPage } from "../document-page";

export const metadata: Metadata = { title: "Receipt" };

export default async function ClientReceiptPage({ params }: PageProps<"/pay/[token]/receipt">) {
  const { token } = await params;
  return <DocumentPage token={token} kind="receipt" />;
}
