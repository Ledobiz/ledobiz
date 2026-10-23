"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { confirmPayment, recordBankTransferClaim, startOnlinePayment } from "@/lib/server/payments";

export type PayState = { error?: string; fieldErrors?: { email?: string; method?: string } };

const paySchema = z.object({
  method: z.enum(["PAYSTACK", "FLUTTERWAVE", "BANK_TRANSFER"], { error: "Choose how you’d like to pay." }),
  email: z.email("Enter the email address for your receipt.").trim().toLowerCase().max(254),
});

/** Sends the client to their chosen checkout, or records that they paid by bank transfer. */
export async function startPayment(token: string, _previous: PayState, formData: FormData): Promise<PayState> {
  const parsed = paySchema.safeParse({ method: formData.get("method"), email: formData.get("email") });
  if (!parsed.success) {
    const fieldErrors: PayState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "method";
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }
  const { method, email } = parsed.data;
  if (method === "BANK_TRANSFER") {
    const recorded = await recordBankTransferClaim(token, email);
    if (!recorded) {
      return { error: "This invoice can’t be paid any more. Please contact us." };
    }
    redirect(`/pay/${token}?transfer=sent`);
  }
  const result = await startOnlinePayment(token, method, email);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(result.url);
}

/** Re-checks a pending payment with the provider; the page polls this while waiting. */
export async function refreshPayment(reference: string): Promise<"SUCCESS" | "PENDING" | "FAILED"> {
  const { status } = await confirmPayment(reference.slice(0, 80));
  return status;
}
