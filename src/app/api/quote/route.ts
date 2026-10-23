import { randomInt } from "node:crypto";
import { after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { validateQuoteRequest, type QuoteResponse } from "@/lib/quote";
import { db } from "@/lib/server/db";
import { sendQuoteConfirmation } from "@/lib/server/client-emails";
import { notifyTeam } from "@/lib/server/mailer";
import { notifyAdminsPush } from "@/lib/server/push";
import { getSettings } from "@/lib/server/settings";
import { verifyTurnstile } from "@/lib/server/turnstile";

const MAX_BODY_BYTES = 16_000;

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ ok: false, errors: { form: "Your request is too large." } } satisfies QuoteResponse, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Body must be an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, errors: { form: "We could not read your request." } } satisfies QuoteResponse, { status: 400 });
  }

  // Spam trap: bots fill the hidden "website" field. Pretend it worked and drop it.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ ok: true, reference: `LDZ-${randomInt(100000, 1000000)}` } satisfies QuoteResponse);
  }

  const { errors, data } = validateQuoteRequest(body);
  if (!data) {
    return Response.json({ ok: false, errors } satisfies QuoteResponse, { status: 422 });
  }

  const human = await verifyTurnstile(body.turnstileToken, request);
  if (!human.ok) {
    const form = human.reason === "unavailable" ? "We couldn’t run the security check just now. Please try again in a minute." : "Please complete the security check and try again.";
    return Response.json({ ok: false, errors: { form, turnstile: human.reason } } satisfies QuoteResponse, { status: human.reason === "unavailable" ? 503 : 403 });
  }

  try {
    const quote = await createQuote(data, request.headers.get("referer"));
    const settings = await getSettings();
    if (settings.sendQuoteConfirmation) {
      await sendQuoteConfirmation(quote.id).catch((cause: unknown) => console.error("Quote confirmation email failed", cause));
    }
    const adminUrl = new URL(`/zeus/quotes/${quote.id}`, request.url).toString();
    const from = `${data.name}${data.company ? ` (${data.company})` : ""}`;
    // Team alerts go out after the visitor has their reference, so a slow provider never holds up the form.
    after(() =>
      Promise.all([
        notifyTeam(
          settings.quoteNotifyEmails,
          `New quote request ${quote.reference} from ${from}`,
          [
            `${data.name} <${data.email}>${data.phone ? ` · ${data.phone}` : ""} asked for a quote.`,
            `Type: ${data.type}\nBudget: ${data.budget} (${data.currency})\nLaunch: ${data.timeline}${data.features.length ? `\nFeatures: ${data.features.join(", ")}` : ""}`,
            data.details ? `Details:\n${data.details}` : "",
            `Reply here: ${adminUrl}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        ).catch((cause: unknown) => console.error("Team quote notification failed", cause)),
        notifyAdminsPush({ title: `New quote request from ${from}`, body: `${data.type} · ${data.budget} (${data.currency}) · ${quote.reference}`, url: adminUrl }).catch((cause: unknown) =>
          console.error("Team quote push failed", cause),
        ),
      ]),
    );
    return Response.json({ ok: true, reference: quote.reference } satisfies QuoteResponse, { status: 201 });
  } catch (cause) {
    console.error("Saving quote request failed", cause);
    return Response.json({ ok: false, errors: { form: "We couldn’t save your request right now." } } satisfies QuoteResponse, { status: 503 });
  }
}

async function createQuote(data: NonNullable<ReturnType<typeof validateQuoteRequest>["data"]>, referer: string | null) {
  let sourcePath: string | null = null;
  try {
    sourcePath = referer ? new URL(referer).pathname : null;
  } catch {
    sourcePath = null;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db().quoteRequest.create({
        data: {
          reference: `LDZ-${randomInt(100000, 1000000)}`,
          projectType: data.type,
          currency: data.currency,
          budget: data.budget,
          timeline: data.timeline,
          features: data.features,
          details: data.details || null,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          company: data.company || null,
          sourcePath,
        },
        select: { id: true, reference: true },
      });
    } catch (cause) {
      const duplicateReference = cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002";
      if (!duplicateReference) {
        throw cause;
      }
    }
  }
  throw new Error("Could not generate a unique quote reference");
}
