-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'AGGREGATOR_USER';
ALTER TYPE "Role" ADD VALUE 'MELTER_USER';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "ai_confidence" VARCHAR(10),
ADD COLUMN     "ai_extracted" JSONB,
ADD COLUMN     "ai_raw_response" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "file_url" TEXT,
ADD COLUMN     "mime_type" VARCHAR(50),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "line_total" DECIMAL(15,2),
ADD COLUMN     "price_per_gram" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "currency" VARCHAR(3) DEFAULT 'ZMW',
ADD COLUMN     "payment_status" VARCHAR(30) DEFAULT 'NONE',
ADD COLUMN     "price_per_gram" DECIMAL(10,2),
ADD COLUMN     "total_price" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "record_photos" ADD COLUMN     "label" VARCHAR(50),
ADD COLUMN     "photo_url" TEXT,
ALTER COLUMN "photo_data" DROP NOT NULL;

-- AlterTable
ALTER TABLE "records" ADD COLUMN     "ai_estimated_purity" DECIMAL(5,2),
ADD COLUMN     "ai_estimated_weight" DECIMAL(10,3),
ADD COLUMN     "ai_estimation_raw" TEXT,
ADD COLUMN     "ai_purity_confidence" VARCHAR(10),
ADD COLUMN     "ai_weight_confidence" VARCHAR(10),
ADD COLUMN     "buyer_id" UUID,
ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "gps_latitude" DECIMAL(10,7),
ADD COLUMN     "gps_longitude" DECIMAL(10,7),
ADD COLUMN     "locality" VARCHAR(500),
ADD COLUMN     "mine_site_id" UUID,
ADD COLUMN     "record_number" VARCHAR(20),
ADD COLUMN     "scale_photo_data" TEXT,
ADD COLUMN     "scale_photo_mime" VARCHAR(50),
ADD COLUMN     "scale_photo_url" TEXT,
ADD COLUMN     "side_photo_url" TEXT,
ADD COLUMN     "top_photo_url" TEXT,
ADD COLUMN     "xrf_photo_data" TEXT,
ADD COLUMN     "xrf_photo_mime" VARCHAR(50),
ADD COLUMN     "xrf_photo_url" TEXT;

-- AlterTable
ALTER TABLE "sales_partners" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "yellowcard_txn_id" VARCHAR(200),
    "type" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "status" VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    "payment_method" VARCHAR(50),
    "fee_amount" DECIMAL(10,2),
    "fee_currency" VARCHAR(3),
    "recipient_id" UUID,
    "yellowcard_meta" JSONB,
    "webhook_received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mine_sites" (
    "id" UUID NOT NULL,
    "miner_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "gps_latitude" DECIMAL(10,7),
    "gps_longitude" DECIMAL(10,7),
    "mining_license_number" VARCHAR(200),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mine_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metal_purities" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "receipt_id" UUID,
    "element" VARCHAR(5) NOT NULL,
    "purity" DECIMAL(7,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "metal_purities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_receipts" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "received_by" UUID NOT NULL,
    "receipt_weight" DECIMAL(10,3),
    "scale_photo_data" TEXT,
    "scale_photo_mime" VARCHAR(50),
    "xrf_photo_data" TEXT,
    "xrf_photo_mime" VARCHAR(50),
    "scale_photo_url" TEXT,
    "xrf_photo_url" TEXT,
    "gps_latitude" DECIMAL(10,7),
    "gps_longitude" DECIMAL(10,7),
    "country" VARCHAR(100),
    "locality" VARCHAR(500),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_counters" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'singleton',
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "record_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_purchase_id_idx" ON "payments"("purchase_id");

-- CreateIndex
CREATE INDEX "payments_yellowcard_txn_id_idx" ON "payments"("yellowcard_txn_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "mine_sites_miner_id_idx" ON "mine_sites"("miner_id");

-- CreateIndex
CREATE INDEX "metal_purities_record_id_idx" ON "metal_purities"("record_id");

-- CreateIndex
CREATE INDEX "metal_purities_receipt_id_idx" ON "metal_purities"("receipt_id");

-- CreateIndex
CREATE INDEX "record_receipts_record_id_idx" ON "record_receipts"("record_id");

-- CreateIndex
CREATE INDEX "record_receipts_received_by_idx" ON "record_receipts"("received_by");

-- CreateIndex
CREATE UNIQUE INDEX "documents_user_id_doc_type_key" ON "documents"("user_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "records_record_number_key" ON "records"("record_number");

-- CreateIndex
CREATE INDEX "records_mine_site_id_idx" ON "records"("mine_site_id");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_mine_site_id_fkey" FOREIGN KEY ("mine_site_id") REFERENCES "mine_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mine_sites" ADD CONSTRAINT "mine_sites_miner_id_fkey" FOREIGN KEY ("miner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metal_purities" ADD CONSTRAINT "metal_purities_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metal_purities" ADD CONSTRAINT "metal_purities_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "record_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_receipts" ADD CONSTRAINT "record_receipts_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_receipts" ADD CONSTRAINT "record_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
