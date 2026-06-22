-- Subscription checkout via Chapa (payment reference on platform invoices)
ALTER TABLE "PlatformInvoice" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "PlatformInvoice" ADD COLUMN "billingInterval" TEXT;
ALTER TABLE "PlatformInvoice" ADD COLUMN "initiatedBy" TEXT;

CREATE UNIQUE INDEX "PlatformInvoice_paymentReference_key" ON "PlatformInvoice"("paymentReference");
