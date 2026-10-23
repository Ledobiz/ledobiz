-- AlterTable
ALTER TABLE "Email" ADD COLUMN "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "attachInvoicePdf" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "attachReceiptPdf" BOOLEAN NOT NULL DEFAULT true;
