import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** The online checkouts clients can choose on the payment page. */
export type OnlineProvider = "PAYSTACK" | "FLUTTERWAVE";

export type CheckoutRequest = {
  reference: string;
  amount: number;
  currency: string;
  email: string;
  name: string;
  description: string;
  returnUrl: string;
  logoUrl: string;
};

/** What a provider says happened, normalised so both providers settle the same way. */
export type VerifiedTransaction = {
  status: "SUCCESS" | "PENDING" | "FAILED";
  reference: string;
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  channel: string | null;
  cardLast4: string | null;
  paidAt: Date | null;
  failureReason: string | null;
  /** True when the bank or card issuer declined, as opposed to the client closing the checkout. */
  declined: boolean;
};

export class ProviderError extends Error {}

// Currencies each provider can charge in; the business account must also have them enabled.
const currencies: Record<OnlineProvider, string[]> = {
  PAYSTACK: ["NGN", "GHS", "ZAR", "KES", "USD"],
  FLUTTERWAVE: ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD"],
};

export const providerNames: Record<OnlineProvider, string> = { PAYSTACK: "Paystack", FLUTTERWAVE: "Flutterwave" };

export function isProviderConfigured(provider: OnlineProvider): boolean {
  return Boolean(provider === "PAYSTACK" ? process.env.PAYSTACK_SECRET_KEY : process.env.FLUTTERWAVE_SECRET_KEY);
}

export function providerSupports(provider: OnlineProvider, currency: string): boolean {
  return currencies[provider].includes(currency);
}

async function callApi<T>(url: string, secret: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const response = await fetch(url, {
    method: init.method,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok || !json) {
    throw new ProviderError(json?.message ?? `The payment provider returned ${response.status}.`);
  }
  return json;
}

// ── Paystack ────────────────────────────────────────────────────────────────

const PAYSTACK_API = "https://api.paystack.co";

type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  gateway_response: string | null;
  authorization?: { last4?: string | null } | null;
};

/** Paystack takes amounts in the currency's subunit (kobo, pesewas, cents). */
async function paystackCheckout(request: CheckoutRequest): Promise<string> {
  const result = await callApi<{ status: boolean; data: { authorization_url: string } }>(`${PAYSTACK_API}/transaction/initialize`, process.env.PAYSTACK_SECRET_KEY!, {
    method: "POST",
    body: {
      email: request.email,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      reference: request.reference,
      callback_url: request.returnUrl,
      channels: ["card", "bank", "bank_transfer", "ussd", "mobile_money"],
      metadata: { invoice: request.description, cancel_action: request.returnUrl },
    },
  });
  return result.data.authorization_url;
}

function paystackToVerified(data: PaystackTransaction): VerifiedTransaction {
  const status = data.status === "success" ? "SUCCESS" : ["failed", "abandoned", "reversed"].includes(data.status) ? "FAILED" : "PENDING";
  return {
    status,
    reference: data.reference,
    amount: data.amount / 100,
    currency: data.currency,
    providerTransactionId: String(data.id),
    channel: data.channel,
    cardLast4: data.authorization?.last4 ?? null,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
    failureReason: status === "FAILED" ? (data.status === "abandoned" ? "The payment was cancelled before it was completed." : data.gateway_response ?? "The payment was declined.") : null,
    declined: data.status === "failed",
  };
}

async function paystackVerify(reference: string): Promise<VerifiedTransaction> {
  const result = await callApi<{ data: PaystackTransaction }>(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, process.env.PAYSTACK_SECRET_KEY!, { method: "GET" });
  return paystackToVerified(result.data);
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body, keyed with the secret key. */
export function isValidPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) {
    return false;
  }
  const expected = Buffer.from(createHmac("sha512", secret).update(rawBody).digest("hex"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── Flutterwave ─────────────────────────────────────────────────────────────

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

type FlutterwaveTransaction = {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
  payment_type: string | null;
  created_at: string | null;
  processor_response: string | null;
  card?: { last_4digits?: string | null } | null;
};

/** Flutterwave takes amounts in major units. */
async function flutterwaveCheckout(request: CheckoutRequest): Promise<string> {
  const result = await callApi<{ status: string; data: { link: string } }>(`${FLUTTERWAVE_API}/payments`, process.env.FLUTTERWAVE_SECRET_KEY!, {
    method: "POST",
    body: {
      tx_ref: request.reference,
      amount: Number(request.amount.toFixed(2)),
      currency: request.currency,
      redirect_url: request.returnUrl,
      customer: { email: request.email, name: request.name },
      customizations: { title: "Ledobiz Technologies", description: request.description, logo: request.logoUrl },
      configurations: { session_duration: 60, max_retry_attempt: 5 },
    },
  });
  return result.data.link;
}

function flutterwaveToVerified(data: FlutterwaveTransaction): VerifiedTransaction {
  const status = data.status === "successful" ? "SUCCESS" : data.status === "failed" || data.status === "cancelled" ? "FAILED" : "PENDING";
  return {
    status,
    reference: data.tx_ref,
    amount: Number(data.amount),
    currency: data.currency,
    providerTransactionId: String(data.id),
    channel: data.payment_type,
    cardLast4: data.card?.last_4digits ?? null,
    paidAt: status === "SUCCESS" ? (data.created_at ? new Date(data.created_at) : new Date()) : null,
    failureReason: status === "FAILED" ? (data.status === "cancelled" ? "The payment was cancelled before it was completed." : data.processor_response ?? "The payment was declined.") : null,
    declined: data.status === "failed",
  };
}

/** Looks the transaction up by our reference, so it works for redirects and webhooks alike. */
async function flutterwaveVerify(reference: string): Promise<VerifiedTransaction> {
  const result = await callApi<{ data: FlutterwaveTransaction }>(`${FLUTTERWAVE_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, process.env.FLUTTERWAVE_SECRET_KEY!, { method: "GET" });
  return flutterwaveToVerified(result.data);
}

/** Flutterwave sends the secret hash you set in its dashboard in the `verif-hash` header. */
export function isValidFlutterwaveHash(hash: string | null): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret || !hash) {
    return false;
  }
  const expected = Buffer.from(secret);
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── Shared ──────────────────────────────────────────────────────────────────

export function createCheckout(provider: OnlineProvider, request: CheckoutRequest): Promise<string> {
  return provider === "PAYSTACK" ? paystackCheckout(request) : flutterwaveCheckout(request);
}

export function verifyTransaction(provider: OnlineProvider, reference: string): Promise<VerifiedTransaction> {
  return provider === "PAYSTACK" ? paystackVerify(reference) : flutterwaveVerify(reference);
}
