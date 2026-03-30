/**
 * AmplieMed — Data Mappers
 * Bidirectional conversion between frontend camelCase objects
 * and PostgreSQL snake_case rows for all 21 entities.
 */

import type {
  PatientInput, PatientRow,
  AppointmentInput, AppointmentRow,
  MedicalRecordInput, MedicalRecordRow,
  ExamInput, ExamRow,
  StockItemInput, StockItemRow,
  QueueEntryInput, QueueEntryRow,
  NotificationInput, NotificationRow,
  BillingInput, BillingRow,
  Address,
  ResponsiblePerson,
} from '../types';
import { calculateAge } from './validators';

// ─── Generic utilities ───────────────────────────────────────────────────────

/**
 * Converts camelCase string to snake_case
 * @param str The string to convert
 * @returns The converted string
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts snake_case string to camelCase
 * @param str The string to convert
 * @returns The converted string
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert an object's keys from camelCase to snake_case (shallow)
 * @param obj The object to convert
 * @returns New object with snake_case keys
 */
function keysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

/**
 * Convert an object's keys from snake_case to camelCase (shallow)
 * @param obj The object to convert
 * @returns New object with camelCase keys
 */
function keysToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

/** Parse a Brazilian date string (dd/MM/yyyy) to ISO date (yyyy-MM-dd) */
function brDateToIso(brDate: string | undefined | null): string | null {
  if (!brDate || brDate === '-' || brDate === '') return null;
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(brDate)) return brDate.slice(0, 10);
  // Brazilian format dd/MM/yyyy
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

/** Parse an ISO date to Brazilian format (dd/MM/yyyy) */
function isoToBrDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Parse ISO timestamp to Brazilian datetime string */
function isoToBrDatetime(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleString('pt-BR');
}

/** Convert time string (HH:MM) to full ISO timestamp for today */
function timeToIsoTimestamp(time: string | undefined | null): string {
  if (!time) return new Date().toISOString();
  
  // Already a full ISO timestamp
  if (/^\d{4}-\d{2}-\d{2}T/.test(time)) return time;
  
  // Time-only format (HH:MM or HH:MM:SS)
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const now = new Date();
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    now.setHours(hours, minutes, seconds, 0);
    return now.toISOString();
  }
  
  // Fallback to current timestamp
  return new Date().toISOString();
}

// ─── Status calculation helpers ──────────────────────────────────────────────

/** Calculate receivable status based on due date */
function calculateReceivableStatus(dueDate: string, currentStatus: string): string {
  if (currentStatus === 'received') return 'received';
  if (!dueDate) return currentStatus || 'pending';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  return 'pending';
}

/** Calculate payable status based on due date */
function calculatePayableStatus(dueDate: string, currentStatus: string): string {
  if (currentStatus === 'paid') return 'paid';
  if (!dueDate) return currentStatus || 'pending';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  return 'pending';
}

/** Calculate stock item status based on quantity and expiry */
function calculateStockStatus(quantity: number, minQuantity: number, expiry: string): string {
  // Check expiry first
  if (expiry) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiry);
    expiryDate.setHours(0, 0, 0, 0);
    
    if (expiryDate < today) return 'vencido';
  }
  
  // Check quantity
  if (quantity === 0) return 'critico';
  if (quantity <= minQuantity) return 'critico';
  if (quantity <= minQuantity * 1.5) return 'baixo';
  
  return 'ok';
}

// ─── Patient ─────────────────────────────────────────────────────────────────

/**
 * Convert frontend patient object to database row format
 * @param p Patient input object with camelCase keys
 * @param ownerId Owner/clinic ID
 * @returns Database row object with snake_case keys
 */
export function patientToRow(p: PatientInput, ownerId: string): PatientRow {
  return {
    id: p.id,
    owner_id: ownerId,
    name: p.name || '',
    cpf: p.cpf || '',
    rg: p.rg || '',
    birth_date: brDateToIso(p.birthDate) || p.birthDate || null,
    age: p.age ?? null,
    gender: p.gender || null,
    phone: p.phone || '',
    phone2: p.phone2 || null,
    email: p.email || '',
    mother_name: p.motherName || '',
    marital_status: p.maritalStatus || '',
    occupation: p.occupation || '',
    // Flat address
    address_cep: p.address?.cep || '',
    address_street: p.address?.street || '',
    address_number: p.address?.number || '',
    address_complement: p.address?.complement || null,
    address_neighborhood: p.address?.neighborhood || '',
    address_city: p.address?.city || '',
    address_state: p.address?.state || '',
    // Insurance
    insurance: p.insurance || '',
    insurance_number: p.insuranceNumber || null,
    insurance_validity: p.insuranceValidity || null,
    // Medical
    observations: p.observations || null,
    allergies: p.allergies || null,
    medications: p.medications || null,
    // LGPD
    lgpd_consent: p.lgpdConsent ?? false,
    lgpd_consent_date: p.lgpdConsentDate ? new Date(brDateToIso(p.lgpdConsentDate) || p.lgpdConsentDate).toISOString() : null,
    // Responsible
    responsible_name: p.responsible?.name || null,
    responsible_cpf: p.responsible?.cpf || null,
    responsible_phone: p.responsible?.phone || null,
    responsible_relationship: p.responsible?.relationship || null,
    // Control
    status: p.status || 'active',
    created_at: new Date().toISOString(),
    last_visit: brDateToIso(p.lastVisit) || null,
    total_visits: p.totalVisits ?? 0,
  };
}

/**
 * Convert database patient row to frontend object
 * @param row Database row object with snake_case keys
 * @returns Frontend patient object with camelCase keys
 */
export function patientFromRow(row: PatientRow): PatientInput {
  return {
    id: row.id,
    name: row.name || '',
    cpf: row.cpf || '',
    rg: row.rg || '',
    birthDate: row.birth_date ? isoToBrDate(row.birth_date) : '',
    age: row.birth_date ? calculateAge(isoToBrDate(row.birth_date)) : (row.age ?? 0),
    gender: row.gender || 'M',
    phone: row.phone || '',
    phone2: row.phone2 || undefined,
    email: row.email || '',
    address: {
      cep: row.address_cep || '',
      street: row.address_street || '',
      number: row.address_number || '',
      complement: row.address_complement || undefined,
      neighborhood: row.address_neighborhood || '',
      city: row.address_city || '',
      state: row.address_state || '',
    },
    motherName: row.mother_name || '',
    maritalStatus: row.marital_status || '',
    occupation: row.occupation || '',
    insurance: row.insurance || '',
    insuranceNumber: row.insurance_number || undefined,
    insuranceValidity: row.insurance_validity || undefined,
    observations: row.observations || undefined,
    allergies: row.allergies || undefined,
    medications: row.medications || undefined,
    lgpdConsent: row.lgpd_consent ?? false,
    lgpdConsentDate: row.lgpd_consent_date ? isoToBrDate(row.lgpd_consent_date) : undefined,
    status: row.status || 'active',
    portalToken: (row as any).portal_token || undefined,
    lastVisit: row.last_visit ? isoToBrDate(row.last_visit) : '-',
    totalVisits: row.total_visits ?? 0,
    createdAt: row.created_at ? isoToBrDate(row.created_at) : undefined,
    responsible: row.responsible_name
      ? {
          name: row.responsible_name,
          cpf: row.responsible_cpf || '',
          phone: row.responsible_phone || '',
          relationship: row.responsible_relationship || '',
        }
      : undefined,
  };
}

// ─── Appointment ─────────────────────────────────────────────────────────────

/**
 * Convert frontend appointment object to database row format
 * @param a Appointment input object with camelCase keys
 * @param ownerId Owner/clinic ID
 * @returns Database row object with snake_case keys
 */
export function appointmentToRow(a: AppointmentInput, ownerId: string): AppointmentRow {
  return {
    id: a.id,
    owner_id: ownerId,
    patient_name: a.patientName || '',
    patient_cpf: a.patientCPF || '',
    patient_phone: a.patientPhone || '',
    patient_email: a.patientEmail || '',
    doctor_name: a.doctorName || '',
    specialty: a.specialty || '',
    appointment_time: a.time || '08:00',
    appointment_date: a.date || new Date().toISOString().slice(0, 10),
    duration: a.duration ?? 30,
    type: a.type || 'presencial',
    status: a.status || 'pendente',
    color: '',
    room: a.room || null,
    notes: a.notes || null,
    telemed_link: a.telemedLink || null,
    consultation_value: a.consultationValue ?? null,
    payment_type: a.paymentType || 'particular',
    insurance_name: a.insuranceName || null,
    payment_status: a.paymentStatus || 'pendente',
    payment_method: a.paymentMethod || null,
    installments: a.installments ?? 1,
    paid_amount: a.paidAmount ?? 0,
    due_date: brDateToIso(a.dueDate) || a.dueDate || null,
    tuss_code: a.tussCode || null,
  };
}

/**
 * Convert database appointment row to frontend object
 * @param row Database row object with snake_case keys
 * @returns Frontend appointment object with camelCase keys
 */
export function appointmentFromRow(row: AppointmentRow): AppointmentInput {
  return {
    id: row.id,
    patientName: row.patient_name || '',
    patientCPF: row.patient_cpf || '',
    patientPhone: row.patient_phone || '',
    patientEmail: row.patient_email || '',
    doctorName: row.doctor_name || '',
    specialty: row.specialty || '',
    time: row.appointment_time || '',
    date: row.appointment_date || '',
    duration: row.duration ?? 30,
    type: row.type || 'presencial',
    status: row.status || 'pendente',
    room: row.room || undefined,
    notes: row.notes || undefined,
    telemedLink: row.telemed_link || undefined,
    consultationValue: row.consultation_value != null ? Number(row.consultation_value) : undefined,
    paymentType: row.payment_type || undefined,
    insuranceName: row.insurance_name || undefined,
    paymentStatus: row.payment_status || undefined,
    paymentMethod: row.payment_method || undefined,
    installments: row.installments ?? undefined,
    paidAmount: row.paid_amount != null ? Number(row.paid_amount) : undefined,
    dueDate: row.due_date || undefined,
    tussCode: row.tuss_code || undefined,
  };
}

// ─── MedicalRecord ───────────────────────────────────────────────────────────

/**
 * Convert frontend medical record object to database row format
 * @param r Medical record input object with camelCase keys
 * @param ownerId Owner/clinic ID
 * @returns Database row object with snake_case keys
 */
export function medicalRecordToRow(r: MedicalRecordInput, ownerId: string): MedicalRecordRow {
  return {
    id: r.id,
    owner_id: ownerId,
    patient_id: r.patientId || null,
    patient_name: r.patientName || '',
    doctor_name: r.doctorName || '',
    record_date: r.date ? new Date(brDateToIso(r.date) || r.date).toISOString() : new Date().toISOString(),
    type: r.type || 'Consulta',
    cid10: r.cid10 || '',
    chief_complaint: r.chiefComplaint || '',
    conduct_plan: r.conductPlan || '',
    anamnesis: r.anamnesis || null,
    physical_exam: r.physicalExam || null,
    prescriptions: r.prescriptions || null,
    signed: r.signed ?? false,
    signed_at: r.signedAt ? new Date(r.signedAt).toISOString() : null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Convert database medical record row to frontend object
 * @param row Database row object with snake_case keys
 * @returns Frontend medical record object with camelCase keys
 */
export function medicalRecordFromRow(row: MedicalRecordRow): MedicalRecordInput {
  return {
    id: row.id,
    patientId: row.patient_id || '',
    patientName: row.patient_name || '',
    doctorName: row.doctor_name || '',
    date: isoToBrDate(row.record_date),
    type: row.type || 'Consulta',
    cid10: row.cid10 || '',
    chiefComplaint: row.chief_complaint || '',
    conductPlan: row.conduct_plan || '',
    anamnesis: row.anamnesis || undefined,
    physicalExam: row.physical_exam || undefined,
    prescriptions: row.prescriptions || undefined,
    signed: row.signed ?? false,
    signedAt: row.signed_at || undefined,
  };
}

// ─── Exam ────────────────────────────────────────────────────────────────────

/**
 * Convert frontend exam object to database row format
 * @param e Exam input object with camelCase keys
 * @param ownerId Owner/clinic ID
 * @returns Database row object with snake_case keys
 */
export function examToRow(e: ExamInput, ownerId: string): ExamRow {
  return {
    id: e.id,
    owner_id: ownerId,
    patient_name: e.patientName || '',
    patient_id: e.patientId || null,
    exam_type: e.examType || '',
    request_date: brDateToIso(e.requestDate) || e.requestDate || new Date().toISOString().slice(0, 10),
    result_date: e.resultDate ? (brDateToIso(e.resultDate) || e.resultDate) : null,
    status: e.status || 'solicitado',
    laboratory: e.laboratory || '',
    requested_by: e.requestedBy || '',
    priority: e.priority || 'normal',
    tuss_code: e.tussCode || null,
    notes: e.notes || null,
  };
}

/**
 * Convert database exam row to frontend object
 * @param row Database row object with snake_case keys
 * @returns Frontend exam object with camelCase keys
 */
export function examFromRow(row: ExamRow): ExamInput {
  return {
    id: row.id,
    patientName: row.patient_name || '',
    patientId: row.patient_id || undefined,
    examType: row.exam_type || '',
    requestDate: row.request_date || '',
    resultDate: row.result_date || null,
    status: row.status || 'solicitado',
    laboratory: row.laboratory || '',
    requestedBy: row.requested_by || '',
    priority: row.priority || 'normal',
    tussCode: row.tuss_code || undefined,
    notes: row.notes || undefined,
  };
}

// ─── StockItem ───────────────────────────────────────────────────────────────

export function stockItemToRow(s: any, ownerId: string): Record<string, any> {
  return {
    id: s.id,
    owner_id: ownerId,
    name: s.name || '',
    category: s.category || 'material',
    quantity: s.quantity ?? 0,
    min_quantity: s.minQuantity ?? 0,
    unit: s.unit || 'un',
    batch: s.batch || '',
    expiry: brDateToIso(s.expiry) || s.expiry || null,
    supplier: s.supplier || '',
    status: s.status || 'ok',
    location: s.location || null,
    unit_cost: s.unitCost ?? null,
  };
}

export function stockItemFromRow(row: any): any {
  return {
    id: row.id,
    name: row.name || '',
    category: row.category || 'material',
    quantity: row.quantity ?? 0,
    minQuantity: row.min_quantity ?? 0,
    unit: row.unit || 'un',
    batch: row.batch || '',
    expiry: row.expiry || '',
    supplier: row.supplier || '',
    status: calculateStockStatus(row.quantity, row.min_quantity, row.expiry) || 'ok',
    location: row.location || undefined,
    unitCost: row.unit_cost != null ? Number(row.unit_cost) : undefined,
  };
}

// ─── QueueEntry ──────────────────────────────────────────────────────────────

export function queueEntryToRow(q: any, ownerId: string): Record<string, any> {
  return {
    id: q.id,
    owner_id: ownerId,
    ticket_number: q.ticketNumber || '',
    name: q.name || '',
    status: q.status || 'waiting',
    arrival_time: timeToIsoTimestamp(q.arrivalTime),
    waiting_time: q.waitingTime ?? 0,
    doctor: q.doctor || '',
    specialty: q.specialty || '',
    priority: q.priority ?? false,
    room: q.room || null,
    cpf: q.cpf || null,
    birth_date: brDateToIso(q.birthDate) || q.birthDate || null,
    age: q.age ?? null,
    gender: q.gender || null,
    phone: q.phone || null,
    email: q.email || null,
    insurance: q.insurance || null,
    allergies: q.allergies || null,
    appointment_id: q.appointmentId || null,
  };
}

export function queueEntryFromRow(row: any): any {
  return {
    id: row.id,
    ticketNumber: row.ticket_number || '',
    name: row.name || '',
    status: row.status || 'waiting',
    arrivalTime: row.arrival_time || '',
    waitingTime: row.waiting_time ?? 0,
    doctor: row.doctor || '',
    specialty: row.specialty || '',
    priority: row.priority ?? false,
    room: row.room || undefined,
    cpf: row.cpf || undefined,
    birthDate: row.birth_date || undefined,
    age: row.age ?? undefined,
    gender: row.gender || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    insurance: row.insurance || undefined,
    allergies: row.allergies || undefined,
    appointmentId: row.appointment_id || undefined,
  };
}

// ─── Notification ────────────────────────────────────────────────────────────

export function notificationToRow(n: any, ownerId: string): Record<string, any> {
  return {
    id: n.id,
    owner_id: ownerId,
    type: n.type || 'info',
    title: n.title || '',
    message: n.message || '',
    is_read: n.read ?? false,
    urgent: n.urgent ?? false,
  };
}

export function notificationFromRow(row: any): any {
  return {
    id: row.id,
    type: row.type || 'info',
    title: row.title || '',
    message: row.message || '',
    time: isoToBrDatetime(row.created_at) || 'Agora',
    read: row.is_read ?? false,
    urgent: row.urgent ?? false,
  };
}

// ─── FinancialBilling ────────────────────────────────────────────────────────

export function billingToRow(b: any, ownerId: string): Record<string, any> {
  return {
    id: b.id,
    owner_id: ownerId,
    patient_name: b.patient || '',
    insurance_name: b.insurance || '',
    billing_date: brDateToIso(b.date) || b.date || new Date().toISOString().slice(0, 10),
    amount: b.amount ?? 0,
    status: b.status || 'pending',
    items_count: b.items ?? 0,
  };
}

export function billingFromRow(row: any): any {
  return {
    id: row.id,
    patient: row.patient_name || '',
    insurance: row.insurance_name || '',
    date: row.billing_date || '',
    amount: Number(row.amount) || 0,
    status: row.status || 'pending',
    items: row.items_count ?? 0,
  };
}

// ─── FinancialPayment ────────────────────────────────────────────────────────

export function paymentToRow(p: any, ownerId: string): Record<string, any> {
  return {
    id: p.id,
    owner_id: ownerId,
    patient_name: p.patient || '',
    payment_type: p.type || '',
    payment_date: brDateToIso(p.date) || p.date || new Date().toISOString().slice(0, 10),
    amount: p.amount ?? 0,
    method: p.method || '',
    status: p.status || 'pending',
  };
}

export function paymentFromRow(row: any): any {
  return {
    id: row.id,
    patient: row.patient_name || '',
    type: row.payment_type || '',
    date: row.payment_date || '',
    amount: Number(row.amount) || 0,
    method: row.method || '',
    status: row.status || 'pending',
  };
}

// ─── FinancialReceivable ─────────────────────────────────────────────────────

export function receivableToRow(r: any, ownerId: string): Record<string, any> {
  return {
    id: r.id,
    owner_id: ownerId,
    patient_name: r.patient || '',
    description: r.description || '',
    due_date: brDateToIso(r.dueDate) || r.dueDate || new Date().toISOString().slice(0, 10),
    amount: r.amount ?? 0,
    status: r.status || 'pending',
  };
}

export function receivableFromRow(row: any): any {
  return {
    id: row.id,
    patient: row.patient_name || '',
    description: row.description || '',
    dueDate: row.due_date || '',
    amount: Number(row.amount) || 0,
    status: calculateReceivableStatus(row.due_date, row.status) || 'pending',
  };
}

// ─── FinancialPayable ────────────────────────────────────────────────────────

export function payableToRow(p: any, ownerId: string): Record<string, any> {
  return {
    id: p.id,
    owner_id: ownerId,
    supplier: p.supplier || '',
    description: p.description || '',
    due_date: brDateToIso(p.dueDate) || p.dueDate || new Date().toISOString().slice(0, 10),
    amount: p.amount ?? 0,
    status: p.status || 'pending',
  };
}

export function payableFromRow(row: any): any {
  return {
    id: row.id,
    supplier: row.supplier || '',
    description: row.description || '',
    dueDate: row.due_date || '',
    amount: Number(row.amount) || 0,
    status: calculatePayableStatus(row.due_date, row.status) || 'pending',
  };
}

// ─── Professional ────────────────────────────────────────────────────────────

export function professionalToRow(p: any, ownerId: string): Record<string, any> {
  return {
    id: p.id,
    owner_id: ownerId,
    name: p.name || '',
    crm: p.crm || '',
    crm_uf: p.crmUf || '',
    specialty: p.specialty || '',
    email: p.email || '',
    phone: p.phone || '',
    cpf: p.cpf || '',
    digital_certificate: p.digitalCertificate || 'none',
    certificate_expiry: brDateToIso(p.certificateExpiry) || p.certificateExpiry || null,
    status: p.status || 'active',
    clinics_names: p.clinics || [],
    // ── Financial fields (migration 20260317000001) ──────────────────────────
    role: p.role || 'doctor',
    payment_model: p.paymentModel || null,
    fixed_salary: p.fixedSalary ?? null,
    revenue_percentage: p.revenuePercentage ?? null,
    goal_monthly_consultations: p.goalMonthlyConsultations ?? null,
    goal_monthly_revenue: p.goalMonthlyRevenue ?? null,
    goal_patient_satisfaction: p.goalPatientSatisfaction ?? null,
    consultations_this_month: p.consultationsThisMonth ?? null,
    revenue_this_month: p.revenueThisMonth ?? null,
    avg_satisfaction: p.avgSatisfaction ?? null,
    avg_consultation_time: p.avgConsultationTime ?? null,
  };
}

export function professionalFromRow(row: any): any {
  return {
    id: row.id,
    name: row.name || '',
    crm: row.crm || '',
    crmUf: row.crm_uf || '',
    specialty: row.specialty || '',
    email: row.email || '',
    phone: row.phone || '',
    cpf: row.cpf || '',
    digitalCertificate: row.digital_certificate || 'none',
    certificateExpiry: row.certificate_expiry || '',
    status: row.status || 'active',
    clinics: row.clinics_names || [],
    createdAt: isoToBrDate(row.created_at),
    // ── Financial fields (migration 20260317000001) ──────────────────────────
    role: row.role || 'doctor',
    paymentModel: row.payment_model || undefined,
    fixedSalary: row.fixed_salary != null ? Number(row.fixed_salary) : undefined,
    revenuePercentage: row.revenue_percentage != null ? Number(row.revenue_percentage) : undefined,
    goalMonthlyConsultations: row.goal_monthly_consultations ?? undefined,
    goalMonthlyRevenue: row.goal_monthly_revenue != null ? Number(row.goal_monthly_revenue) : undefined,
    goalPatientSatisfaction: row.goal_patient_satisfaction != null ? Number(row.goal_patient_satisfaction) : undefined,
    consultationsThisMonth: row.consultations_this_month ?? undefined,
    revenueThisMonth: row.revenue_this_month != null ? Number(row.revenue_this_month) : undefined,
    // avgSatisfaction: intentionally null when no ratings module exists — never fabricated
    avgSatisfaction: row.avg_satisfaction != null && Number(row.avg_satisfaction) > 0
      ? Number(row.avg_satisfaction)
      : undefined,
    avgConsultationTime: row.avg_consultation_time ?? undefined,
  };
}

// ─── Insurance ───────────────────────────────────────────────────────────────

export function insuranceToRow(i: any, ownerId: string): Record<string, any> {
  return {
    id: i.id,
    owner_id: ownerId,
    name: i.name || '',
    cnpj: i.cnpj || '',
    register: i.register || '',
    type: i.type || 'health',
    status: i.status || 'active',
    phone: i.phone || '',
    email: i.email || '',
    contract_date: brDateToIso(i.contractDate) || i.contractDate || null,
    expiration_date: brDateToIso(i.expirationDate) || i.expirationDate || null,
    grace_period: i.gracePeriod ?? 0,
    coverage_percentage: i.coveragePercentage ?? 100,
  };
}

export function insuranceFromRow(row: any): any {
  return {
    id: row.id,
    name: row.name || '',
    cnpj: row.cnpj || '',
    register: row.register || '',
    type: row.type || 'health',
    status: row.status || 'active',
    phone: row.phone || '',
    email: row.email || '',
    contractDate: row.contract_date || '',
    expirationDate: row.expiration_date || '',
    gracePeriod: row.grace_period ?? 0,
    coveragePercentage: Number(row.coverage_percentage) ?? 100,
  };
}

// ─── Protocol (without steps — steps loaded separately) ──────────────────────

export function protocolToRow(p: any, ownerId: string): Record<string, any> {
  return {
    id: p.id,
    owner_id: ownerId,
    title: p.title || '',
    specialty: p.specialty || '',
    category: p.category || 'tratamento',
    last_update: brDateToIso(p.lastUpdate) || p.lastUpdate || new Date().toISOString().slice(0, 10),
    usage_count: p.usage ?? 0,
    is_active: p.active ?? true,
  };
}

export function protocolStepToRow(step: any, protocolId: string): Record<string, any> {
  return {
    protocol_id: protocolId,
    step_number: step.step,
    title: step.title || '',
    description: step.description || '',
    is_mandatory: step.mandatory ?? true,
  };
}

export function protocolFromRow(row: any, steps: any[] = []): any {
  return {
    id: row.id,
    title: row.title || '',
    specialty: row.specialty || '',
    category: row.category || 'tratamento',
    lastUpdate: row.last_update || '',
    steps: steps
      .filter((s: any) => s.protocol_id === row.id)
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((s: any) => ({
        step: s.step_number,
        title: s.title || '',
        description: s.description || '',
        mandatory: s.is_mandatory ?? true,
      })),
    usage: row.usage_count ?? 0,
    active: row.is_active ?? true,
  };
}

// ─── AuditEntry ──────────────────────────────────────────────────────────────

export function auditToRow(a: any, ownerId: string): Record<string, any> {
  return {
    id: a.id,
    owner_id: ownerId,
    user_name: a.user || '',
    user_role: a.userRole || '',
    action: a.action || 'read',
    module: a.module || '',
    description: a.description || '',
    ip_address: a.ipAddress !== '0.0.0.0' ? a.ipAddress : null,
    device: a.device || '',
    status: a.status || 'success',
  };
}

export function auditFromRow(row: any): any {
  return {
    id: row.id,
    timestamp: isoToBrDatetime(row.created_at),
    user: row.user_name || '',
    userRole: row.user_role || '',
    action: row.action || 'read',
    module: row.module || '',
    description: row.description || '',
    ipAddress: row.ip_address || '0.0.0.0',
    device: row.device || '',
    status: row.status || 'success',
  };
}

// ─── TelemedicineSession ─────────────────────────────────────────────────────

export function telemedicineToRow(t: any, ownerId: string): Record<string, any> {
  return {
    id: t.id,
    owner_id: ownerId,
    patient_name: t.patientName || '',
    doctor_name: t.doctorName || '',
    specialty: t.specialty || '',
    session_date: brDateToIso(t.date) || t.date || new Date().toISOString().slice(0, 10),
    session_time: t.time || '08:00',
    duration: t.duration ?? 30,
    link: t.link || '',
    status: t.status || 'scheduled',
    recording_consent: t.recordingConsent ?? false,
    appointment_id: t.appointmentId || null,
    notes: t.notes || null,
  };
}

export function telemedicineFromRow(row: any): any {
  return {
    id: row.id,
    patientName: row.patient_name || '',
    doctorName: row.doctor_name || '',
    specialty: row.specialty || '',
    date: row.session_date || '',
    time: row.session_time || '',
    duration: row.duration ?? 30,
    link: row.link || '',
    status: row.status || 'scheduled',
    recordingConsent: row.recording_consent ?? false,
    appointmentId: row.appointment_id || undefined,
    notes: row.notes || undefined,
  };
}

// ─── SystemUser ──────────────────────────────────────────────────────────────

export function systemUserToRow(u: any, ownerId: string): Record<string, any> {
  return {
    id: u.id,
    owner_id: ownerId,
    name: u.name || '',
    email: u.email || '',
    role: u.role || 'doctor',
    status: u.status || 'active',
    last_login: u.lastLogin ? new Date(brDateToIso(u.lastLogin) || u.lastLogin).toISOString() : null,
    phone: u.phone || null,
  };
}

export function systemUserFromRow(row: any): any {
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'doctor',
    status: row.status || 'active',
    lastLogin: row.last_login || '',
    createdAt: isoToBrDate(row.created_at),
    phone: row.phone || undefined,
  };
}

// ─── AppTemplate ─────────────────────────────────────────────────────────────

export function templateToRow(t: any, ownerId: string): Record<string, any> {
  return {
    id: t.id,
    owner_id: ownerId,
    name: t.name || '',
    category: t.category || 'prescription',
    specialty: t.specialty || '',
    is_favorite: t.isFavorite ?? false,
    usage_count: t.usageCount ?? 0,
    content: t.content || '',
  };
}

export function templateFromRow(row: any): any {
  return {
    id: row.id,
    name: row.name || '',
    category: row.category || 'prescription',
    specialty: row.specialty || '',
    isFavorite: row.is_favorite ?? false,
    usageCount: row.usage_count ?? 0,
    content: row.content || '',
    createdAt: isoToBrDate(row.created_at),
  };
}

// ─── CommunicationMessage ────────────────────────────────────────────────────

export function commMessageToRow(m: any, ownerId: string): Record<string, any> {
  return {
    id: m.id,
    owner_id: ownerId,
    type: m.type || 'reminder',
    patient_name: m.patientName || '',
    channel: m.channel || 'whatsapp',
    subject: m.subject || '',
    body: m.body || '',
    status: m.status || 'pending',
    scheduled_at: m.scheduledAt || null,
    sent_at: m.sentAt || null,
  };
}

export function commMessageFromRow(row: any): any {
  return {
    id: row.id,
    type: row.type || 'reminder',
    patientName: row.patient_name || '',
    channel: row.channel || 'whatsapp',
    subject: row.subject || '',
    body: row.body || '',
    status: row.status || 'pending',
    scheduledAt: row.scheduled_at || undefined,
    sentAt: row.sent_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export function campaignToRow(c: any, ownerId: string): Record<string, any> {
  return {
    id: c.id,
    owner_id: ownerId,
    name: c.name || '',
    type: c.type || 'custom',
    channel: c.channel || 'email',
    status: c.status || 'draft',
    total_recipients: c.totalRecipients ?? 0,
    sent: c.sent ?? 0,
    message: c.message || null,
  };
}

export function campaignFromRow(row: any): any {
  return {
    id: row.id,
    name: row.name || '',
    type: row.type || 'custom',
    channel: row.channel || 'email',
    status: row.status || 'draft',
    totalRecipients: row.total_recipients ?? 0,
    sent: row.sent ?? 0,
    message: row.message || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// ─── FileAttachment ──────────────────────────────────────────────────────────

export function fileAttachmentToRow(f: any, ownerId: string): Record<string, any> {
  // storagePath is MANDATORY for persisted files — never fall back to data/base64
  if (!f.storagePath) {
    throw new Error(
      `[fileAttachmentToRow] Tentativa de persistir anexo sem storagePath. ` +
      `Arquivo: "${f.name}". Certifique-se de que o upload ao Storage foi concluído antes de salvar.`,
    );
  }
  return {
    id: f.id,
    owner_id: ownerId,
    entity_type: f.entityType || 'patient',
    entity_id: f.entityId || null,
    name: f.name || '',
    mime_type: f.type || 'application/octet-stream',
    size_bytes: f.size ?? 0,
    storage_path: f.storagePath,   // PATH only — never URL, never base64
    bucket_type: f.bucketType || 'documents',
    uploaded_by: f.uploadedBy || '',
    // uploaded_by_id: UUID FK — use ownerId as uploader (same user in single-user clinic context)
    uploaded_by_id: ownerId,
  };
}

export function fileAttachmentFromRow(row: any): any {
  return {
    id: row.id,
    entityType: row.entity_type || 'patient',
    entityId: row.entity_id || '',
    name: row.name || '',
    type: row.mime_type || 'application/octet-stream',
    size: row.size_bytes ?? 0,
    storagePath: row.storage_path || '',   // PATH only — never URL
    bucketType: row.bucket_type || 'documents',
    uploadedBy: row.uploaded_by || '',
    uploadedAt: row.created_at || new Date().toISOString(),
    // NOTE: 'data' field is intentionally absent — use storagePath to resolve URL dynamically
  };
}

// ─── ClinicSettings (singleton) ──────────────────────────────────────────────

export function clinicSettingsToRow(s: any, ownerId: string): Record<string, any> {
  return {
    owner_id: ownerId,
    clinic_name: s.clinicName || '',
    cnpj: s.cnpj || '',
    address: s.address || '',
    phone: s.phone || '',
    email: s.email || '',
    // logo_path stores only the PATH in the avatars bucket — never a full URL
    logo_path: s.logoPath || null,
    instagram: s.instagram || null,
    patient_portal_url: s.patientPortalUrl || null,
    working_hours_start: s.workingHours?.start || '08:00',
    working_hours_end: s.workingHours?.end || '18:00',
    appointment_interval: s.appointmentInterval ?? 30,
    timezone: s.timezone || 'America/Sao_Paulo',
    notifications_email: s.notificationsEmail ?? true,
    notifications_sms: s.notificationsSMS ?? false,
    notifications_whatsapp: s.notificationsWhatsApp ?? false,
    theme: s.theme || 'light',
    language: s.language || 'pt-BR',
    auto_backup: s.autoBackup ?? true,
    backup_interval: s.backupInterval ?? 30,
  };
}

export function clinicSettingsFromRow(row: any): any {
  return {
    clinicName: row.clinic_name || '',
    cnpj: row.cnpj || '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    // logoPath = PATH relativo no bucket 'avatars' — gerado dinamicamente na exibição
    // logo_url foi removido do schema (migration v2)
    logoPath: row.logo_path || undefined,
    instagram: row.instagram || '',
    patientPortalUrl: row.patient_portal_url || '',
    workingHours: {
      start: row.working_hours_start || '08:00',
      end: row.working_hours_end || '18:00',
    },
    appointmentInterval: row.appointment_interval ?? 30,
    timezone: row.timezone || 'America/Sao_Paulo',
    notificationsEmail: row.notifications_email ?? true,
    notificationsSMS: row.notifications_sms ?? false,
    notificationsWhatsApp: row.notifications_whatsapp ?? false,
    theme: row.theme || 'light',
    language: row.language || 'pt-BR',
    autoBackup: row.auto_backup ?? true,
    backupInterval: row.backup_interval ?? 30,
  };
}