-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stripeChargeId" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "receiptUrl" TEXT DEFAULT '';
