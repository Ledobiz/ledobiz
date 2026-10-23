import { timingSafeEqual } from "node:crypto";
import { runDailyEmails } from "@/lib/server/scheduled-emails";

/**
 * Daily scheduled emails. Vercel Cron calls this (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`; any other scheduler can do the same.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "CRON_SECRET is not set." }, { status: 503 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return Response.json({ ok: false, error: "Unauthorised." }, { status: 401 });
  }
  const summary = await runDailyEmails();
  return Response.json({ ok: true, ...summary });
}
