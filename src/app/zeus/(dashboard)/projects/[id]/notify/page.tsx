import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { healthTone } from "@/components/admin/status";
import { Card, Chip, PageHeader } from "@/components/admin/ui";
import { milestoneVariance, projectHealth } from "@/lib/admin/domain";
import { formatDate, formatShortDate, toDateInput } from "@/lib/admin/format";
import { isAiConfigured } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { DelayComposer } from "./delay-composer";

export const metadata: Metadata = { title: "Deadline email" };

export default async function NotifyPage({ params }: PageProps<"/zeus/projects/[id]/notify">) {
  const user = await requireUser("projects");
  const { id } = await params;
  const project = await db().project.findUnique({
    where: { id },
    include: { client: { include: { contacts: { orderBy: { isPrimary: "desc" } } } }, milestones: { orderBy: { position: "asc" } }, lead: { select: { name: true, email: true } } },
  });
  if (!project) {
    notFound();
  }
  const now = new Date();
  const health = projectHealth(project, project.milestones, now);
  const contact = project.client.contacts[0];
  const late = project.milestones.filter((m) => m.status !== "COMPLETED" && milestoneVariance(m, now) > 0);

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/zeus/projects", label: "Projects" }, { href: `/zeus/projects/${project.id}`, label: project.name }]}
        title="Email the client about the deadline"
        subtitle="Tell them early and honestly. The AI drafts it from the project’s milestones and your reasons; you edit before sending."
      />
      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 p-5">
          <h2 className="m-0 font-display text-lg font-semibold">Where things stand</h2>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2.5 text-sm">
            <dt className="text-muted">Health</dt><dd className="m-0"><Chip tone={healthTone[health.health]}>{health.label}</Chip></dd>
            <dt className="text-muted">Agreed deadline</dt><dd className="m-0 font-medium">{formatDate(project.deadline)}</dd>
            <dt className="text-muted">Forecast launch</dt><dd className="m-0 font-medium">{formatDate(health.forecastLaunch)}</dd>
            <dt className="text-muted">Work done</dt><dd className="m-0">{health.workPercent}% with {health.timePercent}% of the time used</dd>
          </dl>
          {late.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <span className="text-sm font-medium">Late milestones</span>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {late.map((milestone) => (
                  <li key={milestone.id} className="flex flex-col">
                    <span>{milestone.name} <span className="text-danger">+{milestoneVariance(milestone, now)}d</span></span>
                    <span className="text-[13px] text-muted">Planned {formatShortDate(milestone.plannedEnd)}{milestone.blocker ? ` · ${milestone.blocker}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <DelayComposer
          projectId={project.id}
          aiReady={isAiConfigured()}
          recipient={contact ? `${contact.name} <${contact.email}>` : null}
          cc={project.lead?.email ?? null}
          suggestedDate={toDateInput(health.forecastLaunch ?? project.deadline)}
          signer={user.name}
          defaultSubject={`${project.name}: update on the launch date`}
          blockers={project.milestones.flatMap((m) => (m.blocker ? [m.blocker] : []))}
        />
      </div>
    </>
  );
}
