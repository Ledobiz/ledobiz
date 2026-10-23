import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/server/auth";
import { NewClientForm } from "../client-forms";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireUser("clients");
  return (
    <>
      <PageHeader breadcrumb={[{ href: "/zeus/clients", label: "Clients" }]} title="New client" subtitle="Clients are also added automatically when you reply to a quote." />
      <NewClientForm />
    </>
  );
}
