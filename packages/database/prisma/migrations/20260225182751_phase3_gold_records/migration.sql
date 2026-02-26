/*
  Warnings:

  - You are about to drop the column `file_path` on the `record_photos` table. All the data in the column will be lost.
  - Added the required column `photo_data` to the `record_photos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GoldType" AS ENUM ('RAW_GOLD', 'BAR', 'LOT');

-- AlterTable
ALTER TABLE "record_photos" DROP COLUMN "file_path",
ADD COLUMN     "mime_type" VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
ADD COLUMN     "photo_data" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "records" ADD COLUMN     "estimated_purity" DECIMAL(5,2),
ADD COLUMN     "extraction_date" DATE,
ADD COLUMN     "gold_type" "GoldType",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "origin_mine_site" VARCHAR(500),
ADD COLUMN     "weight_grams" DECIMAL(10,3);

-- CreateIndex
CREATE INDEX "record_photos_record_id_idx" ON "record_photos"("record_id");

-- CreateIndex
CREATE INDEX "records_created_by_idx" ON "records"("created_by");

-- CreateIndex
CREATE INDEX "records_status_idx" ON "records"("status");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
