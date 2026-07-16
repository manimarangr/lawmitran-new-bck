-- CreateEnum
CREATE TYPE "ESignStatus" AS ENUM ('PENDING', 'SENT', 'AWAITING_SIGNATURE', 'SIGNED', 'REJECTED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EStampStatus" AS ENUM ('PENDING', 'SENT', 'PAID', 'STAMPED', 'REJECTED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocReviewStatus" AS ENUM ('NONE', 'REQUESTED', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "CustomerDocument" ADD COLUMN     "lawyerId" TEXT,
ADD COLUMN     "lawyerPayout" DECIMAL(10,2),
ADD COLUMN     "reviewFee" DECIMAL(10,2),
ADD COLUMN     "reviewOrderId" TEXT,
ADD COLUMN     "reviewPaymentId" TEXT,
ADD COLUMN     "reviewStatus" "DocReviewStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "ESignRequest" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ESignStatus" NOT NULL DEFAULT 'PENDING',
    "signerEmail" TEXT,
    "callbackPayload" JSONB,
    "signedDocumentUrl" TEXT,
    "auditLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ESignRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EStampRequest" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "EStampStatus" NOT NULL DEFAULT 'PENDING',
    "providerRequestId" TEXT,
    "certificateNumber" TEXT,
    "certificateUrl" TEXT,
    "callbackPayload" JSONB,
    "auditLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EStampRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReviewEvent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StampDutyRate" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "calcType" TEXT NOT NULL DEFAULT 'FLAT',
    "flatAmount" DECIMAL(10,2),
    "percent" DECIMAL(5,2),
    "minAmount" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StampDutyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ESignRequest_documentId_idx" ON "ESignRequest"("documentId");

-- CreateIndex
CREATE INDEX "ESignRequest_providerRequestId_idx" ON "ESignRequest"("providerRequestId");

-- CreateIndex
CREATE INDEX "ESignRequest_status_idx" ON "ESignRequest"("status");

-- CreateIndex
CREATE INDEX "EStampRequest_documentId_idx" ON "EStampRequest"("documentId");

-- CreateIndex
CREATE INDEX "EStampRequest_providerRequestId_idx" ON "EStampRequest"("providerRequestId");

-- CreateIndex
CREATE INDEX "EStampRequest_status_idx" ON "EStampRequest"("status");

-- CreateIndex
CREATE INDEX "DocumentReviewEvent_documentId_createdAt_idx" ON "DocumentReviewEvent"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StampDutyRate_state_documentType_key" ON "StampDutyRate"("state", "documentType");

-- CreateIndex
CREATE INDEX "CustomerDocument_reviewStatus_idx" ON "CustomerDocument"("reviewStatus");

-- AddForeignKey
ALTER TABLE "DocumentReviewEvent" ADD CONSTRAINT "DocumentReviewEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CustomerDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
