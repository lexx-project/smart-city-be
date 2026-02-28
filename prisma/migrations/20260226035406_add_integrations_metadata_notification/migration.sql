-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "integration_config" JSONB,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "ticket_logs" ADD COLUMN     "notification_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notification_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "external_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "service_type" VARCHAR NOT NULL,
    "endpoint" VARCHAR NOT NULL,
    "http_method" VARCHAR NOT NULL DEFAULT 'POST',
    "auth_type" VARCHAR NOT NULL DEFAULT 'API_KEY',
    "credentials" JSONB,
    "request_schema" JSONB,
    "response_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "timeout" INTEGER NOT NULL DEFAULT 10000,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "external_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_integrations_agency_id_idx" ON "external_integrations"("agency_id");

-- CreateIndex
CREATE INDEX "external_integrations_service_type_idx" ON "external_integrations"("service_type");

-- CreateIndex
CREATE INDEX "external_integrations_is_active_idx" ON "external_integrations"("is_active");

-- AddForeignKey
ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
