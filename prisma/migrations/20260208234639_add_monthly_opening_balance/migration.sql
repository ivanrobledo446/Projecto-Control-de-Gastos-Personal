-- CreateTable
CREATE TABLE "MonthlyOpeningBalance" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyOpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyOpeningBalance_year_month_idx" ON "MonthlyOpeningBalance"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyOpeningBalance_year_month_key" ON "MonthlyOpeningBalance"("year", "month");
