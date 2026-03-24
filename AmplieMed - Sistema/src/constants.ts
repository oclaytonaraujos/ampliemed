/**
 * Centralized constants and enums for the entire application
 * Single source of truth for statuses, roles, and other constants
 */

// ─────────────────────────────────────────────────────────────────────────────
// ─── User & Access Control ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'medico',
  CLINIC_MANAGER: 'gerente_clinica',
  SECRETARY: 'secretaria',
  SECURITY: 'seguranca',
  PATIENT: 'paciente',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const PERMISSION_LEVELS = {
  VIEW: 'view',
  EDIT: 'edit',
  CREATE: 'create',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ─── Appointments & Scheduling ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const APPOINTMENT_STATUS = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
  COMPLETED: 'realizado',
  CANCELLED: 'cancelado',
  NO_SHOW: 'nao_compareceu',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

export const APPOINTMENT_TYPE = {
  IN_PERSON: 'presencial',
  TELEMEDICINE: 'telemedicina',
} as const;

export type AppointmentType = typeof APPOINTMENT_TYPE[keyof typeof APPOINTMENT_TYPE];

// ─────────────────────────────────────────────────────────────────────────────
// ─── Payment & Financial ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUS = {
  PENDING: 'pendente',
  PAID: 'pago',
  PARTIAL: 'parcial',
  OVERDUE: 'vencido',
  CANCELLED: 'cancelado',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const PAYMENT_TYPE = {
  PRIVATE: 'particular',
  INSURANCE: 'convenio',
} as const;

export type PaymentType = typeof PAYMENT_TYPE[keyof typeof PAYMENT_TYPE];

export const PAYMENT_METHOD = {
  PIX: 'pix',
  CREDIT_CARD: 'credito',
  DEBIT_CARD: 'debito',
  CASH: 'dinheiro',
  INSURANCE: 'convenio',
  CHECK: 'cheque',
} as const;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

// ─────────────────────────────────────────────────────────────────────────────
// ─── Patient Data ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const PATIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export type PatientStatus = typeof PATIENT_STATUS[keyof typeof PATIENT_STATUS];

export const GENDER = {
  MALE: 'M',
  FEMALE: 'F',
  OTHER: 'Outro',
} as const;

export type Gender = typeof GENDER[keyof typeof GENDER];

export const MARITAL_STATUS = {
  SINGLE: 'solteiro',
  MARRIED: 'casado',
  DIVORCED: 'divorciado',
  WIDOWED: 'viúvo',
  CIVIL_UNION: 'uniao_estavel',
} as const;

export type MaritalStatus = typeof MARITAL_STATUS[keyof typeof MARITAL_STATUS];

// ─────────────────────────────────────────────────────────────────────────────
// ─── Medical Records ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const MEDICAL_RECORD_TYPE = {
  CONSULTATION: 'consulta',
  PRESCRIPTION: 'receituario',
  EXAM: 'exame',
  DOCUMENT: 'documento',
  NOTE: 'anotacao',
} as const;

export type MedicalRecordType = typeof MEDICAL_RECORD_TYPE[keyof typeof MEDICAL_RECORD_TYPE];

// ─────────────────────────────────────────────────────────────────────────────
// ─── System Settings ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const SYNC_CONFIG = {
  // Default polling interval for data synchronization (30 seconds)
  POLL_INTERVAL: 30000,
  // Timeout for API requests (10 seconds)
  API_TIMEOUT: 10000,
  // Timeout for Supabase operations (15 seconds)
  SUPABASE_TIMEOUT: 15000,
  // Maximum retry attempts for failed requests
  MAX_RETRIES: 3,
  // Initial delay for exponential backoff (milliseconds)
  RETRY_INITIAL_DELAY: 1000,
} as const;

export const RATE_LIMIT = {
  // Maximum login attempts in time window
  MAX_LOGIN_ATTEMPTS: 5,
  // Rate limit window (15 minutes)
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  // Signup rate limit attempts
  MAX_SIGNUP_ATTEMPTS: 3,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ─── API Configuration ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
} as const;

export const API_ENDPOINTS = {
  // Auth
  SIGNUP: '/auth/signup',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  
  // Patients
  PATIENTS: '/patients',
  
  // Appointments
  APPOINTMENTS: '/appointments',
  
  // Medical Records
  MEDICAL_RECORDS: '/medical-records',
  
  // Doctors
  DOCTORS: '/doctors',
  
  // Financial
  PAYMENTS: '/payments',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ─── Validation Rules ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const VALIDATION_RULES = {
  // CPF: 11 digits
  CPF_LENGTH: 11,
  CPF_PATTERN: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  
  // RG: variable length, typically 8-9 digits
  RG_MIN_LENGTH: 8,
  RG_MAX_LENGTH: 10,
  
  // Phone: 11 digits (area code + number)
  PHONE_LENGTH: 11,
  PHONE_PATTERN: /^\(\d{2}\)\s?\d{4,5}-\d{4}$/,
  
  // CEP: 8 digits
  CEP_LENGTH: 8,
  CEP_PATTERN: /^\d{5}-\d{3}$/,
  
  // Email
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Name: min 3 chars, max 255
  NAME_MIN: 3,
  NAME_MAX: 255,
  
  // Password: min 8 chars
  PASSWORD_MIN: 8,
  
  // CRM: typically 4-6 digits + state code
  CRM_PATTERN: /^\d{4,6}\/[A-Z]{2}$/,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ─── UI/UX Settings ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const UI_CONFIG = {
  // Default page size for pagination
  DEFAULT_PAGE_SIZE: 50,
  // Maximum page size to prevent memory issues
  MAX_PAGE_SIZE: 500,
  // Toast notification timeout (milliseconds)
  TOAST_TIMEOUT: 3000,
  // Debounce delay for search (milliseconds)
  SEARCH_DEBOUNCE: 300,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ─── Feature Flags ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURES = {
  TELEMEDICINE: process.env.REACT_APP_FEATURE_TELEMEDICINE === 'true',
  FINANCIAL_REPORTS: process.env.REACT_APP_FEATURE_FINANCIAL_REPORTS === 'true',
  AUDIT_LOG: process.env.REACT_APP_FEATURE_AUDIT_LOG === 'true',
  DARK_MODE: process.env.REACT_APP_FEATURE_DARK_MODE === 'true',
} as const;
