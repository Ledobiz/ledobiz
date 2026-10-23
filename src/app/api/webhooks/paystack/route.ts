import { isValidPaystackSignature } from "@/lib/server/payment-providers";
import { confirmPayment } from "@/lib/server/payments";

/** Paystack webhook. Set the URL to https://<your-domain>/api/webhooks/paystack in the Paystack dashboard. */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  if (!isValidPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  const reference = event.data?.reference;
  if (reference && (event.event === "charge.success" || event.event === "charge.failed")) {
    await confirmPayment(reference);
  }
  return new Response(null, { status: 200 });
}
