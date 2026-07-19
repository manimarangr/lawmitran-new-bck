import { authFetch } from './client';

// ---- types ----

export type DiaryCaseStatus =
  | 'NEW' | 'CONSULTATION' | 'NOTICE_SENT' | 'CASE_FILED' | 'EVIDENCE'
  | 'ARGUMENTS' | 'JUDGMENT_RESERVED' | 'DISPOSED' | 'CLOSED' | 'ARCHIVED';
export type DiaryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DiaryReminderType = 'HEARING' | 'FOLLOW_UP' | 'DOCUMENT' | 'PAYMENT' | 'CUSTOM';

export const CASE_STATUS_LABELS: Record<DiaryCaseStatus, string> = {
  NEW: 'New', CONSULTATION: 'Consultation', NOTICE_SENT: 'Notice Sent',
  CASE_FILED: 'Case Filed', EVIDENCE: 'Evidence', ARGUMENTS: 'Arguments',
  JUDGMENT_RESERVED: 'Judgment Reserved', DISPOSED: 'Disposed',
  CLOSED: 'Closed', ARCHIVED: 'Archived',
};

export interface DiaryClient {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  leadId: string | null;
  _count?: { cases: number };
}

export interface DiaryHearing {
  id: string;
  date: string;
  courtNumber: string | null;
  judgeName: string | null;
  purpose: string | null;
  outcome: string | null;
  nextHearingAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DiaryActivity {
  id: string;
  action: string;
  summary: string;
  caseId: string | null;
  createdAt: string;
}

export interface DiaryCase {
  id: string;
  title: string;
  caseNumber: string | null;
  courtName: string | null;
  courtHall: string | null;
  judgeName: string | null;
  practiceAreaSlug: string | null;
  caseType: string | null;
  oppositeParty: string | null;
  status: DiaryCaseStatus;
  stage: string | null;
  priority: DiaryPriority;
  description: string | null;
  dateFiled: string | null;
  nextHearingAt: string | null;
  remarks: string | null;
  lawyerNotes: string | null;
  updatedAt: string;
  client: DiaryClient;
  hearings?: DiaryHearing[];
  activities?: DiaryActivity[];
}

export interface DiaryReminder {
  id: string;
  type: DiaryReminderType;
  dueAt: string;
  notes: string | null;
  done: boolean;
  case: { id: string; title: string } | null;
}

export interface DiaryDashboard {
  openCases: number;
  closedCases: number;
  todayHearings: { id: string; title: string; caseNumber: string | null; courtName: string | null; nextHearingAt: string }[];
  upcomingHearings: { id: string; title: string; caseNumber: string | null; courtName: string | null; nextHearingAt: string }[];
  dueReminders: DiaryReminder[];
  recentActivity: DiaryActivity[];
  recentCases: { id: string; title: string; status: DiaryCaseStatus; updatedAt: string }[];
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const out = p.toString();
  return out ? `?${out}` : '';
}

// ---- fetchers ----

export const fetchDiaryDashboard = () => authFetch<DiaryDashboard>('/diary/dashboard');

export const fetchDiaryClients = (q?: string) =>
  authFetch<DiaryClient[]>(`/diary/clients${qs({ q })}`);
export const createDiaryClient = (data: Partial<DiaryClient> & { name: string }) =>
  authFetch<DiaryClient>('/diary/clients', { method: 'POST', body: JSON.stringify(data) });

export const fetchDiaryCases = (params: {
  status?: DiaryCaseStatus; priority?: DiaryPriority; practiceArea?: string; q?: string; page?: number;
} = {}) =>
  authFetch<{ total: number; page: number; pages: number; items: DiaryCase[] }>(
    `/diary/cases${qs(params)}`,
  );
export const fetchDiaryCase = (id: string) => authFetch<DiaryCase>(`/diary/cases/${id}`);
export const createDiaryCase = (data: Record<string, unknown>) =>
  authFetch<DiaryCase>('/diary/cases', { method: 'POST', body: JSON.stringify(data) });
export const updateDiaryCase = (id: string, data: Record<string, unknown>) =>
  authFetch<DiaryCase>(`/diary/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteDiaryCase = (id: string) =>
  authFetch<{ success: boolean }>(`/diary/cases/${id}`, { method: 'DELETE' });
export const addDiaryHearing = (caseId: string, data: Record<string, unknown>) =>
  authFetch<DiaryHearing>(`/diary/cases/${caseId}/hearings`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const createDiaryCaseFromLead = (leadId: string) =>
  authFetch<DiaryCase>(`/diary/cases/from-lead/${leadId}`, { method: 'POST' });

export interface DiaryCalendar {
  month: string;
  hearings: { id: string; date: string; purpose: string | null; case: { id: string; title: string } }[];
  nextHearings: { id: string; title: string; nextHearingAt: string; courtName: string | null }[];
  reminders: { id: string; dueAt: string; type: DiaryReminderType; notes: string | null; done: boolean; case: { id: string; title: string } | null }[];
}

export const fetchDiaryCalendar = (month: string) =>
  authFetch<DiaryCalendar>(`/diary/calendar?month=${month}`);

export const fetchDiaryReminders = (all = false) =>
  authFetch<DiaryReminder[]>(`/diary/reminders${all ? '?all=1' : ''}`);
export const createDiaryReminder = (data: Record<string, unknown>) =>
  authFetch<DiaryReminder>('/diary/reminders', { method: 'POST', body: JSON.stringify(data) });
export const setDiaryReminderDone = (id: string, done: boolean) =>
  authFetch<DiaryReminder>(`/diary/reminders/${id}/done`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  });
