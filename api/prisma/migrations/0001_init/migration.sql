-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'FINANCE_OFFICER', 'INVENTORY_OFFICER', 'HEAT_OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "StageKind" AS ENUM ('PURCHASE', 'INSPECTION', 'CRACK_REMOVAL', 'SPLITTING', 'GAS_HEAT', 'ELECTRIC_TREATMENT', 'CUTTING', 'POLISHING', 'CERTIFICATION', 'EXPORT_SALE');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StoneStatus" AS ENUM ('PURCHASED', 'INSPECTION', 'CRACK_REMOVAL', 'SPLITTING', 'SPLIT', 'HEAT_TREATMENT', 'ELECTRIC_TREATMENT', 'CUTTING', 'POLISHING', 'CERTIFICATION', 'READY_FOR_EXPORT', 'EXPORTED', 'SOLD_LOCALLY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StoneKind" AS ENUM ('ROUGH', 'GEUDA', 'SEMI_TREATED', 'CUT', 'FACETED');

-- CreateEnum
CREATE TYPE "ImageStage" AS ENUM ('PURCHASE', 'INSPECTION', 'BEFORE_HEAT', 'AFTER_HEAT', 'ELECTRIC_PROGRESS', 'BEFORE_CUT', 'AFTER_CUT', 'CERTIFICATION', 'EXPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "CostAllocation" AS ENUM ('BY_WEIGHT', 'MANUAL');

-- CreateEnum
CREATE TYPE "TreatmentType" AS ENUM ('GAS', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ElectricStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('PENDING', 'SENT_TO_LAB', 'ISSUED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('EXPORT', 'LOCAL');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('TREATMENT_FINISHED', 'ELECTRIC_DUE', 'CERTIFICATE_MISSING', 'EXPORT_PENDING', 'INVENTORY_ALERT', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT,
    "variety" TEXT,
    "colorHint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gem_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "nicNumber" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "country" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TreatmentType" NOT NULL,
    "maxTempC" INTEGER,
    "location" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "contact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_template_stages" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "kind" "StageKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workflow_template_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stone_stages" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "kind" "StageKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "linkedEntity" TEXT,
    "linkedEntityId" TEXT,

    CONSTRAINT "stone_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" TEXT,
    "gemTypeId" TEXT NOT NULL,
    "purchaseLocationId" TEXT,
    "sellerId" TEXT,
    "workflowTemplateId" TEXT,
    "createdById" TEXT,
    "splitEventId" TEXT,
    "status" "StoneStatus" NOT NULL DEFAULT 'PURCHASED',
    "stoneKind" "StoneKind" NOT NULL DEFAULT 'ROUGH',
    "weightCt" DECIMAL(10,3) NOT NULL,
    "shape" TEXT,
    "dimensions" TEXT,
    "color" TEXT,
    "clarity" TEXT,
    "origin" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseCost" DECIMAL(14,2) NOT NULL,
    "currentValue" DECIMAL(14,2),
    "salePrice" DECIMAL(14,2),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stone_events" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "stage" "StageKind",
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stone_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stone_images" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "stage" "ImageStage" NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "caption" TEXT,
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stone_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stone_documents" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stone_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_events" (
    "id" TEXT NOT NULL,
    "parentStoneId" TEXT NOT NULL,
    "allocation" "CostAllocation" NOT NULL,
    "parentCost" DECIMAL(14,2) NOT NULL,
    "childCount" INTEGER NOT NULL,
    "performedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_batches" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "type" "TreatmentType" NOT NULL DEFAULT 'GAS',
    "machineId" TEXT NOT NULL,
    "operatorId" TEXT,
    "startAt" TIMESTAMP(3),
    "expectedEndAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "temperatureC" INTEGER,
    "durationHours" INTEGER,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_batch_stones" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "result" TEXT,
    "weightBeforeCt" DECIMAL(10,3),
    "weightAfterCt" DECIMAL(10,3),

    CONSTRAINT "treatment_batch_stones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_images" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electric_treatments" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "plannedWeeks" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "estimatedFinish" TIMESTAMP(3),
    "completionPct" INTEGER NOT NULL DEFAULT 0,
    "status" "ElectricStatus" NOT NULL DEFAULT 'RUNNING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electric_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electric_progress_logs" (
    "id" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "completionPct" INTEGER NOT NULL,
    "colorImprovement" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electric_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_records" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "cuttingDate" TIMESTAMP(3) NOT NULL,
    "cutterName" TEXT NOT NULL,
    "weightBeforeCt" DECIMAL(10,3) NOT NULL,
    "weightAfterCt" DECIMAL(10,3) NOT NULL,
    "lossPct" DECIMAL(5,2) NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "cost" DECIMAL(14,2),
    "status" "CertificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stone_expenses" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stone_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_expenses" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_shipments" (
    "id" TEXT NOT NULL,
    "shipmentCode" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "exportDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "courier" TEXT,
    "trackingNumber" TEXT,
    "shippingCost" DECIMAL(14,2),
    "exportValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_items" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "salePrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "export_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_documents" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_records" (
    "id" TEXT NOT NULL,
    "stoneId" TEXT NOT NULL,
    "buyerId" TEXT,
    "channel" "SaleChannel" NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "salePrice" DECIMAL(14,2) NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "grossProfit" DECIMAL(14,2) NOT NULL,
    "netProfit" DECIMAL(14,2) NOT NULL,
    "profitPct" DECIMAL(8,2) NOT NULL,
    "roi" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gem_types_name_key" ON "gem_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_locations_name_key" ON "purchase_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "machines_name_key" ON "machines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "laboratories_name_key" ON "laboratories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_name_key" ON "workflow_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_code_key" ON "workflow_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_template_stages_templateId_kind_key" ON "workflow_template_stages"("templateId", "kind");

-- CreateIndex
CREATE INDEX "stone_stages_stoneId_sortOrder_idx" ON "stone_stages"("stoneId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "stone_stages_stoneId_kind_key" ON "stone_stages"("stoneId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "stones_code_key" ON "stones"("code");

-- CreateIndex
CREATE INDEX "stones_status_idx" ON "stones"("status");

-- CreateIndex
CREATE INDEX "stones_gemTypeId_idx" ON "stones"("gemTypeId");

-- CreateIndex
CREATE INDEX "stones_purchaseLocationId_idx" ON "stones"("purchaseLocationId");

-- CreateIndex
CREATE INDEX "stones_purchaseDate_idx" ON "stones"("purchaseDate");

-- CreateIndex
CREATE INDEX "stones_parentId_idx" ON "stones"("parentId");

-- CreateIndex
CREATE INDEX "stone_events_stoneId_createdAt_idx" ON "stone_events"("stoneId", "createdAt");

-- CreateIndex
CREATE INDEX "stone_images_stoneId_stage_idx" ON "stone_images"("stoneId", "stage");

-- CreateIndex
CREATE INDEX "stone_documents_stoneId_idx" ON "stone_documents"("stoneId");

-- CreateIndex
CREATE UNIQUE INDEX "split_events_parentStoneId_key" ON "split_events"("parentStoneId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_batches_batchCode_key" ON "treatment_batches"("batchCode");

-- CreateIndex
CREATE INDEX "treatment_batches_status_idx" ON "treatment_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_batch_stones_batchId_stoneId_key" ON "treatment_batch_stones"("batchId", "stoneId");

-- CreateIndex
CREATE UNIQUE INDEX "electric_treatments_stoneId_key" ON "electric_treatments"("stoneId");

-- CreateIndex
CREATE UNIQUE INDEX "electric_progress_logs_treatmentId_weekNumber_key" ON "electric_progress_logs"("treatmentId", "weekNumber");

-- CreateIndex
CREATE INDEX "cutting_records_stoneId_idx" ON "cutting_records"("stoneId");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_certificateNumber_key" ON "certifications"("certificateNumber");

-- CreateIndex
CREATE INDEX "certifications_stoneId_idx" ON "certifications"("stoneId");

-- CreateIndex
CREATE INDEX "certifications_status_idx" ON "certifications"("status");

-- CreateIndex
CREATE INDEX "stone_expenses_stoneId_idx" ON "stone_expenses"("stoneId");

-- CreateIndex
CREATE INDEX "stone_expenses_categoryId_idx" ON "stone_expenses"("categoryId");

-- CreateIndex
CREATE INDEX "stone_expenses_incurredAt_idx" ON "stone_expenses"("incurredAt");

-- CreateIndex
CREATE INDEX "company_expenses_incurredAt_idx" ON "company_expenses"("incurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "export_shipments_shipmentCode_key" ON "export_shipments"("shipmentCode");

-- CreateIndex
CREATE INDEX "export_shipments_status_idx" ON "export_shipments"("status");

-- CreateIndex
CREATE INDEX "export_shipments_exportDate_idx" ON "export_shipments"("exportDate");

-- CreateIndex
CREATE UNIQUE INDEX "export_items_shipmentId_stoneId_key" ON "export_items"("shipmentId", "stoneId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_records_stoneId_key" ON "sale_records"("stoneId");

-- CreateIndex
CREATE INDEX "sale_records_saleDate_idx" ON "sale_records"("saleDate");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_template_stages" ADD CONSTRAINT "workflow_template_stages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_stages" ADD CONSTRAINT "stone_stages_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "stones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_splitEventId_fkey" FOREIGN KEY ("splitEventId") REFERENCES "split_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_gemTypeId_fkey" FOREIGN KEY ("gemTypeId") REFERENCES "gem_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_purchaseLocationId_fkey" FOREIGN KEY ("purchaseLocationId") REFERENCES "purchase_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stones" ADD CONSTRAINT "stones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_events" ADD CONSTRAINT "stone_events_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_events" ADD CONSTRAINT "stone_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_images" ADD CONSTRAINT "stone_images_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_documents" ADD CONSTRAINT "stone_documents_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_events" ADD CONSTRAINT "split_events_parentStoneId_fkey" FOREIGN KEY ("parentStoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_batches" ADD CONSTRAINT "treatment_batches_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_batches" ADD CONSTRAINT "treatment_batches_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_batch_stones" ADD CONSTRAINT "treatment_batch_stones_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "treatment_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_batch_stones" ADD CONSTRAINT "treatment_batch_stones_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_images" ADD CONSTRAINT "treatment_images_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "treatment_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electric_treatments" ADD CONSTRAINT "electric_treatments_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electric_progress_logs" ADD CONSTRAINT "electric_progress_logs_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "electric_treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_records" ADD CONSTRAINT "cutting_records_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_expenses" ADD CONSTRAINT "stone_expenses_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stone_expenses" ADD CONSTRAINT "stone_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_shipments" ADD CONSTRAINT "export_shipments_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_items" ADD CONSTRAINT "export_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "export_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_items" ADD CONSTRAINT "export_items_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_documents" ADD CONSTRAINT "export_documents_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "export_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_records" ADD CONSTRAINT "sale_records_stoneId_fkey" FOREIGN KEY ("stoneId") REFERENCES "stones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_records" ADD CONSTRAINT "sale_records_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

