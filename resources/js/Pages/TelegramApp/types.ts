export type RequestCategory =
  | 'plumbing'
  | 'electrical'
  | 'heating'
  | 'cleaning'
  | 'elevator'
  | 'appliance'
  | 'structural'
  | 'other';

export type RequestPriority = 'low' | 'medium' | 'high' | 'emergency';

export type RequestStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  plumbing: "🚰 Suv ta'minoti",
  electrical: '⚡ Elektr',
  heating: '🔥 Isitish',
  cleaning: '🧹 Tozalik',
  elevator: '🛗 Lift',
  appliance: '🔌 Maishiy texnika',
  structural: '🏗 Qurilish/konstruksiya',
  other: '📦 Boshqa',
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: '🟢 Past',
  medium: "🟡 O'rta",
  high: '🟠 Yuqori',
  emergency: '🔴 Favqulodda',
};

export interface ApartmentInfo {
  id: string;
  number: string;
  floor: number;
  rooms: number;
  area: number;
  building: string | null;
}

export interface ResidentInfo {
  id: string;
  full_name: string;
  resident_type: string;
  apartment: ApartmentInfo | null;
}

export interface ApartmentOption {
  resident_id: string;
  apartment_number: string | null;
  is_active: boolean;
}

export interface VendorInfo {
  id: string;
  name: string;
  specializations: string[] | null;
  rating: number | null;
}

export interface MeResponse {
  linked: boolean;
  active_role?: string | null;
  can_switch_role?: boolean;
  resident?: ResidentInfo | null;
  apartments?: ApartmentOption[];
  vendor?: VendorInfo | null;
}

export interface Photo {
  id: string;
  url: string;
  type: string;
}

export interface ResidentRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  category_label: string;
  priority: RequestPriority;
  priority_label: string;
  status: RequestStatus;
  status_label: string;
  resident_rating: number | null;
  created_at: string;
  resolution_notes?: string | null;
  resident_feedback?: string | null;
  completed_at?: string | null;
  photos?: Photo[];
}

export interface VendorRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  category_label: string;
  priority: RequestPriority;
  priority_label: string;
  status: RequestStatus;
  status_label: string;
  apartment_number: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  photos?: Photo[];
}
