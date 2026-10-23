"use client";

import { useActionState, useState } from "react";
import { type PayState, startPayment } from "@/app/pay/actions";
import { cx } from "@/components/admin/ui";

export type PayMethod = { id: "PAYSTACK" | "FLUTTERWAVE" | "BANK_TRANSFER"; label: string; hint: string; tag: string };

type Props = {
  token: string;
  amountLabel: string;
  invoiceNumber: string;
  methods: PayMethod[];
  defaultMethod: PayMethod["id"];
  defaultEmail: string;
  bankDetails: string | null;
};

const providerName = { PAYSTACK: "Paystack", FLUTTERWAVE: "Flutterwave" } as const;

export function PayForm({ token, amountLabel, invoiceNumber, methods, defaultMethod, defaultEmail, bankDetails }: Props) {
  const [method, setMethod] = useState<PayMethod["id"]>(methods.some((item) => item.id === defaultMethod) ? defaultMethod : methods[0].id);
  const [state, action, pending] = useActionState(startPayment.bind(null, token), {} as PayState);
  const isManual = method === "BANK_TRANSFER";

  return (
    <form action={action} className="flex flex-col gap-[18px]" noValidate>
      <div className="flex flex-col gap-0.5">
        <h2 id="pay-title" className="m-0 text-[15px] font-medium text-muted">Amount to pay</h2>
        <strong className="font-display text-[34px] leading-[42px]">{amountLabel}</strong>
      </div>

      {state.error && <div role="alert" className="rounded-lg bg-[#fdecec] px-3.5 py-3 text-sm leading-[21px] text-[#8e1c1c]">{state.error}</div>}

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 font-bold">How would you like to pay?</legend>
        {methods.map((item) => {
          const on = item.id === method;
          return (
            <label key={item.id} className={cx("flex cursor-pointer items-start gap-3 rounded-[10px] hover:border-midnight", on ? "border-2 border-midnight bg-tint px-[13px] py-[11px]" : "border border-control bg-white px-3.5 py-3")}>
              <input type="radio" name="method" value={item.id} checked={on} onChange={() => setMethod(item.id)} className="mt-0.5 size-[18px] accent-midnight" />
              <span className="flex flex-1 flex-col"><strong>{item.label}</strong><span className="text-[13px] leading-[18px] text-muted">{item.hint}</span></span>
              <span className="text-xs whitespace-nowrap text-muted">{item.tag}</span>
            </label>
          );
        })}
        {state.fieldErrors?.method && <span className="text-[13px] text-danger">{state.fieldErrors.method}</span>}
      </fieldset>

      {isManual && bankDetails && (
        <div className="flex flex-col gap-2.5 rounded-[10px] bg-surface px-4 py-3.5">
          <p className="m-0 text-sm leading-[21px] whitespace-pre-line">{bankDetails}</p>
          <span className="flex items-center gap-2 text-sm">
            <span className="text-muted">Reference</span>
            <strong>{invoiceNumber}</strong>
            <CopyButton text={invoiceNumber} />
          </span>
          <span className="text-[13px] text-muted">Transfers to our account take up to 1 working day to confirm.</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pay-email" className="text-sm font-medium">Send the receipt to</label>
        <input id="pay-email" name="email" type="email" autoComplete="email" required defaultValue={defaultEmail} aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby={state.fieldErrors?.email ? "pay-email-error" : undefined} className={cx("min-h-11 rounded-lg border px-3 text-[15px] text-midnight", state.fieldErrors?.email ? "border-danger" : "border-control")} />
        {state.fieldErrors?.email && <span id="pay-email-error" className="text-[13px] text-danger">{state.fieldErrors.email}</span>}
      </div>

      <button type="submit" disabled={pending} className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-midnight text-base font-bold text-white hover:bg-midnight-hover disabled:cursor-wait disabled:opacity-80">
        {pending && <span aria-hidden="true" className="size-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {pending ? (isManual ? "Saving…" : `Opening ${providerName[method as keyof typeof providerName]}…`) : isManual ? "I’ve sent the transfer" : `Pay ${amountLabel}`}
      </button>
      <span className="flex items-start gap-2 text-[13px] leading-[18px] text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a7f5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
        {isManual ? `Use ${invoiceNumber} as your transfer reference so we can match your payment.` : `You’ll finish in ${providerName[method as keyof typeof providerName]}’s secure checkout. Ledobiz never sees your card or bank details.`}
      </span>
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="min-h-7 cursor-pointer rounded-md border border-control bg-white px-2 text-xs hover:bg-surface"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
