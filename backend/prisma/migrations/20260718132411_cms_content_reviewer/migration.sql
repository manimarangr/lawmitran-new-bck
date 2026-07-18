-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('GUIDE', 'NEWS', 'JUDGMENT', 'NOTIFICATION', 'FAQ');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentReviewState" AS ENUM ('PENDING_LEGAL_REVIEW', 'IN_LEGAL_REVIEW', 'LEGALLY_REVIEWED');

-- CreateTable
CREATE TABLE "Reviewer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "barCouncilNumber" TEXT,
    "practiceAreas" TEXT[],
    "biography" TEXT,
    "photoUrl" TEXT,
    "lawyerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCategory" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "sections" JSONB,
    "faqs" JSONB,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogImageUrl" TEXT,
    "featuredImageUrl" TEXT,
    "jsonLd" JSONB,
    "categorySlug" TEXT,
    "tags" TEXT[],
    "practiceAreas" TEXT[],
    "states" TEXT[],
    "relatedDocumentIds" TEXT[],
    "relatedLawyerIds" TEXT[],
    "authorName" TEXT DEFAULT 'LawMitran Legal Content Team',
    "reviewerId" TEXT,
    "reviewState" "ContentReviewState" NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "readMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "editorId" TEXT,
    "note" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reviewer_lawyerId_key" ON "Reviewer"("lawyerId");

-- CreateIndex
CREATE INDEX "Reviewer_active_idx" ON "Reviewer"("active");

-- CreateIndex
CREATE INDEX "ContentCategory_type_idx" ON "ContentCategory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCategory_type_slug_key" ON "ContentCategory"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_slug_key" ON "ContentItem"("slug");

-- CreateIndex
CREATE INDEX "ContentItem_type_status_idx" ON "ContentItem"("type", "status");

-- CreateIndex
CREATE INDEX "ContentItem_status_publishedAt_idx" ON "ContentItem"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ContentItem_type_categorySlug_idx" ON "ContentItem"("type", "categorySlug");

-- CreateIndex
CREATE INDEX "ContentRevision_contentId_createdAt_idx" ON "ContentRevision"("contentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Reviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
