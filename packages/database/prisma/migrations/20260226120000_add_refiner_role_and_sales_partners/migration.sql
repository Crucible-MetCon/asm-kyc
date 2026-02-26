-- AlterEnum: Add REFINER_USER to Role
ALTER TYPE "Role" ADD VALUE 'REFINER_USER';

-- CreateTable: sales_partners
CREATE TABLE "sales_partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "miner_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_partners_partner_id_idx" ON "sales_partners"("partner_id");

-- CreateIndex: unique constraint on miner_id + partner_id
CREATE UNIQUE INDEX "sales_partners_miner_id_partner_id_key" ON "sales_partners"("miner_id", "partner_id");

-- AddForeignKey
ALTER TABLE "sales_partners" ADD CONSTRAINT "sales_partners_miner_id_fkey" FOREIGN KEY ("miner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_partners" ADD CONSTRAINT "sales_partners_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
