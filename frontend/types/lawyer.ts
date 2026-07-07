export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface LawyerCity {
  id: string;
  name: string;
  district: { name: string; state: { name: string } };
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
  languages: { language: { id: string; name: string; code: string } }[];
  courts: { court: { id: string; name: string; type: string } }[];
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
