"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  BrowserIcon,
  BulbIcon,
  CheckIcon,
  ClockIcon,
  DesktopIcon,
  LockIcon,
  PhoneIcon,
  ShieldIcon,
} from "@/components/icons";
import {
  budgetOptions,
  currencies,
  DEFAULT_CURRENCY,
  DETAILS_MAX_LENGTH,
  features as featureOptions,
  isCurrencyCode,
  NOT_SURE_BUDGET,
  projectTypes,
  timelines,
  validateEmail,
  validateName,
  validatePhone,
  type CurrencyCode,
  type ProjectType,
  type QuoteResponse,
} from "@/lib/quote";
import { site } from "@/lib/site";
import { Turnstile } from "@/components/turnstile";

// Set at build time; without it (local development) the bot check is skipped.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Status = "idle" | "sending" | "failed" | "done";
type Field = "name" | "email" | "phone";

const STEP_LABELS = ["Project type", "Budget and timeline", "Features", "Your details"];
const SEGMENT_COLORS = ["bg-river", "bg-salsify", "bg-gold", "bg-midnight"];

const typeIcons: Record<ProjectType, ReactNode> = {
  web: <BrowserIcon />,
  mobile: <PhoneIcon />,
  desktop: <DesktopIcon />,
  consult: <BulbIcon />,
};

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <AlertCircleIcon size={16} className="mt-px flex-none" />
      {children}
    </span>
  );
}

const pillBase = "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors";
const pillClass = (selected: boolean, invalid = false) =>
  cx(pillBase, selected ? "border-midnight bg-midnight text-white" : cx("bg-white text-midnight hover:border-midnight", invalid ? "border-danger" : "border-control"));
const inputClass = (invalid: boolean) =>
  cx(
    "min-h-11 w-full rounded-lg border bg-white px-3 py-2.5 text-[15px] text-midnight placeholder:text-[#6b7389] disabled:opacity-70",
    invalid ? "border-danger shadow-[0_0_0_1px_var(--color-danger)]" : "border-control",
  );
const legendClass = "mb-3 p-0 font-display text-lg leading-6 font-semibold";

export function QuoteForm({ preset = null }: { preset?: ProjectType | null }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [reference, setReference] = useState("");

  const [type, setType] = useState<ProjectType | null>(preset);
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [budgetIndex, setBudgetIndex] = useState<number | null>(null);
  const [timeline, setTimeline] = useState("");
  const [chosenFeatures, setChosenFeatures] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  const headingRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const interacted = useRef(false);
  const currencyChosen = useRef(false);

  // Start in the visitor's local currency (from their IP country), unless they've already picked one.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/geo", { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ currency?: unknown }>) : null))
      .then((geo) => {
        if (geo && isCurrencyCode(geo.currency) && !currencyChosen.current) {
          setCurrency(geo.currency);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // Move focus to the new step (or the success message) after the visitor navigates, never on first load.
  useEffect(() => {
    if (!interacted.current) {
      return;
    }
    if (status === "done") {
      successRef.current?.focus();
    } else {
      headingRef.current?.focus();
    }
  }, [step, status]);

  const budgets = budgetOptions(currency);
  const budget = budgetIndex === null ? "" : budgets[budgetIndex];
  const sending = status === "sending";

  const nameError = serverErrors.name || validateName(name);
  const emailError = serverErrors.email || validateEmail(email);
  const phoneError = serverErrors.phone || validatePhone(phone);
  const fieldErrors: Record<Field, string> = { name: nameError, email: emailError, phone: phoneError };

  const stepErrorCount = (current: number): number => {
    if (current === 1) {
      return type ? 0 : 1;
    }
    if (current === 2) {
      return (budgetIndex === null ? 1 : 0) + (timeline ? 0 : 1);
    }
    if (current === 4) {
      return (nameError ? 1 : 0) + (emailError ? 1 : 0) + (phoneError ? 1 : 0);
    }
    return 0;
  };

  const attemptedThisStep = !!attempted[step];
  const showFieldError = (field: Field) => !!fieldErrors[field] && (attemptedThisStep || !!touched[field]);
  const errorCount = stepErrorCount(4);

  const goTo = (nextStep: number) => {
    interacted.current = true;
    setStep(nextStep);
  };

  const submit = async () => {
    interacted.current = true;
    setStatus("sending");
    setServerErrors({});
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, currency, budget, timeline, features: chosenFeatures, details, name, email, phone, company, website, turnstileToken }),
      });
      const result = (await response.json().catch(() => null)) as QuoteResponse | null;
      if (response.ok && result?.ok) {
        setReference(result.reference);
        setStatus("done");
        return;
      }
      // Each security token works once, so fetch a new one before the visitor tries again.
      setTurnstileReset((value) => value + 1);
      if ((response.status === 403 || response.status === 503) && result && !result.ok && result.errors.turnstile) {
        setServerErrors(result.errors);
        setStatus("idle");
        return;
      }
      if (response.status === 422 && result && !result.ok) {
        setServerErrors(result.errors);
        setAttempted((value) => ({ ...value, 4: true }));
        setStatus("idle");
        return;
      }
      setStatus("failed");
    } catch {
      setStatus("failed");
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) {
      return;
    }
    if (stepErrorCount(step) > 0) {
      setAttempted((value) => ({ ...value, [step]: true }));
      if (step === 4) {
        const firstInvalid = (["name", "email", "phone"] as Field[]).find((field) => fieldErrors[field]);
        if (firstInvalid) {
          ({ name: nameRef, email: emailRef, phone: phoneRef })[firstInvalid].current?.focus();
        }
      }
      return;
    }
    if (step < 4) {
      goTo(step + 1);
    } else if (!TURNSTILE_SITE_KEY || turnstileToken) {
      void submit();
    }
  };

  const reset = () => {
    interacted.current = true;
    setStep(1);
    setStatus("idle");
    setAttempted({});
    setTouched({});
    setServerErrors({});
    setReference("");
    setType(preset);
    setBudgetIndex(null);
    setTimeline("");
    setChosenFeatures([]);
    setDetails("");
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
  };

  const clearServerError = (field: string) => {
    if (serverErrors[field]) {
      setServerErrors((value) => {
        const next = { ...value };
        delete next[field];
        return next;
      });
    }
  };

  const toggleFeature = (feature: string) =>
    setChosenFeatures((value) => (value.includes(feature) ? value.filter((item) => item !== feature) : [...value, feature]));

  let primaryLabel = "Continue";
  if (step === 3 && chosenFeatures.length === 0 && !details.trim()) {
    primaryLabel = "Skip for now";
  }
  if (step === 4) {
    primaryLabel = sending ? "Sending your request…" : TURNSTILE_SITE_KEY && !turnstileToken ? "Checking you’re not a robot…" : status === "failed" ? "Try again" : "Get my free quote";
  }

  const typeLabel = projectTypes.find((item) => item.id === type)?.label ?? "—";
  const budgetSummary = budget ? (budget === NOT_SURE_BUDGET ? budget : `${budget} (${currency})`) : "—";
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Free quote request"
      className="relative flex w-full flex-col gap-[22px] rounded-2xl border border-line bg-white p-5 text-[15px] leading-[22px] text-midnight shadow-[0_24px_60px_rgba(0,0,51,0.28)] sm:p-7"
    >
      {status !== "done" && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs leading-4 font-medium tracking-[0.35em] text-link">FREE PROJECT QUOTE</span>
            <h2 className="m-0 font-display text-[26px] leading-8 font-bold">Get your free estimate</h2>
            <p className="m-0 text-sm leading-5 text-muted">About 60 seconds. No commitment. We reply within 24 hours.</p>
          </div>

          <div ref={headingRef} tabIndex={-1} className="flex flex-col gap-2 outline-none">
            <div className="flex justify-between text-[13px] leading-[18px]">
              <span className="font-medium">{STEP_LABELS[step - 1]}</span>
              <span className="text-muted">Step {step} of 4</span>
            </div>
            <div role="progressbar" aria-label="Quote form progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} className="flex gap-1.5">
              {SEGMENT_COLORS.map((color, index) => (
                <span key={color} className={cx("h-1.5 flex-1 rounded-full", index < step ? color : "bg-line")} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Spam trap: hidden from people, filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="qf-website">Website</label>
        <input id="qf-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>

      {status !== "done" && step === 1 && (
        <fieldset aria-describedby={attemptedThisStep && !type ? "qf-type-err" : undefined} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className={legendClass}>What are you building?</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {projectTypes.map((option) => {
              const selected = option.id === type;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setType(option.id)}
                  className={cx(
                    "relative flex cursor-pointer flex-col items-start gap-1.5 rounded-lg text-left text-midnight transition-colors hover:border-midnight",
                    selected ? "border-2 border-midnight bg-tint p-[13px]" : cx("border bg-white p-3.5", attemptedThisStep && !type ? "border-danger" : "border-control"),
                  )}
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-surface">{typeIcons[option.id]}</span>
                  <span className="text-[15px] leading-5 font-bold">{option.label}</span>
                  <span className="text-[13px] leading-[18px] text-muted">{option.hint}</span>
                  {selected && (
                    <span aria-hidden="true" className="absolute top-2.5 right-2.5 inline-flex size-5 items-center justify-center rounded-full bg-midnight text-white">
                      <CheckIcon size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {attemptedThisStep && !type && <FieldError id="qf-type-err">Choose the option that best fits your project.</FieldError>}
        </fieldset>
      )}

      {status !== "done" && step === 2 && (
        <div className="flex flex-col gap-[22px]">
          <fieldset aria-describedby={attemptedThisStep && budgetIndex === null ? "qf-budget-err" : undefined} className="m-0 min-w-0 border-0 p-0">
            <legend className={legendClass}>What is your budget?</legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-surface py-2 pr-2 pl-3">
              <label htmlFor="qf-currency" className="text-sm leading-5 font-medium">Show amounts in</label>
              <select
                id="qf-currency"
                value={currency}
                onChange={(event) => {
                  currencyChosen.current = true;
                  setCurrency(event.target.value as CurrencyCode);
                }}
                className="min-h-11 cursor-pointer rounded-lg border border-control bg-white px-3 text-sm font-medium text-midnight"
              >
                {currencies.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {budgets.map((option, index) => (
                <button key={option} type="button" aria-pressed={budgetIndex === index} onClick={() => setBudgetIndex(index)} className={pillClass(budgetIndex === index, attemptedThisStep && budgetIndex === null)}>
                  {option}
                </button>
              ))}
            </div>
            {attemptedThisStep && budgetIndex === null && (
              <div className="mt-2.5"><FieldError id="qf-budget-err">Choose a budget range, or pick “Not sure yet”.</FieldError></div>
            )}
          </fieldset>
          <fieldset aria-describedby={attemptedThisStep && !timeline ? "qf-timeline-err" : undefined} className="m-0 min-w-0 border-0 p-0">
            <legend className={legendClass}>When do you want to launch?</legend>
            <div className="flex flex-wrap gap-2">
              {timelines.map((option) => (
                <button key={option} type="button" aria-pressed={timeline === option} onClick={() => setTimeline(option)} className={pillClass(timeline === option, attemptedThisStep && !timeline)}>
                  {option}
                </button>
              ))}
            </div>
            {attemptedThisStep && !timeline && (
              <div className="mt-2.5"><FieldError id="qf-timeline-err">Choose when you would like to launch.</FieldError></div>
            )}
          </fieldset>
        </div>
      )}

      {status !== "done" && step === 3 && (
        <div className="flex flex-col gap-[18px]">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-1 p-0 font-display text-lg leading-6 font-semibold">What should it include?</legend>
            <p className="mt-0 mb-3 text-[13px] leading-[18px] text-muted">Pick all that apply. Not sure? Skip this step.</p>
            <div className="flex flex-wrap gap-2">
              {featureOptions.map((feature) => {
                const selected = chosenFeatures.includes(feature);
                return (
                  <button key={feature} type="button" aria-pressed={selected} onClick={() => toggleFeature(feature)} className={pillClass(selected)}>
                    {selected && <CheckIcon size={14} strokeWidth={3} />}
                    {feature}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qf-details" className="text-sm leading-5 font-medium">
              Tell us about your project <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="qf-details"
              rows={3}
              maxLength={DETAILS_MAX_LENGTH}
              aria-describedby="qf-details-count"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Who is it for, and what problem does it solve?"
              className="w-full resize-y rounded-lg border border-control bg-white px-3 py-2.5 text-[15px] text-midnight placeholder:text-[#6b7389]"
            />
            <span id="qf-details-count" className="self-end text-xs leading-4 text-muted">
              {details.length} / {DETAILS_MAX_LENGTH}
            </span>
          </div>
        </div>
      )}

      {status !== "done" && step === 4 && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-3.5 border-0 p-0">
          <legend className={legendClass}>Where should we send your quote?</legend>

          {attemptedThisStep && errorCount > 0 && !sending && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger bg-danger-tint px-3.5 py-3 text-sm leading-5 text-danger-ink">
              <AlertCircleIcon size={18} className="mt-px flex-none text-danger" />
              <span>{errorCount === 1 ? "Please fix 1 field below to get your quote." : `Please fix ${errorCount} fields below to get your quote.`}</span>
            </div>
          )}

          {status === "failed" && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger bg-danger-tint px-3.5 py-3 text-sm leading-5 text-danger-ink">
              <AlertTriangleIcon size={18} className="mt-px flex-none text-danger" />
              <span>
                <strong className="block">We could not send your request.</strong>
                Check your connection and try again. Your answers are saved. You can also email{" "}
                <a href={`mailto:${site.email}?subject=Quote%20request`} className="font-medium text-danger-ink">{site.email}</a>.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="qf-name" className="text-sm leading-5 font-medium">Full name</label>
            <input
              ref={nameRef}
              id="qf-name"
              type="text"
              autoComplete="name"
              aria-required="true"
              aria-invalid={showFieldError("name")}
              aria-describedby={showFieldError("name") ? "qf-name-err" : undefined}
              disabled={sending}
              value={name}
              onChange={(event) => { setName(event.target.value); clearServerError("name"); }}
              onBlur={() => setTouched((value) => ({ ...value, name: true }))}
              placeholder="Ada Okafor"
              className={inputClass(showFieldError("name"))}
            />
            {showFieldError("name") && <FieldError id="qf-name-err">{nameError}</FieldError>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="qf-email" className="text-sm leading-5 font-medium">Work email</label>
            <input
              ref={emailRef}
              id="qf-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-required="true"
              aria-invalid={showFieldError("email")}
              aria-describedby={showFieldError("email") ? "qf-email-err" : undefined}
              disabled={sending}
              value={email}
              onChange={(event) => { setEmail(event.target.value); clearServerError("email"); }}
              onBlur={() => setTouched((value) => ({ ...value, email: true }))}
              placeholder="ada@company.com"
              className={inputClass(showFieldError("email"))}
            />
            {showFieldError("email") && <FieldError id="qf-email-err">{emailError}</FieldError>}
            {!emailError && touched.email && (
              <span className="flex items-center gap-1.5 text-[13px] leading-[18px] text-success">
                <CheckIcon size={16} strokeWidth={2.5} />
                We will send your quote here
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="qf-phone" className="text-sm leading-5 font-medium">
                Phone or WhatsApp <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                ref={phoneRef}
                id="qf-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={showFieldError("phone")}
                aria-describedby={showFieldError("phone") ? "qf-phone-err" : undefined}
                disabled={sending}
                value={phone}
                onChange={(event) => { setPhone(event.target.value); clearServerError("phone"); }}
                onBlur={() => setTouched((value) => ({ ...value, phone: true }))}
                placeholder="+234"
                className={inputClass(showFieldError("phone"))}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="qf-company" className="text-sm leading-5 font-medium">
                Company <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="qf-company" type="text" autoComplete="organization" disabled={sending} value={company} onChange={(event) => setCompany(event.target.value)} className={inputClass(false)} />
            </div>
          </div>
          {showFieldError("phone") && <FieldError id="qf-phone-err">{phoneError}</FieldError>}

          {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} resetKey={turnstileReset} />}
          {serverErrors.form && !sending && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger bg-danger-tint px-3.5 py-3 text-sm leading-5 text-danger-ink">
              <AlertTriangleIcon size={18} className="mt-px flex-none text-danger" />
              <span>{serverErrors.form}</span>
            </div>
          )}

          <p className="m-0 text-xs leading-[18px] text-muted">
            We only use these details to reply about your project and never sell them. See our{" "}
            <Link href="/privacy" className="text-link">privacy policy</Link>.
          </p>
        </fieldset>
      )}

      {status === "done" && (
        <div role="status" className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex size-14 flex-none items-center justify-center rounded-full bg-salsify text-midnight">
              <CheckIcon size={28} strokeWidth={2.5} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-xs leading-4 font-medium tracking-[0.35em] text-success">REQUEST RECEIVED</span>
              <span className="text-[13px] leading-[18px] text-muted">Reference <strong className="text-midnight">{reference}</strong></span>
            </span>
          </div>
          <h3 ref={successRef} tabIndex={-1} className="m-0 font-display text-2xl leading-[30px] font-bold outline-none">
            Thanks, {firstName}. Your quote is on its way.
          </h3>
          <p className="m-0 text-muted">
            We have emailed a confirmation to <strong className="text-midnight">{email.trim()}</strong>. Your personalised proposal will follow within 24 hours.
          </p>
          <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <strong className="text-sm leading-5">What happens next</strong>
            <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm leading-5">
              {[
                { when: "Today", what: "Our team reviews your brief.", color: "bg-river" },
                { when: "Within 24 hours", what: "You receive a tailored proposal and estimate.", color: "bg-salsify" },
                { when: "Next", what: "A free call to agree scope and timeline.", color: "bg-gold" },
              ].map((item) => (
                <li key={item.when} className="flex gap-3">
                  <span className={cx("w-1 flex-none rounded-full", item.color)} />
                  <span>
                    <strong className="block">{item.when}</strong>
                    <span className="text-muted">{item.what}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-surface p-4 text-sm leading-5">
            <dt className="text-muted">Project</dt><dd className="m-0 font-medium">{typeLabel}</dd>
            <dt className="text-muted">Budget</dt><dd className="m-0 font-medium">{budgetSummary}</dd>
            <dt className="text-muted">Launch</dt><dd className="m-0 font-medium">{timeline || "—"}</dd>
            <dt className="text-muted">Features</dt><dd className="m-0 font-medium">{chosenFeatures.length ? chosenFeatures.join(", ") : "To discuss"}</dd>
          </dl>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/#work" className="inline-flex min-h-11 items-center rounded-lg bg-midnight px-[18px] font-medium text-white no-underline hover:bg-midnight-hover">
              See our recent work
            </Link>
            <button type="button" onClick={reset} className="min-h-11 cursor-pointer rounded-lg border border-control bg-white px-4 font-medium text-midnight hover:bg-surface">
              Start a new request
            </button>
          </div>
        </div>
      )}

      {status !== "done" && (
        <div className="flex gap-2.5">
          {step > 1 && (
            <button
              type="button"
              disabled={sending}
              onClick={() => { setStatus((value) => (value === "failed" ? "idle" : value)); goTo(step - 1); }}
              className="min-h-12 cursor-pointer rounded-lg border border-control bg-white px-[18px] font-medium text-midnight hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={sending || (step === 4 && !!TURNSTILE_SITE_KEY && !turnstileToken)}
            aria-busy={sending}
            className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-midnight px-[18px] text-base font-medium text-white hover:bg-midnight-hover disabled:cursor-progress disabled:opacity-85"
          >
            {sending && <span aria-hidden="true" className="size-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white" />}
            {primaryLabel}
            {!sending && <ArrowRightIcon size={18} />}
          </button>
        </div>
      )}

      <ul className="m-0 flex list-none flex-wrap justify-between gap-x-3 gap-y-2 border-t border-line p-0 pt-4 text-xs leading-4 text-muted">
        <li className="inline-flex items-center gap-1.5"><ShieldIcon size={16} className="text-success" />Free, no obligation</li>
        <li className="inline-flex items-center gap-1.5"><ClockIcon size={16} className="text-success" />Reply within 24 hours</li>
        <li className="inline-flex items-center gap-1.5"><LockIcon size={16} className="text-success" />Details kept private</li>
      </ul>
    </form>
  );
}
