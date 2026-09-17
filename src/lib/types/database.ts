export type UserRole = "patient" | "dentist" | "admin";
export type AccessStatus = "pending" | "active" | "revoked";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type AttachmentKind = "xray" | "photo" | "document";
export type UrgencyLevel = "low" | "medium" | "high";
export type VisitType = "initial_mapping" | "treatment" | "checkup";
export type SubscriptionPlan = "solo" | "clinic" | "per_patient";
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";
export type MappingRequestStatus = "new" | "contacted" | "scheduled" | "done" | "cancelled";

export type Surface = "O" | "I" | "M" | "D" | "V" | "L";

export type ToothCondition =
  | "healthy"
  | "caries"
  | "filling"
  | "crown"
  | "implant"
  | "extracted"
  | "missing"
  | "root_canal"
  | "veneer"
  | "bridge"
  | "pulpitis"
  | "periodontitis";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Dentist {
  id: string;
  profile_id: string;
  clinic_id: string | null;
  specialization: string | null;
  license_number: string | null;
  is_featured: boolean;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  rating: number | null;
  created_at: string;
  // joined
  profile?: Profile;
  clinic?: Clinic | null;
}

export interface Subscription {
  id: string;
  dentist_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  paid_until: string | null;
  created_at: string;
}

export interface MappingRequest {
  id: string;
  full_name: string;
  phone: string;
  preferred_date: string | null;
  comment: string | null;
  status: MappingRequestStatus;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface PatientAccess {
  id: string;
  patient_id: string;
  dentist_id: string;
  status: AccessStatus;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  // joined
  dentist?: Dentist;
  patient?: Profile;
}

export interface AccessCode {
  id: string;
  patient_id: string;
  code: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  dentist_id: string;
  visit_date: string;
  visit_type: VisitType;
  complaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendation: string | null;
  subtotal: number;
  discount_percent: number;
  total: number;
  payment_status: PaymentStatus;
  next_visit_date: string | null;
  created_at: string;
  // joined
  dentist?: Dentist;
  patient?: Profile;
  tooth_records?: ToothRecord[];
  attachments?: Attachment[];
}

export interface ToothRecord {
  id: string;
  visit_id: string;
  patient_id: string;
  tooth_fdi: number;
  surfaces: Surface[];
  condition: ToothCondition;
  procedure: string | null;
  note: string | null;
  price: number;
  created_at: string;
}

export interface Attachment {
  id: string;
  visit_id: string;
  file_url: string;
  kind: AttachmentKind;
  created_at: string;
}

export interface AiFinding {
  zone: string;
  observation: string;
  confidence: number;
}

export interface AiScreeningResult {
  findings: AiFinding[];
  urgency: UrgencyLevel;
  recommendations: string[];
  disclaimer_required: boolean;
}

export interface AiScreening {
  id: string;
  patient_id: string;
  image_urls: string[];
  result: AiScreeningResult;
  urgency: UrgencyLevel;
  created_at: string;
}
