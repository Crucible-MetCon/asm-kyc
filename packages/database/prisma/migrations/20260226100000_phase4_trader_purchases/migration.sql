-- AlterTable
ALTER TABLE "records" ADD COLUMN     "purchased_at" TIMESTAMP(3),
ADD COLUMN     "purchased_by" UUID;

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "trader_id" UUID NOT NULL,
    "total_weight" DECIMAL(10,3) NOT NULL,
    "total_items" INTEGER NOT NULL,
    "notes" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "record_id" UUID NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_trader_id_idx" ON "purchases"("trader_id");

-- CreateIndex
CREATE INDEX "purchase_items_record_id_idx" ON "purchase_items"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_items_purchase_id_record_id_key" ON "purchase_items"("purchase_id", "record_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_trader_id_fkey" FOREIGN KEY ("trader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
