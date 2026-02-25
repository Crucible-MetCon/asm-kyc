-- AlterTable
ALTER TABLE "miner_profiles" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "mine_site_location" VARCHAR(500),
ADD COLUMN     "mine_site_name" VARCHAR(200),
ADD COLUMN     "mining_license_number" VARCHAR(100),
ADD COLUMN     "nrc_number" VARCHAR(30),
ADD COLUMN     "profile_completed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "consent_versions" (
    "version" VARCHAR(20) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text_en" TEXT NOT NULL,
    "text_bem" TEXT NOT NULL,

    CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("version")
);
