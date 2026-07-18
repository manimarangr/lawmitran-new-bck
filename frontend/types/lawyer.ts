export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface LawyerCity {
  id: string;
  name: string;
  district: { name: string; state: { name: string } };
}

export type AwardType = 'CLIENTS_CHOICE' | 'TOP_RESPONDER' | 'RISING_STAR';

export interface LawyerAward {
  id: string;
  type: AwardType;
  year: number;
  title: string;
}

export interface LawyerListItem {
  id: string;
  slug: string | null;
  fullName: string;
  barCouncilState: string;
  experienceYears: number;
  gender: Gender | null;
  bio: string | null;
  profileImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  ratingAvg: string | null;
  ratingCount: number;
  verificationStatus: string;
  createdAt: string;
  city: LawyerCity | null;
  practiceAreas: {
    practiceArea: { id: string; name: string; slug: string };
    proficiency: number | null;
  }[];
  /** Set when a locality filter is active — locality name if this lawyer is tagged/near it. */
  nearLocality?: string | null;
  /** Distance (km) from the selected locality centroid; null if no office pin. */
  localityKm?: number | null;
  /** Present on GET /lawyers/me/profile — latest review outcome. */
  verifications?: { status: string; comments: string | null; reviewedAt: string | null }[];
  languages: { language: { id: string; name: string; code: string } }[];
  courts: { court: { id: string; name: string; type: string } }[];
  awards?: LawyerAward[];
  /** Present on GET /lawyers/me/profile. */
  barCouncilNumber?: string;
  offices?: {
    id: string;
    label: string | null;
    addressLine: string | null;
    pincode?: string | null;
    landmark?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isPrimary: boolean;
    city: { id: string; name: string };
    locality?: { id: string; name: string; slug: string } | null;
  }[];
  serviceAreas?: { city: { id: string; name: string } }[];
}

export interface LawyerMarker {
  id: string;
  fullName: string;
  latitude: number | null;
  longitude: number | null;
  ratingAvg: string | null;
  ratingCount: number;
  city: { name: string } | null;
  practiceAreas: { practiceArea: { name: string } }[];
}

export interface SearchFilters {
  city?: string;
  locality?: string;
  practiceArea?: string;
  courtId?: string;
  experienceMin?: number;
  experienceMax?: number;
  language?: string;
  gender?: Gender;
  ratingMin?: number;
  sort?: 'rating' | 'experience' | 'createdAt';
}

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface LawyerSearchResult {
  items: LawyerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
