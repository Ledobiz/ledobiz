import { currencyForCountry } from "@/lib/quote";

/**
 * The quote form's starting currency, from the visitor's country.
 * Vercel (x-vercel-ip-country) and Cloudflare (cf-ipcountry) add the country to every request;
 * without either, as in local development, it falls back to USD.
 */
export async function GET(request: Request): Promise<Response> {
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  return Response.json({ currency: currencyForCountry(country) }, { headers: { "Cache-Control": "private, no-store" } });
}
