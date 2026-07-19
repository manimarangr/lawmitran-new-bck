import { authFetch } from './client';
import type { PlanName } from '@/types/subscription';

import type { Paginated } from '@/types/pagination';

// ---- Lawyer approvals ----
export interface PendingLawyer {
  id: string;
  fullName: string;
  barCouncilNumber: string;
  barCouncilState: string;
  experienceYears: number;
  verificationStatus: string;
  subscriptionStatus?: string;
  createdAt: string;
}

export function fetchPendingLawyers(q?: string, page = 1, pageSize = 20) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  return authFetch<Paginated<PendingLawyer>>(`/lawyers/admin/pending?${qs}`);
}

export interface AdminLawyer {
  id: string;
  fullName: string;
  slug: string | null;
  barCouncilNumber: string;
  barCouncilState: string;
  experienceYears: number;
  verificationStatus: string;
  subscriptionStatus: string;
  certificateImageUrl: string;
  ratingAvg: string | null;
  ratingCount: number;
  createdAt: string;
  approvedAt: string | null;
  user: { email: string; mobile: string; status: string };
  city: { name: string } | null;
  practiceAreas: { practiceArea: { name: string } }[];
  // present on the single-lawyer admin endpoint
  profileImageUrl?: string | null;
  bio?: string | null;
  offices?: {
    id: string;
    label: string | null;
    addressLine: string | null;
    pincode: string | null;
    landmark: string | null;
    latitude: number | null;
    longitude: number | null;
    isPrimary: boolean;
    city: { name: string } | null;
  }[];
}

export type LawyerSort = 'newest' | 'name' | 'mobile' | 'status';

export function fetchAdminLawyers(
  status?: string,
  q?: string,
  sort: LawyerSort = 'newest',
  page = 1,
  pageSize = 10,
) {
  const qs = new URLSearchParams({ sort, page: String(page), pageSize: String(pageSize) });
  if (status) qs.set('status', status);
  if (q) qs.set('q', q);
  return authFetch<Paginated<AdminLawyer>>(`/lawyers/admin/lawyers?${qs}`);
}

export function fetchAdminLawyer(id: string) {
  return authFetch<AdminLawyer>(`/lawyers/admin/lawyers/${id}`);
}

export function reviewLawyer(id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', comments?: string) {
  return authFetch(`/lawyers/admin/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comments }),
  });
}

// ---- Reports / moderation ----
export type ReportStatus = 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
export interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; email: string; role: string };
  reportedUser: { id: string; email: string; role: string; status: string };
}

export function fetchReports(status?: ReportStatus, page = 1, pageSize = 20) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) qs.set('status', status);
  return authFetch<Paginated<AdminReport>>(`/admin/reports?${qs.toString()}`);
}

export function reviewReport(
  id: string,
  status: 'ACTIONED' | 'DISMISSED',
  adminNote?: string,
  suspendReportedUser?: boolean,
) {
  return authFetch(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, adminNote, suspendReportedUser }),
  });
}

// ---- Plans ----
export interface PlanPrice {
  planName: string;
  amount: string;
  monthlyLeadCap: number | null;
  maxServiceAreas: number | null;
}

export function fetchPlanPrices() {
  return authFetch<PlanPrice[]>('/subscriptions/admin/plans');
}

export function setPlanPrice(
  planName: PlanName,
  amount: number,
  monthlyLeadCap?: number | null,
  maxServiceAreas?: number | null,
) {
  return authFetch(`/subscriptions/admin/plans/${planName}`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, monthlyLeadCap, maxServiceAreas }),
  });
}

// ---- Plan duration tiers ----
export interface AdminPlanTier {
  id: string;
  planName: string;
  durationDays: number;
  label: string;
  amount: string;
  active: boolean;
  updatedAt: string;
}

export function fetchAllPlanTiers() {
  return authFetch<AdminPlanTier[]>('/subscriptions/admin/plans/tiers');
}

export function createPlanTier(
  planName: string,
  data: { durationDays: number; amount: number; label?: string; active?: boolean },
) {
  return authFetch<AdminPlanTier>(`/subscriptions/admin/plans/${planName}/tiers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePlanTier(
  planName: string,
  durationDays: number,
  data: { amount: number; label?: string; active?: boolean },
) {
  return authFetch<AdminPlanTier>(
    `/subscriptions/admin/plans/${planName}/tiers/${durationDays}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}

export function deletePlanTier(planName: string, durationDays: number) {
  return authFetch(`/subscriptions/admin/plans/${planName}/tiers/${durationDays}`, {
    method: 'DELETE',
  });
}

// ---- Offers (seasonal discounts) ----
export type OfferDiscountType = 'PERCENT' | 'FLAT';
export interface AdminOffer {
  id: string;
  name: string;
  description: string | null;
  discountType: OfferDiscountType;
  discountValue: string;
  planName: string | null;
  durationDays: number | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferInput {
  name: string;
  description?: string;
  discountType?: OfferDiscountType;
  discountValue: number;
  planName?: string;
  durationDays?: number;
  startsAt: string;
  endsAt: string;
  active?: boolean;
}

export function fetchOffers() {
  return authFetch<AdminOffer[]>('/subscriptions/admin/offers');
}

export function createOffer(data: OfferInput) {
  return authFetch<AdminOffer>('/subscriptions/admin/offers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOffer(id: string, data: Partial<OfferInput>) {
  return authFetch<AdminOffer>(`/subscriptions/admin/offers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteOffer(id: string) {
  return authFetch(`/subscriptions/admin/offers/${id}`, { method: 'DELETE' });
}

// ---- Practice areas ----
export interface AdminPracticeArea {
  id: string;
  name: string;
  slug: string;
  lawyerCount: number;
}

export function fetchAdminPracticeAreas() {
  return authFetch<AdminPracticeArea[]>('/lawyers/admin/practice-areas');
}

export function createPracticeArea(name: string) {
  return authFetch<AdminPracticeArea>('/lawyers/admin/practice-areas', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function renamePracticeArea(id: string, name: string) {
  return authFetch<AdminPracticeArea>(`/lawyers/admin/practice-areas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deletePracticeArea(id: string) {
  return authFetch(`/lawyers/admin/practice-areas/${id}`, { method: 'DELETE' });
}

// ---- Audit log ----
export interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { email: string } | null;
}

export function fetchAuditLogs(q?: string, page = 1, pageSize = 25) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) qs.set('q', q);
  return authFetch<Paginated<AuditEntry>>(`/admin/audit?${qs}`);
}

// ---- Overview ----
export interface AdminOverview {
  pendingLawyers: number;
  awaitingOnboarding: number;
  approvedLawyers: number;
  openQueries: number;
  openReports: number;
  failedPayments30d: number;
  activeSubscriptions: number;
  trialsEndingSoon: number;
  newLeads7d: number;
  revenueThisMonth: string | number;
  subscriptionRevenueThisMonth?: string | number;
  documentRevenueThisMonth?: string | number;
}

export function fetchAdminOverview() {
  return authFetch<AdminOverview>('/admin/overview');
}

// ---- Legal-question insights (docs/12) ----
export interface IntakeInsights {
  total: number;
  unmatchedCount: number;
  topics: { topicKey: string; count: number }[];
  recentUnmatched: { id: string; question: string; createdAt: string }[];
}

export function fetchIntakeInsights() {
  return authFetch<IntakeInsights>('/ai-intake/admin/insights');
}

// ---- Onboarding funnel ----
export interface OnboardingFunnel {
  signups: number;
  otpVerified: number;
  submitted: number;
  approved: number;
  subscribed: number;
}

export function fetchOnboardingFunnel() {
  return authFetch<OnboardingFunnel>('/admin/funnel');
}

export function nudgeAwaitingOnboarding() {
  return authFetch<{ nudged: number }>('/admin/funnel/nudge', { method: 'POST' });
}

// ---- Transactions ----
export type PaymentStatusT = 'CREATED' | 'PAID' | 'FAILED';
export interface AdminPayment {
  id: string;
  planName: string;
  amount: string;
  listAmount: string | null;
  offerName: string | null;
  durationDays: number;
  provider: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  status: PaymentStatusT;
  createdAt: string;
  updatedAt: string;
  lawyer: { id: string; fullName: string; user: { email: string; mobile: string } };
}

export function fetchAdminPayments(status?: string, q?: string, page = 1, pageSize = 20) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) qs.set('status', status);
  if (q) qs.set('q', q);
  return authFetch<Paginated<AdminPayment>>(`/subscriptions/admin/payments?${qs}`);
}

export interface InvoiceData {
  invoiceNo: string;
  date: string;
  seller: { name: string; gstin: string | null; address: string | null };
  buyer: { name: string; email: string; mobile: string; address: string | null; state: string };
  item: { description: string; offerName: string | null; listAmount: number | null };
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  provider: string;
  providerOrderId: string;
  providerPaymentId: string | null;
}

export function fetchInvoice(paymentId: string) {
  return authFetch<InvoiceData>(`/subscriptions/admin/payments/${paymentId}/invoice`);
}

export function markPaymentPaid(id: string, note?: string) {
  return authFetch<AdminPayment>(`/subscriptions/admin/payments/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// ---- Platform settings ----
export interface AdminSetting {
  key: string;
  label: string;
  type: 'text' | 'secret' | 'toggle' | 'select' | 'number';
  options?: string[];
  placeholder?: string;
  help?: string;
  value: string;
  isSet: boolean;
  overridden: boolean;
}

export interface AdminSettingGroup {
  id: string;
  title: string;
  description: string;
  settings: AdminSetting[];
}

export function fetchAdminSettings() {
  return authFetch<AdminSettingGroup[]>('/admin/settings');
}

export function saveAdminSettings(entries: { key: string; value: string }[]) {
  return authFetch<{ saved: number }>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ entries }),
  });
}

export function sendTestEmail() {
  return authFetch<{ sent: boolean; to: string }>('/admin/settings/test-email', {
    method: 'POST',
  });
}

// ---- Users ----
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export interface AdminUser {
  id: string;
  email: string;
  mobile: string;
  fullName: string | null;
  role: 'CLIENT' | 'LAWYER' | 'ADMIN';
  status: UserStatus;
  createdAt: string;
}

export interface AdminUserInput {
  fullName: string;
  email: string;
  mobile: string;
  role: 'CLIENT' | 'LAWYER' | 'ADMIN';
  adminRole?: 'SUPER' | 'OPS' | 'FINANCE';
}

/** Create a pre-verified client/lawyer; returns a one-time temp password. */
export function adminCreateUser(data: AdminUserInput) {
  return authFetch<{ user: AdminUser; tempPassword?: string }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateUser(
  id: string,
  data: Partial<Pick<AdminUserInput, 'fullName' | 'email' | 'mobile'>>,
) {
  return authFetch<AdminUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminResetUserPassword(id: string) {
  return authFetch<{ tempPassword: string }>(`/admin/users/${id}/reset-password`, {
    method: 'POST',
  });
}

export function adminDeleteUser(id: string) {
  return authFetch(`/admin/users/${id}`, { method: 'DELETE' });
}

/** DPDP: full personal-data export (returns a JSON bundle). */
export function adminExportUserData(id: string) {
  return authFetch<Record<string, unknown>>(`/admin/users/${id}/export`);
}

/** DPDP: anonymize PII on a soft-deleted account (SUPER only). */
export function adminEraseUser(id: string) {
  return authFetch<{ erased: boolean }>(`/admin/users/${id}/erase`, { method: 'POST' });
}

export function fetchUsers(
  role?: string,
  status?: string,
  q?: string,
  page = 1,
  pageSize = 20,
  sort: LawyerSort = 'newest',
) {
  const qs = new URLSearchParams();
  if (role) qs.set('role', role);
  if (status) qs.set('status', status);
  if (q) qs.set('q', q);
  qs.set('sort', sort);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  return authFetch<Paginated<AdminUser>>(`/admin/users?${qs}`);
}

export function setUserStatus(id: string, status: UserStatus) {
  return authFetch(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
