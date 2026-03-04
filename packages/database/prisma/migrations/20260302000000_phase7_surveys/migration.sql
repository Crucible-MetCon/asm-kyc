-- CreateTable
CREATE TABLE "survey_definitions" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "reward_amount" DECIMAL(10,2) NOT NULL,
    "reward_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" UUID NOT NULL,
    "survey_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "question_id" VARCHAR(50) NOT NULL,
    "answer" JSONB NOT NULL,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_rewards" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_definitions_slug_key" ON "survey_definitions"("slug");

-- CreateIndex
CREATE INDEX "survey_responses_user_id_idx" ON "survey_responses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_survey_id_user_id_key" ON "survey_responses"("survey_id", "user_id");

-- CreateIndex
CREATE INDEX "survey_answers_response_id_idx" ON "survey_answers"("response_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_rewards_response_id_key" ON "survey_rewards"("response_id");

-- CreateIndex
CREATE INDEX "survey_rewards_status_idx" ON "survey_rewards"("status");

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_rewards" ADD CONSTRAINT "survey_rewards_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
