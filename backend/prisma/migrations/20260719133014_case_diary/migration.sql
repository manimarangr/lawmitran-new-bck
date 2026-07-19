-- CreateEnum
CREATE TYPE "DiaryCaseStatus" AS ENUM ('NEW', 'CONSULTATION', 'NOTICE_SENT', 'CASE_FILED', 'EVIDENCE', 'ARGUMENTS', 'JUDGMENT_RESERVED', 'DISPOSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiaryPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DiaryReminderType" AS ENUM ('HEARING', 'FOLLOW_UP', 'DOCUMENT', 'PAYMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DiaryDocCategory" AS ENUM ('PETITION', 'EVIDENCE', 'COURT_ORDER', 'IDENTITY', 'PHOTO', 'MISC');

-- CreateTable
CREATE TABLE "DiaryClient" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "leadId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryCase" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseNumber" TEXT,
    "courtName" TEXT,
    "courtHall" TEXT,
    "judgeName" TEXT,
    "practiceAreaSlug" TEXT,
    "caseType" TEXT,
    "oppositeParty" TEXT,
    "status" "DiaryCaseStatus" NOT NULL DEFAULT 'NEW',
    "stage" TEXT,
    "priority" "DiaryPriority" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "dateFiled" TIMESTAMP(3),
    "nextHearingAt" TIMESTAMP(3),
    "remarks" TEXT,
    "lawyerNotes" TEXT,
    "leadId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryHearing" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "courtNumber" TEXT,
    "judgeName" TEXT,
    "purpose" TEXT,
    "outcome" TEXT,
    "nextHearingAt" TIMESTAMP(3),
    "notes" TEXT,
    "orderCopyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryHearing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryReminder" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "caseId" TEXT,
    "type" "DiaryReminderType" NOT NULL DEFAULT 'CUSTOM',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" "DiaryDocCategory" NOT NULL DEFAULT 'MISC',
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryActivity" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "caseId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryClient_lawyerId_deletedAt_idx" ON "DiaryClient"("lawyerId", "deletedAt");

-- CreateIndex
CREATE INDEX "DiaryCase_lawyerId_status_deletedAt_idx" ON "DiaryCase"("lawyerId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "DiaryCase_lawyerId_nextHearingAt_idx" ON "DiaryCase"("lawyerId", "nextHearingAt");

-- CreateIndex
CREATE INDEX "DiaryHearing_caseId_date_idx" ON "DiaryHearing"("caseId", "date");

-- CreateIndex
CREATE INDEX "DiaryNote_caseId_pinned_idx" ON "DiaryNote"("caseId", "pinned");

-- CreateIndex
CREATE INDEX "DiaryReminder_lawyerId_done_dueAt_idx" ON "DiaryReminder"("lawyerId", "done", "dueAt");

-- CreateIndex
CREATE INDEX "DiaryDocument_caseId_category_idx" ON "DiaryDocument"("caseId", "category");

-- CreateIndex
CREATE INDEX "DiaryActivity_lawyerId_createdAt_idx" ON "DiaryActivity"("lawyerId", "createdAt");

-- AddForeignKey
ALTER TABLE "DiaryClient" ADD CONSTRAINT "DiaryClient_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "Lawyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryCase" ADD CONSTRAINT "DiaryCase_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "Lawyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryCase" ADD CONSTRAINT "DiaryCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "DiaryClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryHearing" ADD CONSTRAINT "DiaryHearing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DiaryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryNote" ADD CONSTRAINT "DiaryNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DiaryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryReminder" ADD CONSTRAINT "DiaryReminder_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "Lawyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryReminder" ADD CONSTRAINT "DiaryReminder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DiaryCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryDocument" ADD CONSTRAINT "DiaryDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DiaryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryActivity" ADD CONSTRAINT "DiaryActivity_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "Lawyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryActivity" ADD CONSTRAINT "DiaryActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "DiaryCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
