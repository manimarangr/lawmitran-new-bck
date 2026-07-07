export type LeadStatus = 'NEW' | 'ASSIGNED' | 'CONTACTED' | 'CLOSED';

export interface Lead {
  id: string;
  clientId: string;
  lawyerId: string;
  practiceArea: string;
  description: string;
  status: LeadStatus;
  createdAt: string;
  clientConfirmedAt?: string | null;
  closedReason?: string | null;
}

export interface RevealedContact {
  leadId: string;
  mobile: string;
  email: string;
}

export interface MySubscription {
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  trialStartDate: string | null;
  trialEndDate: string | null;
  currentSubscription: {
    id: string;
    planName: string;
    endDate: string;
    status: string;
  } | null;
}
