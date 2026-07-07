import { authFetch } from './client';
import type { PlanName } from '@/types/subscription';

// ---- Lawyer approvals ----
export interface PendingLawyer {
  id: string;
  fullName: string;
  barCouncilNumber: string;
  barCouncilState: string;
  experienceYears: number;
  verificationStatus: string;
  createdAt: string;
}

export function fetchPendingLawyers() {
  return authFetch<PendingLawyer[]>('/lawyers/admin/pending');
}

export function reviewLawyer(id: string, status: 'APPROVED' | 'REJECTED', comments?: string) {
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

export function fetchReports(status?: ReportStatus) {
  return authFetch<AdminReport[]>(`/admin/reports${status ? `?status=${status}` : ''}`);
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
}

export function fetchPlanPrices() {
  return authFetch<PlanPrice[]>('/subscriptions/admin/plans');
}

export function setPlanPrice(planName: PlanName, amount: number, monthlyLeadCap?: number | null) {
  return authFetch(`/subscriptions/admin/plans/${planName}`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, monthlyLeadCap }),
  });
}

// ---- Users ----
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export interface AdminUser {
  id: string;
  email: string;
  mobile: string;
  role: 'CLIENT' | 'LAWYER' | 'ADMIN';
  status: UserStatus;
  createdAt: string;
}

export function fetchUsers(role?: string, status?: string) {
  const qs = new URLSearchParams();
  if (role) qs.set('role', role);
  if (status) qs.set('status', status);
  const s = qs.toString();
  return authFetch<AdminUser[]>(`/admin/users${s ? `?${s}` : ''}`);
}

export function setUserStatus(id: string, status: UserStatus) {
  return authFetch(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
