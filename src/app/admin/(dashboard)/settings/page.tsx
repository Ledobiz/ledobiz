import type { Metadata } from "next";
import { addTeamMember, saveAutomationSettings, saveCompanySettings, saveEmailSettings, saveMoneySettings, saveQuoteSettings, updateTeamMember } from "@/app/admin/actions/settings";
import { Avatar, btnSmall, Card, CardHeader, Chip, Field, inputClass, PageHeader, textareaClass } from "@/components/admin/ui";
import { formatDateTime, num, roleLabels, supportedCurrencies } from "@/lib/admin/format";
import { isAiConfigured } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { emailProviderName } from "@/lib/server/mailer";
import { isProviderConfigured, providerNames } from "@/lib/server/payment-providers";
import { PushToggle } from "@/components/admin/push-toggle";
import { pushAppId } from "@/lib/server/push";
import { readRunSummary } from "@/lib/server/scheduled-emails";
import { getSettings, readRates } from "@/lib/server/settings";
import { ResetPasswordForm, RunNowButton, SettingsForm, TestEmailButton, TestPushButton } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

const grid = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4";
const automations = [
  { name: "autoQuoteFollowUp", label: "Quote follow-up", when: "5 days after you reply to a quote, if they haven’t answered" },
  { name: "autoWelcome", label: "Welcome and kick-off", when: "When a project’s deposit invoice is paid" },
  { name: "autoWeeklyUpdates", label: "Weekly progress update", when: "Fridays, for ongoing projects with no update that week. Skipped when a project is behind schedule." },
  { name: "autoPaymentReminders", label: "Payment reminder", when: "3 days before an invoice is due" },
  { name: "autoOverdueReminders", label: "Overdue invoice", when: "The day after the due date, then weekly (up to 6 times)" },
  { name: "autoFeedbackRequests", label: "Feedback request", when: "14 days after a project is delivered" },
  { name: "autoSupportRenewals", label: "Support plan renewal", when: "When a project’s free fixes end, and a week before each renewal" },
] as const;

const roleHelp: Record<string, string> = {
  ADMIN: "Everything, including settings and the team",
  PROJECT_LEAD: "Quotes, projects and clients",
  FINANCE: "Clients, invoices and finances",
  MEMBER: "Their own projects and milestones",
};

export default async function SettingsPage() {
  const me = await requireUser("settings");
  const [settings, team] = await Promise.all([getSettings(), db().user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] })]);
  const rates = readRates(settings);
  const lastRun = readRunSummary(settings.automationLastRun);
  const emailProvider = emailProviderName();
  const aiReady = isAiConfigured();
  const pushApp = pushAppId();

  return (
    <>
      <PageHeader title="Settings" subtitle="Company details, the team, emails, AI and money. Server keys (database, Brevo, OpenAI, Paystack, Flutterwave) live in environment variables." />

      <section aria-label="Connections" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
        <Card className="flex flex-col gap-2.5 px-4 py-3.5">
          <span className="flex items-center justify-between gap-3">
            <span className="flex flex-col"><strong>Email sending</strong><span className="text-[13px] text-muted">{emailProvider ?? "Set BREVO_API_KEY"}</span></span>
            <Chip tone={emailProvider ? "ok" : "warn"}>{emailProvider ? "Connected" : "Not set up"}</Chip>
          </span>
          {emailProvider && <TestEmailButton />}
        </Card>
        {(["PAYSTACK", "FLUTTERWAVE"] as const).map((provider) => (
          <Card key={provider} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="flex flex-col"><strong>{providerNames[provider]}</strong><span className="text-[13px] text-muted">{isProviderConfigured(provider) ? (provider === "FLUTTERWAVE" && !process.env.FLUTTERWAVE_WEBHOOK_HASH ? "Add FLUTTERWAVE_WEBHOOK_HASH for webhooks" : "Online payments on") : `Set ${provider}_SECRET_KEY`}</span></span>
            <Chip tone={isProviderConfigured(provider) ? "ok" : "warn"}>{isProviderConfigured(provider) ? "Connected" : "Not set up"}</Chip>
          </Card>
        ))}
        <Card className="flex items-center justify-between gap-3 px-4 py-3.5"><span className="flex flex-col"><strong>AI drafting</strong><span className="text-[13px] text-muted">{aiReady ? `OpenAI · ${process.env.OPENAI_MODEL || "gpt-5.4-mini"}` : "Set OPENAI_API_KEY"}</span></span><Chip tone={aiReady ? "ok" : "warn"}>{aiReady ? "Connected" : "Not set up"}</Chip></Card>
        <Card className="flex flex-col gap-2.5 px-4 py-3.5">
          <span className="flex items-center justify-between gap-3">
            <span className="flex flex-col"><strong>Push alerts</strong><span className="text-[13px] text-muted">{pushApp ? "New quotes alert admins’ phones and browsers" : "Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY"}</span></span>
            <Chip tone={pushApp ? "ok" : "warn"}>{pushApp ? "Connected" : "Not set up"}</Chip>
          </span>
          {pushApp && (
            <>
              <PushToggle appId={pushApp} userId={me.id} />
              <TestPushButton />
            </>
          )}
        </Card>
      </section>

      <Card aria-labelledby="company-title">
        <CardHeader id="company-title" title="Company" subtitle="Shown on invoices, receipts and email footers" />
        <SettingsForm action={saveCompanySettings}>
          <div className={grid}>
            <Field label="Trading name" htmlFor="tradingName"><input id="tradingName" name="tradingName" defaultValue={settings.tradingName} className={inputClass} /></Field>
            <Field label="Legal name" htmlFor="legalName"><input id="legalName" name="legalName" defaultValue={settings.legalName} className={inputClass} /></Field>
            <Field label="RC number" htmlFor="rcNumber"><input id="rcNumber" name="rcNumber" defaultValue={settings.rcNumber ?? ""} className={inputClass} /></Field>
            <Field label="Tax ID (TIN)" htmlFor="taxId"><input id="taxId" name="taxId" defaultValue={settings.taxId ?? ""} className={inputClass} /></Field>
            <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" defaultValue={settings.email} className={inputClass} /></Field>
            <Field label="Phone" htmlFor="phone"><input id="phone" name="phone" defaultValue={settings.phone ?? ""} className={inputClass} /></Field>
            <Field label="Website" htmlFor="website"><input id="website" name="website" type="url" defaultValue={settings.website} className={inputClass} /></Field>
            <Field label="Address" htmlFor="address" className="col-span-full"><textarea id="address" name="address" rows={2} defaultValue={settings.address ?? ""} className={textareaClass} /></Field>
          </div>
        </SettingsForm>
      </Card>

      <Card aria-labelledby="team-title" className="overflow-hidden">
        <CardHeader id="team-title" title="Team" subtitle="Who can sign in, and what they can see" />
        <ul className="m-0 flex list-none flex-col p-0">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-line px-5 py-3.5 first:border-t-0">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={member.name} color={member.active ? undefined : "bg-line"} />
                <span className="flex min-w-0 flex-col">
                  <strong className="flex items-center gap-2">{member.name}{member.id === me.id && <Chip tone="info">You</Chip>}{!member.active && <Chip tone="neutral">Deactivated</Chip>}</strong>
                  <span className="text-[13px] text-muted">{member.email} · last active {member.lastActiveAt ? formatDateTime(member.lastActiveAt) : "never"}</span>
                  {member.id !== me.id && <ResetPasswordForm userId={member.id} name={member.name} />}
                </span>
              </span>
              <form action={updateTeamMember.bind(null, member.id)} className="flex flex-wrap items-center gap-2">
                <label htmlFor={`role-${member.id}`} className="sr-only">Role for {member.name}</label>
                <select id={`role-${member.id}`} name="role" defaultValue={member.role} disabled={member.id === me.id} className={`${inputClass} w-auto`}>
                  {Object.keys(roleHelp).map((role) => <option key={role} value={role}>{roleLabels[role] ?? role}</option>)}
                </select>
                <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" name="active" defaultChecked={member.active} disabled={member.id === me.id} className="size-4 accent-midnight" />Active</label>
                {member.id !== me.id && <button type="submit" className={btnSmall}>Save</button>}
              </form>
            </li>
          ))}
        </ul>
        <div className="border-t border-line bg-[#fbfcfe]">
          <SettingsForm action={addTeamMember} submitLabel="Add team member" successText="Added. Share their password with them privately.">
            <h3 className="m-0 text-base font-semibold">Add someone</h3>
            <div className={grid}>
              <Field label="Name" htmlFor="new-name"><input id="new-name" name="name" required className={inputClass} /></Field>
              <Field label="Email" htmlFor="new-email"><input id="new-email" name="email" type="email" required className={inputClass} /></Field>
              <Field label="Role" htmlFor="new-role">
                <select id="new-role" name="role" defaultValue="PROJECT_LEAD" className={inputClass}>
                  {Object.entries(roleHelp).map(([role, help]) => <option key={role} value={role}>{roleLabels[role] ?? role} · {help}</option>)}
                </select>
              </Field>
              <Field label="Temporary password" htmlFor="new-password" hint="At least 10 characters. They can change it under Your account."><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={10} required className={inputClass} /></Field>
            </div>
          </SettingsForm>
        </div>
      </Card>

      <Card aria-labelledby="email-title">
        <CardHeader id="email-title" title="Emails and AI" subtitle="How emails are sent and how the AI writes them" />
        <SettingsForm action={saveEmailSettings}>
          <div className={grid}>
            <Field label="Sender name" htmlFor="emailFromName"><input id="emailFromName" name="emailFromName" defaultValue={settings.emailFromName} className={inputClass} /></Field>
            <Field label="Send from" htmlFor="emailFrom" hint="Must be a verified sender in Brevo"><input id="emailFrom" name="emailFrom" type="email" defaultValue={settings.emailFrom} className={inputClass} /></Field>
            <Field label="Invoices and receipts from" htmlFor="invoicesFrom" hint="Must be a verified sender in Brevo"><input id="invoicesFrom" name="invoicesFrom" type="email" defaultValue={settings.invoicesFrom} className={inputClass} /></Field>
            <Field label="Signature" htmlFor="signature" hint="{name} becomes the sender’s first name" className="col-span-full"><textarea id="signature" name="signature" rows={4} defaultValue={settings.signature} className={textareaClass} /></Field>
            <Field label="Default AI tone" htmlFor="aiTone"><input id="aiTone" name="aiTone" defaultValue={settings.aiTone} className={inputClass} /></Field>
            <Field label="Brand voice for the AI" htmlFor="aiBrandVoice" hint="The AI follows this in every draft" className="col-span-full"><textarea id="aiBrandVoice" name="aiBrandVoice" rows={4} defaultValue={settings.aiBrandVoice} className={textareaClass} /></Field>
          </div>
        </SettingsForm>
      </Card>

      <Card aria-labelledby="quote-title">
        <CardHeader id="quote-title" title="Quote form" subtitle="What happens when someone asks for a quote on the website" />
        <SettingsForm action={saveQuoteSettings}>
          <div className={grid}>
            <Field label="Reply within (hours)" htmlFor="quoteReplyHours" hint="Quotes older than this are flagged as late"><input id="quoteReplyHours" name="quoteReplyHours" type="number" min={1} max={240} defaultValue={settings.quoteReplyHours} className={inputClass} /></Field>
            <Field label="Notify these addresses" htmlFor="quoteNotifyEmails" hint="Separate with commas" className="col-span-2 max-sm:col-span-full"><input id="quoteNotifyEmails" name="quoteNotifyEmails" defaultValue={settings.quoteNotifyEmails} className={inputClass} /></Field>
          </div>
          <label className="inline-flex items-center gap-2"><input type="checkbox" name="sendQuoteConfirmation" defaultChecked={settings.sendQuoteConfirmation} className="size-[18px] accent-midnight" />Email the visitor a confirmation with their reference number</label>
        </SettingsForm>
      </Card>

      <Card aria-labelledby="auto-title">
        <CardHeader id="auto-title" title="Automatic emails and attachments" subtitle="Scheduled emails go out with the daily job at 8:00 (Lagos time). Each goes out once; nothing is sent twice." />
        <SettingsForm action={saveAutomationSettings}>
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="sr-only">Which emails to send automatically</legend>
            {automations.map((item) => (
              <label key={item.name} className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" name={item.name} defaultChecked={settings[item.name]} className="mt-0.5 size-[18px] flex-none accent-midnight" />
                <span className="flex flex-col"><strong className="font-medium">{item.label}</strong><span className="text-[13px] text-muted">{item.when}</span></span>
              </label>
            ))}
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 border-t border-line p-0 pt-4">
            <legend className="float-left mb-2.5 w-full p-0 font-medium">PDF attachments</legend>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" name="attachInvoicePdf" defaultChecked={settings.attachInvoicePdf} className="mt-0.5 size-[18px] flex-none accent-midnight" />
              <span className="flex flex-col"><strong className="font-medium">Attach the invoice PDF to invoice emails</strong><span className="text-[13px] text-muted">You can still switch it off or on each time you send. Preview it from any invoice with “Invoice PDF”.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" name="attachReceiptPdf" defaultChecked={settings.attachReceiptPdf} className="mt-0.5 size-[18px] flex-none accent-midnight" />
              <span className="flex flex-col"><strong className="font-medium">Attach the receipt PDF to receipt emails</strong><span className="text-[13px] text-muted">Includes receipts sent automatically after online payments.</span></span>
            </label>
            <span className="text-[13px] text-muted">The email always links to the invoice or receipt online too, so clients can download it either way.</span>
          </fieldset>
          <div className={grid}>
            <Field label="Booking link" htmlFor="bookingUrl" hint="Used for “Book a call” in quote emails, e.g. Calendly"><input id="bookingUrl" name="bookingUrl" type="url" defaultValue={settings.bookingUrl ?? ""} placeholder="https://calendly.com/…" className={inputClass} /></Field>
            <Field label="Feedback form link" htmlFor="feedbackUrl" hint="Without one, clients are asked to reply instead"><input id="feedbackUrl" name="feedbackUrl" type="url" defaultValue={settings.feedbackUrl ?? ""} placeholder="https://forms.gle/…" className={inputClass} /></Field>
          </div>
        </SettingsForm>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex flex-col">
              <strong>Last run</strong>
              <span className="text-[13px] text-muted">
                {lastRun ? `${formatDateTime(lastRun.ranAt)} · ${Object.values(lastRun.sent).reduce((sum, count) => sum + count, 0)} sent${lastRun.errors.length ? ` · ${lastRun.errors.length} failed` : ""}` : "Not run yet."}
                {!process.env.CRON_SECRET && " Set CRON_SECRET so the daily schedule can run."}
              </span>
            </span>
            <RunNowButton />
          </div>
          {lastRun && (Object.keys(lastRun.sent).length > 0 || lastRun.skipped.length > 0 || lastRun.errors.length > 0) && (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
              {Object.entries(lastRun.sent).map(([label, count]) => <li key={label}>{label}: <strong>{count}</strong></li>)}
              {lastRun.errors.map((error) => <li key={error} className="text-danger">{error}</li>)}
              {lastRun.skipped.map((note) => <li key={note} className="text-muted">Skipped: {note}</li>)}
            </ul>
          )}
        </div>
      </Card>

      <Card aria-labelledby="money-title">
        <CardHeader id="money-title" title="Money" subtitle="Invoices, VAT and how totals are converted" />
        <SettingsForm action={saveMoneySettings}>
          <div className={grid}>
            <Field label="Reporting currency" htmlFor="reportingCurrency"><select id="reportingCurrency" name="reportingCurrency" defaultValue={settings.reportingCurrency} className={inputClass}>{supportedCurrencies.map((code) => <option key={code}>{code}</option>)}</select></Field>
            <Field label="VAT %" htmlFor="vatRate"><input id="vatRate" name="vatRate" inputMode="decimal" defaultValue={num(settings.vatRate)} className={inputClass} /></Field>
            <Field label="Payment terms (days)" htmlFor="paymentTermsDays"><input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={180} defaultValue={settings.paymentTermsDays} className={inputClass} /></Field>
            <Field label="Invoice prefix" htmlFor="invoicePrefix" hint={`Next: ${settings.invoicePrefix}${new Date().getFullYear()}-0001`}><input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.invoicePrefix} className={inputClass} /></Field>
            <Field label="Target margin %" htmlFor="targetMargin"><input id="targetMargin" name="targetMargin" type="number" min={0} max={100} defaultValue={settings.targetMargin} className={inputClass} /></Field>
            <Field label="Bank details for invoices" htmlFor="bankDetails" className="col-span-full"><textarea id="bankDetails" name="bankDetails" rows={3} defaultValue={settings.bankDetails ?? ""} placeholder={"Bank: …\nAccount name: Ledobiz Technologies Limited\nAccount number: …"} className={textareaClass} /></Field>
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-medium">Exchange rates: value of 1 unit in {settings.reportingCurrency}</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3">
              {supportedCurrencies.filter((code) => code !== settings.reportingCurrency).map((code) => (
                <label key={code} className="flex flex-col gap-1 text-[13px] font-medium">1 {code} =<input name={`rate_${code}`} inputMode="decimal" defaultValue={rates[code] ?? ""} className={inputClass} /></label>
              ))}
            </div>
          </fieldset>
        </SettingsForm>
      </Card>
    </>
  );
}
