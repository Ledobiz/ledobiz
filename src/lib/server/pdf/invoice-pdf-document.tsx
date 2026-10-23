import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { invoiceTotals } from "@/lib/admin/domain";
import { formatDate, money, num } from "@/lib/admin/format";

/**
 * The invoice and receipt PDF for email attachments, laid out like the on-screen A4 invoice.
 * It has no database access, so it can be previewed with sample data.
 * Brand fonts are subset copies in ./assets; they have no ₦ or ₵, so those amounts use the currency code.
 */

const assets = path.join(process.cwd(), "src/lib/server/pdf/assets");
let logo: Buffer | null = null;

/**
 * Loads fonts and the logo from disk on first use. They're passed as data rather than paths
 * because react-pdf mistakes Windows paths (C:\…) for web addresses.
 */
function loadAssets(): Buffer {
  if (logo) {
    return logo;
  }
  const font = (file: string) => `data:font/ttf;base64,${readFileSync(path.join(assets, file)).toString("base64")}`;
  Font.register({
    family: "Google Sans",
    fonts: [
      { src: font("GoogleSans-Regular.ttf"), fontWeight: 400 },
      { src: font("GoogleSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "Petrov Sans", src: font("PetrovSans-Bold.ttf"), fontWeight: 700 });
  Font.registerHyphenationCallback((word) => [word]);
  logo = readFileSync(path.join(assets, "logo.png"));
  return logo;
}

const colour = { midnight: "#000033", muted: "#4b5470", line: "#dde2ea", surface: "#f3f5f9", salsify: "#33cc99", success: "#145c41" };

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 72, paddingHorizontal: 52, fontFamily: "Google Sans", fontSize: 9.5, lineHeight: 1.45, color: colour.midnight },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  logo: { width: 118, height: 32, marginBottom: 10 },
  muted: { color: colour.muted },
  strong: { fontWeight: 700 },
  title: { fontFamily: "Petrov Sans", fontWeight: 700, fontSize: 24, lineHeight: 1.1, textAlign: "right" },
  number: { fontSize: 11, textAlign: "right", marginTop: 4 },
  badge: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, backgroundColor: colour.salsify, fontSize: 8.5, fontWeight: 700, letterSpacing: 1 },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 26 },
  label: { fontSize: 7.5, letterSpacing: 1, color: colour.muted, marginBottom: 4 },
  datesRow: { flexDirection: "row", justifyContent: "flex-end", gap: 14, marginBottom: 2 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: colour.midnight, paddingBottom: 6, fontSize: 7.5, letterSpacing: 1, color: colour.muted },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: colour.line, paddingVertical: 8 },
  colDescription: { flex: 1, paddingRight: 10 },
  colQty: { width: 40, textAlign: "right" },
  colRate: { width: 92, textAlign: "right" },
  colAmount: { width: 100, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 230, marginTop: 14 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderTopWidth: 1.5, borderTopColor: colour.midnight, marginTop: 5, paddingTop: 7 },
  grandValue: { fontFamily: "Petrov Sans", fontWeight: 700, fontSize: 15 },
  box: { marginTop: 24, padding: 12, borderRadius: 6, backgroundColor: colour.surface },
  footer: { position: "absolute", left: 52, right: 52, bottom: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.75, borderTopColor: colour.line, paddingTop: 8, fontSize: 8, color: colour.muted },
});

/** money() with the currencies our fonts can't draw written as codes. */
function pdfMoney(value: Parameters<typeof num>[0], currency: string): string {
  return money(value, currency, { decimals: true }).replace("GH₵", "GHS ").replace("₦", "NGN ");
}

export type PdfKind = "invoice" | "receipt";

type Amount = Parameters<typeof num>[0];

export type PdfData = {
  kind: PdfKind;
  docNumber: string;
  invoice: {
    number: string;
    status: string;
    currency: string;
    issueDate: Date;
    dueDate: Date;
    paidAt: Date | null;
    vatRate: Amount;
    discount: Amount;
    notes: string | null;
    paymentReference: string | null;
    items: { id: string; description: string; quantity: Amount; rate: Amount }[];
    client: { company: string; city: string | null; country: string | null };
    project: { name: string } | null;
  };
  contact: { name: string; email: string } | null;
  paidWith: string | null;
  company: { tradingName: string; legalName: string; address: string | null; email: string; phone: string | null; rcNumber: string | null; taxId: string | null; website: string; bankDetails: string | null };
};

export async function buildInvoicePdf({ kind, docNumber, invoice, contact, paidWith, company: settings }: PdfData): Promise<{ filename: string; content: Buffer }> {
  const totals = invoiceTotals(invoice.items, invoice.vatRate, invoice.discount);
  const cur = invoice.currency;
  const isReceipt = kind === "receipt";
  const site = settings.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const logoData = loadAssets();
  const document = (
    <Document title={`${isReceipt ? "Receipt" : "Invoice"} ${docNumber}`} author={settings.legalName} creator={settings.tradingName} producer={settings.tradingName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ maxWidth: 260 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
            <Image src={logoData} style={styles.logo} />
            <Text style={styles.strong}>{settings.legalName}</Text>
            {settings.address && <Text style={styles.muted}>{settings.address}</Text>}
            <Text style={styles.muted}>{[settings.email, settings.phone].filter(Boolean).join(" · ")}</Text>
            {(settings.rcNumber || settings.taxId) && <Text style={styles.muted}>{[settings.rcNumber && `RC ${settings.rcNumber}`, settings.taxId && `TIN ${settings.taxId}`].filter(Boolean).join(" · ")}</Text>}
          </View>
          <View>
            <Text style={styles.title}>{isReceipt ? "Receipt" : "Invoice"}</Text>
            <Text style={styles.number}>{docNumber}</Text>
            {isReceipt && <Text style={[styles.muted, { textAlign: "right" }]}>for invoice {invoice.number}</Text>}
            {(isReceipt || invoice.status === "PAID") && <Text style={styles.badge}>PAID</Text>}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={{ maxWidth: 250 }}>
            <Text style={styles.label}>{isReceipt ? "RECEIVED FROM" : "BILL TO"}</Text>
            <Text style={[styles.strong, { fontSize: 11 }]}>{invoice.client.company}</Text>
            {contact && <Text>{contact.name} · {contact.email}</Text>}
            {(invoice.client.city || invoice.client.country) && <Text style={styles.muted}>{[invoice.client.city, invoice.client.country].filter(Boolean).join(", ")}</Text>}
          </View>
          <View>
            {[
              ["Issued", formatDate(invoice.issueDate)],
              ...(isReceipt ? [] : [["Due", formatDate(invoice.dueDate)]]),
              ...(invoice.project ? [["Project", invoice.project.name]] : []),
              ...(invoice.paidAt ? [["Paid", formatDate(invoice.paidAt)]] : []),
              ...(isReceipt && paidWith ? [["Paid with", paidWith]] : []),
              ...(isReceipt && invoice.paymentReference ? [["Reference", invoice.paymentReference]] : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.datesRow}>
                <Text style={styles.muted}>{label}</Text>
                <Text style={[{ textAlign: "right", maxWidth: 190 }, label === "Due" ? styles.strong : {}]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tableHead} fixed>
          <Text style={styles.colDescription}>DESCRIPTION</Text>
          <Text style={styles.colQty}>QTY</Text>
          <Text style={styles.colRate}>RATE</Text>
          <Text style={styles.colAmount}>AMOUNT</Text>
        </View>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.row} wrap={false}>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colQty}>{num(item.quantity)}</Text>
            <Text style={styles.colRate}>{pdfMoney(item.rate, cur)}</Text>
            <Text style={styles.colAmount}>{pdfMoney(num(item.quantity) * num(item.rate), cur)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalLine}><Text style={styles.muted}>Subtotal</Text><Text>{pdfMoney(totals.subtotal, cur)}</Text></View>
          {totals.discount > 0 && <View style={styles.totalLine}><Text style={styles.muted}>Discount</Text><Text>−{pdfMoney(totals.discount, cur)}</Text></View>}
          <View style={styles.totalLine}><Text style={styles.muted}>VAT ({num(invoice.vatRate)}%)</Text><Text>{pdfMoney(totals.vat, cur)}</Text></View>
          <View style={styles.grandTotal}><Text style={styles.strong}>{isReceipt ? "Total paid" : "Total due"}</Text><Text style={styles.grandValue}>{pdfMoney(totals.total, cur)}</Text></View>
        </View>

        {!isReceipt && (invoice.notes || settings.bankDetails) && (
          <View style={styles.box} wrap={false}>
            <Text style={styles.label}>{invoice.notes ? "NOTES" : "HOW TO PAY"}</Text>
            <Text>{invoice.notes ?? settings.bankDetails}</Text>
          </View>
        )}
        {isReceipt && (
          <View style={[styles.box, { backgroundColor: "#e3f6ee" }]} wrap={false}>
            <Text style={{ color: colour.success }}>Thank you. We’ve received {pdfMoney(totals.total, cur)} for invoice {invoice.number}. Keep this receipt for your records.</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{isReceipt ? "Thank you for your payment." : `Please use ${invoice.number} as your payment reference.`}</Text>
          <Text>{site}</Text>
        </View>
      </Page>
    </Document>
  );

  return { filename: `${isReceipt ? "Receipt" : "Invoice"}-${docNumber}.pdf`, content: await renderToBuffer(document) };
}
