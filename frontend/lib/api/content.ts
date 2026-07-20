import { authFetch } from './client';
import { API_BASE } from './base';


/**
 * Build-time safety: server-side fetches get a hard timeout so a slow or
 * unreachable API fails fast (and the caller's fallback kicks in) instead of
 * hanging Next.js static generation until its 60s export budget expires.
 */
const SERVER_FETCH_TIMEOUT_MS = 6000;
function withTimeout(init?: RequestInit): RequestInit {
  return { ...init, signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS) };
}

// ─────────────────────────── types ───────────────────────────

export type ContentType = 'GUIDE' | 'NEWS' | 'JUDGMENT' | 'NOTIFICATION' | 'FAQ';
export type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type ReviewState =
  | 'PENDING_LEGAL_REVIEW'
  | 'IN_LEGAL_REVIEW'
  | 'LEGALLY_REVIEWED';

export interface ContentFAQ {
  q: string;
  a: string;
}

export interface PublicReviewer {
  name: string;
  designation: string | null;
  barCouncilNumber?: string | null;
  practiceAreas?: string[];
  photoUrl?: string | null;
}

// Public projection returned by GET /content and /content/slug/:slug.
export interface PublicContent {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  sections: Record<string, unknown> | null;
  faqs: ContentFAQ[] | null;
  seoTitle: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  featuredImageUrl?: string;
  jsonLd?: Record<string, unknown>;
  categorySlug: string | null;
  tags: string[];
  practiceAreas: string[];
  states: string[];
  relatedDocumentIds: string[];
  relatedLawyerIds: string[];
  authorName: string;
  readMinutes?: number;
  publishedAt: string | null;
  updatedAt: string;
  reviewState: ReviewState;
  reviewer: PublicReviewer;
}

export interface ContentCategory {
  id: string;
  type: ContentType;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface PublicContentList {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  items: PublicContent[];
}

export type ContentBucket =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface ContentDashboard {
  buckets: {
    drafts: number;
    inReview: number;
    scheduled: number;
    published: number;
    archived: number;
  };
  total: number;
  byType: { type: ContentType; count: number }[];
}

export interface AdminContentRow {
  id: string;
  type: ContentType;
  status: ContentStatus;
  slug: string;
  title: string;
  categorySlug: string | null;
  reviewState: ReviewState;
  reviewer: { id: string; name: string } | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface Reviewer {
  id: string;
  name: string;
  designation: string | null;
  barCouncilNumber: string | null;
  practiceAreas: string[];
  biography: string | null;
  photoUrl: string | null;
  lawyerId: string | null;
  active: boolean;
}

export interface ContentRevision {
  id: string;
  contentId: string;
  editorId: string | null;
  note: string | null;
  createdAt: string;
  snapshot: Record<string, unknown>;
}

// ─────────────── public (server-component friendly) ───────────────
// Plain fetch (no auth); short revalidate so edits surface without a redeploy.

// NOTE: a `type` alias (not an interface) so it gets an implicit index
// signature and is assignable to the Record param of qs().
export type PublicQuery = {
  type?: ContentType;
  category?: string;
  tag?: string;
  state?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function fetchPublicContent(
  query: PublicQuery = {},
  revalidate = 300,
): Promise<PublicContentList> {
  const res = await fetch(`${API_BASE}/content${qs(query)}`, withTimeout({
    next: { revalidate },
  }));
  if (!res.ok) throw new Error(`content list failed: ${res.status}`);
  return res.json() as Promise<PublicContentList>;
}

export async function fetchPublicContentBySlug(
  slug: string,
  revalidate = 300,
): Promise<PublicContent | null> {
  const res = await fetch(`${API_BASE}/content/slug/${encodeURIComponent(slug)}`, withTimeout({
    next: { revalidate },
  }));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
  return res.json() as Promise<PublicContent>;
}

export async function fetchContentCategories(
  type?: ContentType,
  revalidate = 3600,
): Promise<ContentCategory[]> {
  const res = await fetch(`${API_BASE}/content/categories${qs({ type })}`, withTimeout({
    next: { revalidate },
  }));
  if (!res.ok) throw new Error(`categories failed: ${res.status}`);
  return res.json() as Promise<ContentCategory[]>;
}

// ─────────────── admin (client components, bearer token) ───────────────

export function adminContentDashboard(type?: ContentType) {
  return authFetch<ContentDashboard>(`/content/admin/dashboard${qs({ type })}`);
}

export function adminListContent(params: {
  type?: ContentType;
  status?: ContentStatus;
  bucket?: ContentBucket;
  category?: string;
  q?: string;
  page?: number;
} = {}) {
  return authFetch<{
    total: number;
    page: number;
    pages: number;
    items: AdminContentRow[];
  }>(`/content/admin${qs(params)}`);
}

export function adminGetContent(id: string) {
  return authFetch<PublicContent & { status: ContentStatus; reviewerId: string | null }>(
    `/content/admin/${id}`,
  );
}

export function adminCreateContent(body: Record<string, unknown>) {
  return authFetch<{ id: string }>(`/content/admin`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function adminUpdateContent(id: string, body: Record<string, unknown>) {
  return authFetch<{ id: string }>(`/content/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function adminSetContentStatus(
  id: string,
  status: ContentStatus,
  publishedAt?: string,
) {
  return authFetch<{ id: string; status: ContentStatus }>(
    `/content/admin/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status, publishedAt }) },
  );
}

export function adminContentRevisions(id: string) {
  return authFetch<ContentRevision[]>(`/content/admin/${id}/revisions`);
}

export function adminListReviewers() {
  return authFetch<Reviewer[]>(`/content/admin/reviewers`);
}

export function adminCreateReviewer(body: Record<string, unknown>) {
  return authFetch<Reviewer>(`/content/admin/reviewers`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function adminUpdateReviewer(id: string, body: Record<string, unknown>) {
  return authFetch<Reviewer>(`/content/admin/reviewers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function adminListContentCategories(type?: ContentType) {
  return authFetch<ContentCategory[]>(`/content/admin/categories${qs({ type })}`);
}

export function adminUpsertContentCategory(body: Record<string, unknown>) {
  return authFetch<ContentCategory>(`/content/admin/categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  GUIDE: 'Legal Guide',
  NEWS: 'Legal News',
  JUDGMENT: 'Judgment Summary',
  NOTIFICATION: 'Govt Notification',
  FAQ: 'FAQ',
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};
