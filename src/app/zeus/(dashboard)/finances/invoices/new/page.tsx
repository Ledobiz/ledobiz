import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { num, toDateInput } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { InvoiceEditor } from "./invoice-editor";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/zeus/finances/invoices/new">) {
  await requireUser("finance");
  const params = await searchParams;
  const [clients, projects, settings] = await Promise.all([
    db().client.findMany({ orderBy: { company: "asc" }, select: { id: true, company: true, contacts: { orderBy: { isPrimary: "desc" }, take: 1, select: { name: true, email: true } } } }),
    db().project.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { name: "asc" },
      select: { id: true, clientId: true, name: true, currency: true, contractValue: true, milestones: { orderBy: { position: "asc" }, select: { id: true, name: true, paymentPercent: true } } },
    }),
    getSettings(),
  ]);
  const projectId = typeof params.project === "string" ? params.project : "";
  const project = projects.find((item) => item.id === projectId);
  const clientId = project?.clientId ?? (typeof params.client === "string" ? params.client : "");
  const today = new Date();
  const due = new Date(today.getTime() + settings.paymentTermsDays * 86_400_000);

  return (
    <>
      <PageHeader breadcrumb={[{ href: "/zeus/finances", label: "Finances" }]} title="New invoice" subtitle={`Numbered automatically (${settings.invoicePrefix}${today.getFullYear()}-0001 and up). Payment terms default to ${settings.paymentTermsDays} days.`} />
      <InvoiceEditor
        clients={clients.map((client) => ({ id: client.id, company: client.company, contact: client.contacts[0] ? `${client.contacts[0].name} <${client.contacts[0].email}>` : null }))}
        projects={projects.map((item) => ({ ...item, contractValue: num(item.contractValue) }))}
        defaults={{ clientId, projectId: project?.id ?? "", currency: project?.currency ?? settings.reportingCurrency, issueDate: toDateInput(today), dueDate: toDateInput(due), vatRate: num(settings.vatRate), notes: settings.bankDetails ? `Payment details:\n${settings.bankDetails}` : "" }}
      />
    </>
  );
}
