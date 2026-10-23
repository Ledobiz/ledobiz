import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { renderInvoicePdf } from "@/lib/server/pdf/invoice-pdf";

/** Opens the exact PDF that is attached to invoice (or, with ?kind=receipt, receipt) emails. */
export async function GET(request: Request, { params }: RouteContext<"/zeus/finances/invoices/[id]/pdf">): Promise<Response> {
  await requireUser("finance");
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("kind") === "receipt" ? "receipt" : "invoice";
  const invoice = await db().invoice.findUnique({ where: { id }, select: { status: true } });
  if (!invoice || (kind === "receipt" && invoice.status !== "PAID")) {
    return new Response("Not found", { status: 404 });
  }
  const pdf = await renderInvoicePdf(id, kind);
  return new Response(new Uint8Array(pdf.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
