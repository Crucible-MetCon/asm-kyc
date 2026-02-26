-- Phase 5: Admin Dashboard & Compliance Review

-- Add is_disabled flag to users
ALTER TABLE "users" ADD COLUMN "is_disabled" BOOLEAN NOT NULL DEFAULT false;

-- Add foreign key from compliance_reviews.reviewer_id to users.id
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for compliance_reviews
CREATE INDEX "compliance_reviews_record_id_idx" ON "compliance_reviews"("record_id");
CREATE INDEX "compliance_reviews_reviewer_id_idx" ON "compliance_reviews"("reviewer_id");
