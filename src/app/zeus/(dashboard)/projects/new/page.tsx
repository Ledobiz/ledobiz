import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createProject } from "@/app/zeus/actions/projects";
import { projectTypeLabel } from "@/components/admin/status";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ProjectForm, type ProjectFormValues } from "../project-form";

export const metadata: Metadata = { title: "New project" };

const serviceForType: Record<string, string> = { web: "Web app", mobile: "Mobile app", desktop: "Desktop software", consult: "Consulting" };

export default async function NewProjectPage({ searchParams }: PageProps<"/zeus/projects/new">) {
  const user = await requireUser("projects");
  if (user.role === "MEMBER") {
    redirect("/zeus/projects");
  }
  const { quote: quoteId } = await searchParams;
  const [clients, team, quote] = await Promise.all([
    db().client.findMany({ select: { id: true, company: true }, orderBy: { company: "asc" } }),
    db().user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    typeof quoteId === "string" ? db().quoteRequest.findUnique({ where: { id: quoteId } }) : null,
  ]);

  const values: ProjectFormValues = {
    name: quote ? `${quote.company ?? quote.name} ${projectTypeLabel[quote.projectType]?.toLowerCase() ?? "project"}` : "",
    clientId: quote?.clientId ?? "",
    quoteId: quote?.id ?? "",
    service: quote ? serviceForType[quote.projectType] ?? "Web app" : "Website",
    status: "PENDING",
    stage: "Awaiting deposit",
    currency: quote?.currency ?? "NGN",
    contractValue: "",
    expenseBudget: "",
    contractType: "Fixed price",
    supportTerms: "",
    techStack: "",
    startDate: "",
    deadline: "",
    freeSupportUntil: "",
    leadId: user.id,
    stagingUrl: "",
    repoUrl: "",
    designUrl: "",
  };

  return (
    <>
      <PageHeader breadcrumb={[{ href: "/zeus/projects", label: "Projects" }]} title="New project" subtitle="Add the agreed scope, price and dates. You can change any of this later." />
      {quote && <Notice tone="info">Started from quote {quote.reference} by {quote.name}. Budget given: {quote.budget}{quote.budget.startsWith("Not sure") ? "" : ` (${quote.currency})`}, launch: {quote.timeline}.</Notice>}
      <ProjectForm action={createProject} values={values} clients={clients} team={team} mode="create" newClient={quote && !quote.clientId ? { company: quote.company ?? quote.name, name: quote.name, email: quote.email } : undefined} />
    </>
  );
}
