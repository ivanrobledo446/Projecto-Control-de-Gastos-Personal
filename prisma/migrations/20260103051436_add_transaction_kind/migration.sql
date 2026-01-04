-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "kind" "CategoryKind" NOT NULL DEFAULT 'EXPENSE';

-- CreateIndex
CREATE INDEX "Transaction_kind_idx" ON "Transaction"("kind");

-- CreateIndex
CREATE INDEX "Transaction_kind_date_idx" ON "Transaction"("kind", "date");
