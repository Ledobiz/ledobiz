import type { Metadata } from "next";
import { changeOwnPassword } from "@/app/admin/actions/settings";
import { Card, CardHeader, Field, inputClass, PageHeader } from "@/components/admin/ui";
import { roleLabels } from "@/lib/admin/format";
import { requireUser } from "@/lib/server/auth";
import { SettingsForm } from "../settings/settings-form";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Your account" subtitle={`${user.name} · ${user.email} · ${roleLabels[user.role] ?? user.role}`} />
      <Card aria-labelledby="password-title" className="max-w-[560px]">
        <CardHeader id="password-title" title="Change password" />
        <SettingsForm action={changeOwnPassword} submitLabel="Change password" successText="Password changed.">
          <Field label="Current password" htmlFor="current"><input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} /></Field>
          <Field label="New password" htmlFor="next" hint="At least 10 characters"><input id="next" name="next" type="password" autoComplete="new-password" minLength={10} required className={inputClass} /></Field>
          <Field label="Confirm new password" htmlFor="confirm"><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} /></Field>
        </SettingsForm>
      </Card>
    </>
  );
}
