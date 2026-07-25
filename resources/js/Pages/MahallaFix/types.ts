export type ReportCategory =
  | 'pothole'
  | 'street_light'
  | 'water_leak'
  | 'gas_leak'
  | 'garbage'
  | 'other';

export type ReportPriority = 'low' | 'medium' | 'high' | 'emergency';

export type ReportStatus = 'submitted' | 'in_progress' | 'resolved' | 'rejected';

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  pothole: "🕳 Yo'l teshigi",
  street_light: "💡 Ko'cha chirog'i",
  water_leak: '🚰 Suv sizishi',
  gas_leak: '🔥 Gaz sizishi',
  garbage: '🗑 Chiqindi',
  other: '📦 Boshqa',
};

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: '🟢 Past',
  medium: "🟡 O'rta",
  high: '🟠 Yuqori',
  emergency: '🔴 Favqulodda',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Yuborildi',
  in_progress: 'Jarayonda',
  resolved: 'Hal etildi',
  rejected: 'Rad etildi',
};

export interface CityReport {
  id: string;
  ticket_code: string;
  title: string;
  category: ReportCategory;
  category_label: string;
  priority: ReportPriority;
  priority_label: string;
  status: ReportStatus;
  status_label: string;
  latitude: number;
  longitude: number;
  created_at: string;
  // detailed
  description?: string | null;
  ai_summary?: string | null;
  address?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  photo_url?: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}
