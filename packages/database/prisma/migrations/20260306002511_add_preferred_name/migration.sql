-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "miner_profiles" ADD COLUMN     "preferred_name" VARCHAR(100);
