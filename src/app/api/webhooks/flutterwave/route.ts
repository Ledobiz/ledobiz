import { isValidFlutterwaveHash } from "@/lib/server/payment-providers";
import { confirmPayment } from "@/lib/server/payments";

/**
 * Flutterwave webhook. Set the URL to https://<your-domain>/api/webhooks/flutterwave and the secret
 * hash to FLUTTERWAVE_WEBHOOK_HASH in the Flutterwave dashboard.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isValidFlutterwaveHash(request.headers.get("verif-hash"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = (await request.json().catch(() => null)) as { event?: string; data?: { tx_ref?: string } } | null;
  const reference = event?.data?.tx_ref;
  if (reference && event?.event === "charge.completed") {
    await confirmPayment(reference);
  }
  return new Response(null, { status: 200 });
}
