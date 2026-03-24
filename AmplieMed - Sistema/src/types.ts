/**
 * Centralized type definitions for the application
 * Replaces any usage and provides type safety across the app
 */

import type { ReactNode } from 'react';
import type { Patient, ScheduleAppointment, MedicalRecord, AuthUser } from './components/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// ─── API & Server ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

/**
 * Template data for document generation (prescription, etc)
 */
export interface PrescriptionTemplateData {
  doctorName: string;
  specialization: string;
  crm: string;
  patientName: string;
  patientCPF: string;
  patientAge: number;
  medications: PrescriptionMedication[];
  observations?: string;
  generatedAt: string;
}

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

/**
 * Location state passed through React Router
 */
export interface LocationState {
  from?: string;
  patientId?: string;
  appointmentId?: string;
  highlightedField?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Components Props ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface FormHandlers {
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Pagination ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationOptions {
  limit: number;
  cursor?: string | null;
  offset?: number; // Alternative to cursor
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Search & Filtering ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'contains' | 'startsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Financial ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  paidAmount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface DoctorHonorarium {
  doctorName: string;
  crm: string;
  consultations: number;
  totalRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  deductions: number;
  netAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Notifications ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Audit & Logging ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  status: 'success' | 'failure';
  details?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Forms & Validation ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormError[];
  isSubmitting: boolean;
  isDirty: boolean;
  isTouched: Record<string, boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Cache & Sync ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: Error | null;
  syncCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Utility Types ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Makes all properties of T required and non-nullable
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Makes all properties of T optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Extracts keys of type K from object T
 */
export type KeysOfType<T, K> = {
  [P in keyof T]: T[P] extends K ? P : never;
}[keyof T];

/**
 * Converts T properties to a simpler Record type
 */
export type Simplify<T> = {
  [P in keyof T]: T[P];
} & {};

// ─────────────────────────────────────────────────────────────────────────────
// ─── Data Mapper Types ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Address object used in Patient and other entities
 */
export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

/**
 * Responsible person info for patients
 */
export interface ResponsiblePerson {
  name: string;
  cpf: string;
  phone: string;
  relationship: string;
}

/**
 * Patient frontend form type
 */
export interface PatientInput {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  age: number;
  gender: string;
  phone: string;
  phone2?: string;
  email: string;
  address: Address;
  motherName: string;
  maritalStatus: string;
  occupation: string;
  insurance: string;
  insuranceNumber?: string;
  insuranceValidity?: string;
  observations?: string;
  allergies?: string;
  medications?: string;
  lgpdConsent: boolean;
  lgpdConsentDate?: string;
  status: string;
  lastVisit?: string;
  totalVisits: number;
  responsible?: ResponsiblePerson;
}

/**
 * Patient database row type (snake_case)
 */
export interface PatientRow {
  id: string;
  owner_id: string;
  name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  age: number;
  gender: string;
  phone: string;
  phone2?: string;
  email: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement?: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  mother_name: string;
  marital_status: string;
  occupation: string;
  insurance: string;
  insurance_number?: string;
  insurance_validity?: string;
  observations?: string;
  allergies?: string;
  medications?: string;
  lgpd_consent: boolean;
  lgpd_consent_date?: string;
  responsible_name?: string;
  responsible_cpf?: string;
  responsible_phone?: string;
  responsible_relationship?: string;
  status: string;
  created_at: string;
  last_visit?: string;
  total_visits: number;
}

/**
 * Appointment frontend form type
 */
export interface AppointmentInput {
  id: string;
  patientName: string;
  patientCPF: string;
  patientPhone: string;
  patientEmail: string;
  doctorName: string;
  specialty: string;
  time: string;
  date: string;
  duration: number;
  type: string;
  status: string;
  room?: string;
  notes?: string;
  telemedLink?: string;
  consultationValue?: number;
  paymentType?: string;
  insuranceName?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  installments?: number;
  paidAmount?: number;
  dueDate?: string;
  tussCode?: string;
}

/**
 * Appointment database row type
 */
export interface AppointmentRow {
  id: string;
  owner_id: string;
  patient_name: string;
  patient_cpf: string;
  patient_phone: string;
  patient_email: string;
  doctor_name: string;
  specialty: string;
  appointment_time: string;
  appointment_date: string;
  duration: number;
  type: string;
  status: string;
  color: string;
  room?: string;
  notes?: string;
  telemed_link?: string;
  consultation_value?: number;
  payment_type?: string;
  insurance_name?: string;
  payment_status?: string;
  payment_method?: string;
  installments?: number;
  paid_amount?: number;
  due_date?: string;
  tuss_code?: string;
}

/**
 * MedicalRecord frontend form type
 */
export interface MedicalRecordInput {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  type: string;
  cid10: string;
  chiefComplaint: string;
  conductPlan: string;
  anamnesis?: string;
  physicalExam?: string;
  prescriptions?: string;
  signed: boolean;
  signedAt?: string;
}

/**
 * MedicalRecord database row type
 */
export interface MedicalRecordRow {
  id: string;
  owner_id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  record_date: string;
  type: string;
  cid10: string;
  chief_complaint: string;
  conduct_plan: string;
  anamnesis?: string;
  physical_exam?: string;
  prescriptions?: string;
  signed: boolean;
  signed_at?: string;
  created_at: string;
}

/**
 * Exam frontend form type
 */
export interface ExamInput {
  id: string;
  patientName: string;
  patientId?: string;
  examType: string;
  requestDate: string;
  resultDate?: string;
  status: string;
  laboratory: string;
  requestedBy: string;
  priority: string;
  tussCode?: string;
  notes?: string;
}

/**
 * Exam database row type
 */
export interface ExamRow {
  id: string;
  owner_id: string;
  patient_name: string;
  patient_id?: string;
  exam_type: string;
  request_date: string;
  result_date?: string;
  status: string;
  laboratory: string;
  requested_by: string;
  priority: string;
  tuss_code?: string;
  notes?: string;
}

/**
 * StockItem frontend form type
 */
export interface StockItemInput {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  batch: string;
  expiry: string;
  supplier: string;
  status: string;
  location?: string;
  unitCost?: number;
}

/**
 * StockItem database row type
 */
export interface StockItemRow {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  batch: string;
  expiry?: string;
  supplier: string;
  status: string;
  location?: string;
  unit_cost?: number;
}

/**
 * QueueEntry frontend form type
 */
export interface QueueEntryInput {
  id: string;
  ticketNumber: string;
  name: string;
  status: string;
  arrivalTime: string;
  waitingTime: number;
  doctor: string;
  specialty: string;
  priority: boolean;
  room?: string;
  cpf?: string;
  birthDate?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  insurance?: string;
  allergies?: string;
}

/**
 * QueueEntry database row type
 */
export interface QueueEntryRow {
  id: string;
  owner_id: string;
  ticket_number: string;
  name: string;
  status: string;
  arrival_time: string;
  waiting_time: number;
  doctor: string;
  specialty: string;
  priority: boolean;
  room?: string;
  cpf?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  insurance?: string;
  allergies?: string;
}

/**
 * Notification frontend form type
 */
export interface NotificationInput {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  urgent: boolean;
}

/**
 * Notification database row type
 */
export interface NotificationRow {
  id: string;
  owner_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  urgent: boolean;
  created_at: string;
}

/**
 * FinancialBilling frontend form type
 */
export interface BillingInput {
  id: string;
  patient: string;
  insurance: string;
  date: string;
  amount: number;
  status: string;
  items: number;
}

/**
 * FinancialBilling database row type
 */
export interface BillingRow {
  id: string;
  owner_id: string;
  patient_name: string;
  insurance_name: string;
  billing_date: string;
  amount: number;
  status: string;
  items_count: number;
  created_at: string;
}
