import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// Keep string unions in sync with the Prisma enums. Using @IsIn (rather than
// importing the enum) avoids a hard compile dependency on the generated client
// in DTOs and mirrors the documents module convention.
export const CONTENT_TYPES = [
  'GUIDE',
  'NEWS',
  'JUDGMENT',
  'NOTIFICATION',
  'FAQ',
] as const;
export const CONTENT_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'ARCHIVED',
] as const;
// Dashboard buckets. SCHEDULED is derived (PUBLISHED with a future publishedAt),
// so it lives here rather than in the ContentStatus enum.
export const BUCKETS = [
  'DRAFT',
  'IN_REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export const REVIEW_STATES = [
  'PENDING_LEGAL_REVIEW',
  'IN_LEGAL_REVIEW',
  'LEGALLY_REVIEWED',
] as const;

// ---- public query ----
export class PublicContentQueryDto {
  @IsOptional()
  @IsIn(CONTENT_TYPES)
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

// ---- admin query ----
export class AdminContentQueryDto extends PublicContentQueryDto {
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(BUCKETS)
  bucket?: string;
}

// ---- create / update ----
export class ContentCreateDto {
  @IsIn(CONTENT_TYPES)
  type: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string; // auto-derived from title when omitted

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsObject()
  sections?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  faqs?: Array<{ q: string; a: string }>;

  // SEO
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(180) metaDescription?: string;
  @IsOptional() @IsString() @MaxLength(400) canonicalUrl?: string;
  @IsOptional() @IsString() @MaxLength(400) ogImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(400) featuredImageUrl?: string;
  @IsOptional() @IsObject() jsonLd?: Record<string, unknown>;

  // taxonomy & relations
  @IsOptional() @IsString() @MaxLength(80) categorySlug?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) practiceAreas?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) states?: string[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDocumentIds?: string[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedLawyerIds?: string[];

  // editorial / review
  @IsOptional() @IsString() @MaxLength(120) authorName?: string;
  @IsOptional() @IsString() reviewerId?: string;
  @IsOptional()
  @IsIn(REVIEW_STATES)
  reviewState?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) readMinutes?: number;
}

// PATCH — every field optional; type/slug editable too.
export class ContentUpdateDto {
  @IsOptional() @IsIn(CONTENT_TYPES) type?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(200) slug?: string;
  @IsOptional() @IsString() @MaxLength(300) excerpt?: string;
  @IsOptional() @IsString() bodyHtml?: string;
  @IsOptional() @IsObject() sections?: Record<string, unknown>;
  @IsOptional() @IsArray() faqs?: Array<{ q: string; a: string }>;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(180) metaDescription?: string;
  @IsOptional() @IsString() @MaxLength(400) canonicalUrl?: string;
  @IsOptional() @IsString() @MaxLength(400) ogImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(400) featuredImageUrl?: string;
  @IsOptional() @IsObject() jsonLd?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(80) categorySlug?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) practiceAreas?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) states?: string[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDocumentIds?: string[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedLawyerIds?: string[];
  @IsOptional() @IsString() @MaxLength(120) authorName?: string;
  @IsOptional() @IsString() reviewerId?: string;
  @IsOptional()
  @IsIn(REVIEW_STATES)
  reviewState?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) readMinutes?: number;
  @IsOptional() @IsString() @MaxLength(300) revisionNote?: string;
}

// Workflow transition. `publishedAt` (ISO) lets an admin schedule: set a future
// date with status PUBLISHED and the item stays hidden until then.
export class SetContentStatusDto {
  @IsIn(CONTENT_STATUSES)
  status: string;

  @IsOptional()
  @IsString()
  publishedAt?: string;
}

// ---- reviewer ----
export class ReviewerCreateDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(160) designation?: string;
  @IsOptional() @IsString() @MaxLength(60) barCouncilNumber?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) practiceAreas?: string[];
  @IsOptional() @IsString() @MaxLength(2000) biography?: string;
  @IsOptional() @IsString() @MaxLength(400) photoUrl?: string;
  @IsOptional() @IsString() lawyerId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ReviewerUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(160) designation?: string;
  @IsOptional() @IsString() @MaxLength(60) barCouncilNumber?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) practiceAreas?: string[];
  @IsOptional() @IsString() @MaxLength(2000) biography?: string;
  @IsOptional() @IsString() @MaxLength(400) photoUrl?: string;
  @IsOptional() @IsString() lawyerId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

// ---- category ----
export class ContentCategoryDto {
  @IsIn(CONTENT_TYPES) type: string;
  @IsString() @MinLength(2) @MaxLength(80) slug: string;
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(60) icon?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
