/*
  Warnings:

  - Made the column `receiptUrl` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "stripeChargeId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "receiptUrl" SET NOT NULL,
ALTER COLUMN "receiptUrl" DROP DEFAULT;
