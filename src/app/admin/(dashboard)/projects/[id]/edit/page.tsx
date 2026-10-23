import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { updateProject } from "@/app/admin/actions/projects";
import { PageHeader } from "@/components/admin/ui";
import { toDateInput } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ProjectForm } from "../../project-form";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[id]/edit">) {
  const user = await requireUser("projects");
  const { id } = await params;
  if (user.role === "MEMBER") {
    redirect(`/admin/projects/${id}`);
  }
  const [project, clients, team] = await Promise.all([
    db().project.findUnique({ where: { id } }),
    db().client.findMany({ select: { id: true, company: true }, orderBy: { company: "asc" } }),
    db().user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader breadcrumb={[{ href: "/admin/projects", label: "Projects" }, { href: `/admin/projects/${project.id}`, label: project.name }]} title="Edit project" />
      <ProjectForm
        action={updateProject.bind(null, project.id)}
        mode="edit"
        clients={clients}
        team={team}
        values={{
          name: project.name,
          clientId: project.clientId,
          quoteId: project.quoteId ?? "",
          service: project.service,
          status: project.status,
          stage: project.stage ?? "",
          currency: project.currency,
          contractValue: project.contractValue.toString(),
          expenseBudget: project.expenseBudget.toString(),
          contractType: project.contractType,
          supportTerms: project.supportTerms ?? "",
          techStack: project.techStack.join(", "),
          startDate: toDateInput(project.startDate),
          deadline: toDateInput(project.deadline),
          freeSupportUntil: toDateInput(project.freeSupportUntil),
          leadId: project.leadId ?? "",
          stagingUrl: project.stagingUrl ?? "",
          repoUrl: project.repoUrl ?? "",
          designUrl: project.designUrl ?? "",
        }}
      />
    </>
  );
}
