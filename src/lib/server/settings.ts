import "server-only";
import type { Settings } from "@/generated/prisma/client";
import { num } from "@/lib/admin/format";
import { db } from "@/lib/server/db";

/** Company settings, creating the default row on first use. */
export async function getSettings(): Promise<Settings> {
  const existing = await db().settings.findUnique({ where: { id: "default" } });
  if (existing) {
    return existing;
  }
  return db().settings.create({ data: { id: "default" } });
}

export type Rates = Record<string, number>;

export function readRates(settings: Settings): Rates {
  const raw = settings.exchangeRates;
  const rates: Rates = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [code, value] of Object.entries(raw)) {
      const rate = Number(value);
      if (Number.isFinite(rate) && rate > 0) {
        rates[code] = rate;
      }
    }
  }
  rates[settings.reportingCurrency] = 1;
  return rates;
}

/** Converts an amount to the reporting currency. Unknown currencies count as 1:1. */
export function toReporting(amount: Parameters<typeof num>[0], currency: string, rates: Rates): number {
  return num(amount) * (rates[currency] ?? 1);
}
