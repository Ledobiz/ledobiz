import { confirmPayment } from "@/lib/server/payments";

/**
 * Where Paystack and Flutterwave send the client back after checkout. We never trust the query
 * string's status: the payment is re-verified with the provider before the invoice is marked paid.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const reference = url.searchParams.get("ref") ?? url.searchParams.get("reference") ?? url.searchParams.get("tx_ref");
  if (!reference) {
    return Response.redirect(new URL("/", url), 303);
  }
  const { token } = await confirmPayment(reference);
  if (!token) {
    return Response.redirect(new URL("/", url), 303);
  }
  return Response.redirect(new URL(`/pay/${token}?payment=${encodeURIComponent(reference)}`, url), 303);
}
