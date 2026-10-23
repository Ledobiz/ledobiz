import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Cloudflare Turnstile: checks the token the quote form gets from the widget, so bots can't post quotes.
 * Without TURNSTILE_SECRET_KEY (local development) the check is skipped.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export type TurnstileResult = { ok: true } | { ok: false; reason: "missing" | "rejected" | "unavailable" };

export async function verifyTurnstile(token: unknown, request: Request): Promise<TurnstileResult> {
  if (!isTurnstileConfigured()) {
    return { ok: true };
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: "missing" };
  }
  const remoteip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const idempotencyKey = randomUUID();

  // One retry with the same key if Cloudflare is briefly unreachable; tokens are single-use, so the key keeps the retry safe.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip, idempotency_key: idempotencyKey }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      const json = (await response.json().catch(() => null)) as { success?: boolean; action?: string; "error-codes"?: string[] } | null;
      if (!json) {
        continue;
      }
      if (json.success && (!json.action || json.action === "quote")) {
        return { ok: true };
      }
      const codes = json["error-codes"] ?? [];
      // A wrong secret is our mistake, not the visitor's; log it loudly.
      if (codes.some((code) => code.includes("secret"))) {
        console.error("Turnstile rejected TURNSTILE_SECRET_KEY", codes);
        return { ok: false, reason: "unavailable" };
      }
      return { ok: false, reason: "rejected" };
    } catch (cause) {
      if (attempt === 1) {
        console.error("Turnstile verification failed", cause);
      }
    }
  }
  return { ok: false, reason: "unavailable" };
}
