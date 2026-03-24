import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { UserRole } from '../App';
import { getSupabase } from '../utils/supabaseClient';
import * as api from '../utils/api';
import { purgeLocalStorage } from '../utils/backupService';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces — single source of truth for all shared entities
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  name: string;
  email: string;
  crm: string;
  initials: string;
  role: UserRole;
  specialty: string;
  phone: string;
}

// ── Patient (rich, canonical) ────────────────────────────────────────────────
export interface Patient {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  age: number;
  gender: 'M' | 'F' | 'Outro';
  phone: string;
  phone2?: string;
  email: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
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
  status: 'active' | 'inactive';
  createdAt: string;
  lastVisit: string;
  totalVisits: number;
  responsible?: {
    name: string;
    cpf: string;
    phone: string;
    relationship: string;
  };
}

// ── ScheduleAppointment ───────────────────────────────────────────────────────
export interface ScheduleAppointment {
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
  type: 'presencial' | 'telemedicina';
  status: 'confirmado' | 'pendente' | 'cancelado' | 'realizado';
  color: string;
  room?: string;
  notes?: string;
  telemedLink?: string;
  consultationValue?: number;
  paymentType?: 'particular' | 'convenio';
  insuranceName?: string;
  paymentStatus?: 'pendente' | 'pago' | 'parcial' | 'vencido';
  paymentMethod?: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'convenio';
  installments?: number;
  paidAmount?: number;
  dueDate?: string;
  /** TUSS procedure code — added via migration 20260317000002.
   *  Required for procedure-model honorarium calculation in DoctorFinancialReport. */
  tussCode?: string;
}

// ── MedicalRecord ────────────────────────────────────────────────────────────
export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  type: 'Consulta' | 'Telemedicina' | 'Prescrição' | 'Atestado' | 'Retorno' | 'Urgência';
  cid10: string;
  chiefComplaint: string;
  conductPlan: string;
  anamnesis?: string;
  physicalExam?: string;
  prescriptions?: string;
  signed: boolean;
  signedAt?: string;
  createdAt: string;
}

// ── Exam ─────────────────────────────────────────────────────────────────────
export interface Exam {
  id: string;
  patientName: string;
  patientId?: string;
  examType: string;
  requestDate: string;
  resultDate: string | null;
  status: 'solicitado' | 'em_andamento' | 'concluido' | 'atrasado';
  laboratory: string;
  requestedBy: string;
  priority: 'normal' | 'urgente';
  tussCode?: string;
  notes?: string;
}

// ── Stock ─────────────────────────────────────────────────────────────────────
export interface StockItem {
  id: string;
  name: string;
  category: 'medicamento' | 'material' | 'equipamento';
  quantity: number;
  minQuantity: number;
  unit: string;
  batch: string;
  expiry: string;
  supplier: string;
  status: 'ok' | 'baixo' | 'critico' | 'vencido';
  location?: string;
  unitCost?: number;
}

// ── Queue ─────────────────────────────────────────────────────────────────────
export interface QueueEntry {
  id: string;
  ticketNumber: string;
  name: string;
  status: 'waiting' | 'called' | 'in-progress' | 'completed';
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

// ── Notifications ─────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: 'appointment' | 'payment' | 'document' | 'security' | 'info' | 'stock' | 'exam';
  title: string;
  message: string;
  time: string;
  read: boolean;
  urgent: boolean;
}

// ── Financial ─────────────────────────────────────────────────────────────────
export interface FinancialBilling {
  id: string;
  patient: string;
  insurance: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'sent';
  items: number;
}

export interface FinancialPayment {
  id: string;
  patient: string;
  type: string;
  date: string;
  amount: number;
  method: string;
  status: 'received' | 'pending' | 'overdue';
}

export interface FinancialReceivable {
  id: string;
  patient: string;
  description: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'received' | 'overdue';
}

export interface FinancialPayable {
  id: string;
  supplier: string;
  description: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}

// ── Professional ──────────────────────────────────────────────────────────────
export interface Professional {
  id: string;
  name: string;
  crm: string;
  crmUf: string;
  specialty: string;
  email: string;
  phone: string;
  cpf: string;
  digitalCertificate: 'A1' | 'A3' | 'none';
  certificateExpiry: string;
  status: 'active' | 'inactive';
  clinics: string[];
  createdAt: string;
  // ✅ Financial fields (added 2026-03-17)
  role?: 'doctor' | 'receptionist' | 'financial' | 'admin';
  paymentModel?: 'fixed' | 'percentage' | 'procedure' | 'mixed';
  fixedSalary?: number;
  revenuePercentage?: number;
  goalMonthlyConsultations?: number;
  goalMonthlyRevenue?: number;
  goalPatientSatisfaction?: number;
  consultationsThisMonth?: number;
  revenueThisMonth?: number;
  avgSatisfaction?: number;
  avgConsultationTime?: number;
  room?: string;
}

// ── Insurance ─────────────────────────────────────────────────────────────────
export interface Insurance {
  id: string;
  name: string;
  cnpj: string;
  register: string;
  type: 'health' | 'dental' | 'both';
  status: 'active' | 'inactive';
  phone: string;
  email: string;
  contractDate: string;
  expirationDate: string;
  gracePeriod: number;
  coveragePercentage: number;
}

// ── Protocol ──────────────────────────────────────────────────────────────────
export interface Protocol {
  id: string;
  title: string;
  specialty: string;
  category: 'diagnóstico' | 'tratamento' | 'emergência' | 'prevenção';
  lastUpdate: string;
  steps: { step: number; title: string; description: string; mandatory: boolean }[];
  usage: number;
  active: boolean;
}

// ── AuditEntry ────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'sign';
  module: string;
  description: string;
  ipAddress: string;
  device: string;
  status: 'success' | 'failed';
}

// ── TelemedicineSession ───────────────────────────────────────────────────────
export interface TelemedicineSession {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  link: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  recordingConsent: boolean;
  appointmentId?: string;
  notes?: string;
}

// ── SystemUser ────────────────────────────────────────────────────────────────
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  phone?: string;
}

// ── Template ──────────────────────────────────────────────────────────────────
export interface AppTemplate {
  id: string;
  name: string;
  category: 'prescription' | 'certificate' | 'record' | 'report';
  specialty: string;
  isFavorite: boolean;
  usageCount: number;
  content: string;
  createdAt: string;
}

// ── CommunicationMessage ──────────────────────────────────────────────────────
export interface CommunicationMessage {
  id: string;
  type: 'reminder' | 'campaign' | 'chatbot';
  patientName: string;
  channel: 'whatsapp' | 'sms' | 'email';
  subject: string;
  body: string;
  status: 'sent' | 'pending' | 'failed' | 'read';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

// ── Campaign ──────────────────────────────────────────────────────────────────
/** Persistent marketing/communication campaign.
 *  Stored in `communication_campaigns` table (migration 20260317000003).
 *  Replaces ephemeral React state previously in CommunicationModule. */
export interface Campaign {
  id: string;
  name: string;
  type: 'birthday' | 'followup' | 'custom';
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'active' | 'paused' | 'draft';
  totalRecipients: number;
  sent: number;
  message: string;
  createdAt: string;
}

// ── FileAttachment ────────────────────────────────────────────────────────────

/**
 * Arquivo local ainda não enviado ao Storage.
 * Usar apenas como estado temporário — NUNCA persistir.
 */
export interface LocalUploadFile {
  localId: string;
  file: File;
  /** URL temporária (blob:). Revogar com URL.revokeObjectURL() ao desmontar. */
  previewUrl: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Arquivo persistido no Supabase Storage.
 * storagePath = PATH relativo no bucket — NUNCA URL completa, NUNCA base64.
 */
export interface StoredFileAttachment {
  id: string;
  entityType: 'patient' | 'exam' | 'record' | 'appointment' | 'chat';
  entityId: string;
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  storagePath: string; // PATH relativo no bucket — único campo de arquivo persistido
  bucketType: 'avatars' | 'media' | 'documents' | 'chat';
  uploadedBy: string;
  uploadedAt: string;
}

/** Alias de compatibilidade — use StoredFileAttachment em código novo */
export type FileAttachment = StoredFileAttachment;

// ── ClinicSettings ────────────────────────────────────────────────────────────
export interface ClinicSettings {
  clinicName: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  /** PATH do logo no bucket 'avatars' — NUNCA URL completa */
  logoPath?: string;
  workingHours: { start: string; end: string };
  appointmentInterval: number;
  timezone: string;
  notificationsEmail: boolean;
  notificationsSMS: boolean;
  notificationsWhatsApp: boolean;
  theme: 'light' | 'dark';
  language: 'pt-BR';
  autoBackup: boolean;
  backupInterval: number;
}

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: '', cnpj: '', address: '', phone: '', email: '',
  workingHours: { start: '08:00', end: '18:00' }, appointmentInterval: 30,
  timezone: 'America/Sao_Paulo', notificationsEmail: true, notificationsSMS: false,
  notificationsWhatsApp: false, theme: 'light', language: 'pt-BR',
  autoBackup: true, backupInterval: 30,
};

// ─── Default Templates ────────────────────────────────────────────────────────
const defaultTemplates: AppTemplate[] = [
  { id: crypto.randomUUID(), name: 'Prescrição Anti-hipertensivo', category: 'prescription', specialty: 'Cardiologia', isFavorite: true, usageCount: 0, content: 'Losartana 50mg - 1 comprimido ao dia, pela manhã, por 30 dias.\nAtenolol 25mg - 1 comprimido ao dia, pela manhã, por 30 dias.', createdAt: '15/11/2025' },
  { id: crypto.randomUUID(), name: 'Atestado 3 dias', category: 'certificate', specialty: 'Geral', isFavorite: true, usageCount: 0, content: 'Atesto para os devidos fins que o(a) paciente [NOME] esteve sob meus cuidados profissionais e necessita de afastamento de suas atividades habituais pelo período de 3 (três) dias, a partir de [DATA].', createdAt: '10/12/2025' },
  { id: crypto.randomUUID(), name: 'Prontuário Consulta Pediátrica', category: 'record', specialty: 'Pediatria', isFavorite: false, usageCount: 0, content: 'CONSULTA PEDIÁTRICA\n\nQP: [Queixa]\nHDA: [História]\nExame Físico:\n- Peso: [X] kg\n- Altura: [X] cm\n- IMC: [X]\n- Temperatura: [X]°C\nHD: [Diagnóstico]\nConduta: [Plano]', createdAt: '05/01/2026' },
  { id: crypto.randomUUID(), name: 'Receita Antibiótico', category: 'prescription', specialty: 'Clínica Médica', isFavorite: true, usageCount: 0, content: 'Amoxicilina 500mg - 1 cápsula de 8/8 horas por 7 dias.\nTomar com água, durante ou após as refeições.', createdAt: '20/12/2025' },
  { id: crypto.randomUUID(), name: 'Relatório Cirúrgico Ortopedia', category: 'report', specialty: 'Ortopedia', isFavorite: false, usageCount: 0, content: 'RELATÓRIO CIRÚRGICO\n\nPaciente: [NOME]\nProcedimento: [DESCRIÇÃO]\nData: [DATA]\nAnestesia: [TIPO]\nDescrição: [DETALHES]', createdAt: '28/12/2025' },
  { id: crypto.randomUUID(), name: 'Atestado de Comparecimento', category: 'certificate', specialty: 'Geral', isFavorite: true, usageCount: 0, content: 'Atesto que o(a) paciente [NOME] compareceu a esta Unidade de Saúde no dia [DATA], para atendimento médico, no período de [HORA_INICIO] às [HORA_FIM].', createdAt: '02/01/2026' },
];

// ─── Default Protocols ────────────────────────────────────────────────────────
const defaultProtocols: Protocol[] = [
  {
    id: crypto.randomUUID(), title: 'Protocolo de Hipertensão Arterial', specialty: 'Cardiologia', category: 'tratamento',
    lastUpdate: '01/01/2026', usage: 0, active: true,
    steps: [
      { step: 1, title: 'Triagem Inicial', description: 'Aferir PA em ambos os braços, verificar histórico familiar', mandatory: true },
      { step: 2, title: 'Exames Laboratoriais', description: 'Solicitar: Glicemia, colesterol, HDL, LDL, triglicerídeos, creatinina', mandatory: true },
      { step: 3, title: 'Avaliação de Risco Cardiovascular', description: 'Aplicar escore de Framingham', mandatory: true },
      { step: 4, title: 'Orientações Dietéticas', description: 'Dieta DASH: redução de sódio, aumento de potássio', mandatory: false },
      { step: 5, title: 'Prescrição Medicamentosa', description: 'Iniciar com IECA ou BRA conforme guidelines ESC/ESH 2023', mandatory: true },
    ],
  },
  {
    id: crypto.randomUUID(), title: 'Protocolo Diabetes Mellitus Tipo 2', specialty: 'Endocrinologia', category: 'tratamento',
    lastUpdate: '15/12/2025', usage: 0, active: true,
    steps: [
      { step: 1, title: 'Diagnóstico Confirmatório', description: 'Glicemia jejum ≥ 126 mg/dL em 2 ocasiões ou HbA1c ≥ 6,5%', mandatory: true },
      { step: 2, title: 'Avaliação Inicial', description: 'Peso, IMC, PA, neuropatia, nefropatia, retinopatia', mandatory: true },
      { step: 3, title: 'Metas Terapêuticas', description: 'HbA1c < 7%, PA < 130/80 mmHg, LDL < 70 mg/dL', mandatory: true },
      { step: 4, title: 'Início de Tratamento', description: 'Metformina 500mg 2x/dia + orientação dietética + atividade física', mandatory: true },
      { step: 5, title: 'Monitoramento', description: 'HbA1c a cada 3 meses, perfil lipídico anual, microalbuminúria anual', mandatory: true },
    ],
  },
  {
    id: crypto.randomUUID(), title: 'Protocolo de Emergência — Dor Torácica', specialty: 'Cardiologia', category: 'emergência',
    lastUpdate: '10/01/2026', usage: 0, active: true,
    steps: [
      { step: 1, title: 'Triagem Imediata', description: 'ECG em 10 minutos, acesso venoso, monitorização cardíaca contínua', mandatory: true },
      { step: 2, title: 'Anamnese Dirigida', description: 'Característica da dor, irradiação, sintomas associados (dispneia, sudorese)', mandatory: true },
      { step: 3, title: 'Exames de Urgência', description: 'Troponina, CK-MB, D-dímero, RX tórax, ECG seriado', mandatory: true },
      { step: 4, title: 'Conduta Inicial SCA', description: 'AAS 300mg, Clopidogrel, anticoagulação, O2 se SpO2 < 94%', mandatory: true },
      { step: 5, title: 'Decisão Terapêutica', description: 'IAMCSST: cineangiocoronariografia em < 90 min ou trombólise', mandatory: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Context type
// ─────────────────────────────────────────────────────────────────────────────

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { email: string; password: string; name: string; role?: string; specialty?: string; crm?: string; phone?: string }) => Promise<boolean>;
  clinicSignup: (data: any) => Promise<any>;
  logout: () => void;
  updateCurrentUser: (data: Partial<AuthUser>) => void;

  // Loading state
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';

  // Patients
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'totalVisits'>) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  deletePatient: (id: string) => void;

  // Appointments
  appointments: ScheduleAppointment[];
  setAppointments: React.Dispatch<React.SetStateAction<ScheduleAppointment[]>>;

  // Medical Records
  medicalRecords: MedicalRecord[];
  setMedicalRecords: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
  addMedicalRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt'>) => MedicalRecord;
  updateMedicalRecord: (id: string, data: Partial<MedicalRecord>) => void;
  deleteMedicalRecord: (id: string) => void;

  // Exams
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;

  // Stock
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;

  // Queue
  queueEntries: QueueEntry[];
  setQueueEntries: React.Dispatch<React.SetStateAction<QueueEntry[]>>;

  // Notifications
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  addNotification: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  unreadNotificationCount: number;

  // Financial
  financialBillings: FinancialBilling[];
  setFinancialBillings: React.Dispatch<React.SetStateAction<FinancialBilling[]>>;
  financialPayments: FinancialPayment[];
  setFinancialPayments: React.Dispatch<React.SetStateAction<FinancialPayment[]>>;
  financialReceivables: FinancialReceivable[];
  setFinancialReceivables: React.Dispatch<React.SetStateAction<FinancialReceivable[]>>;
  financialPayables: FinancialPayable[];
  setFinancialPayables: React.Dispatch<React.SetStateAction<FinancialPayable[]>>;

  // Professionals
  professionals: Professional[];
  setProfessionals: React.Dispatch<React.SetStateAction<Professional[]>>;
  addProfessional: (p: Omit<Professional, 'id' | 'createdAt'>) => Professional;
  updateProfessional: (id: string, data: Partial<Professional>) => void;
  deleteProfessional: (id: string) => void;

  // Insurances
  insurances: Insurance[];
  setInsurances: React.Dispatch<React.SetStateAction<Insurance[]>>;
  addInsurance: (ins: Omit<Insurance, 'id'>) => Insurance;
  updateInsurance: (id: string, data: Partial<Insurance>) => void;
  deleteInsurance: (id: string) => void;

  // Protocols
  protocols: Protocol[];
  setProtocols: React.Dispatch<React.SetStateAction<Protocol[]>>;
  addProtocol: (p: Omit<Protocol, 'id'>) => Protocol;
  updateProtocol: (id: string, data: Partial<Protocol>) => void;
  deleteProtocol: (id: string) => void;

  // Audit
  auditLog: AuditEntry[];
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'ipAddress' | 'device'>) => void;

  // Telemedicine
  telemedicineSessions: TelemedicineSession[];
  setTelemedicineSessions: React.Dispatch<React.SetStateAction<TelemedicineSession[]>>;
  addTelemedicineSession: (s: Omit<TelemedicineSession, 'id'>) => TelemedicineSession;

  // System Users
  systemUsers: SystemUser[];
  setSystemUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  addSystemUser: (u: Omit<SystemUser, 'id' | 'createdAt'>) => SystemUser;
  updateSystemUser: (id: string, data: Partial<SystemUser>) => void;
  deleteSystemUser: (id: string) => void;

  // Templates
  appTemplates: AppTemplate[];
  setAppTemplates: React.Dispatch<React.SetStateAction<AppTemplate[]>>;

  // Communication Messages
  communicationMessages: CommunicationMessage[];
  setCommunicationMessages: React.Dispatch<React.SetStateAction<CommunicationMessage[]>>;
  addCommunicationMessage: (msg: Omit<CommunicationMessage, 'id' | 'createdAt'>) => CommunicationMessage;

  // Campaigns (persistent — communication_campaigns table)
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  addCampaign: (c: Omit<Campaign, 'id' | 'createdAt'>) => Campaign;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  // File Attachments
  fileAttachments: FileAttachment[];
  addFileAttachment: (attachment: Omit<FileAttachment, 'id' | 'uploadedAt'>) => FileAttachment;
  deleteFileAttachment: (id: string) => void;
  getAttachmentsByEntity: (entityType: FileAttachment['entityType'], entityId: string) => FileAttachment[];

  // Clinic Settings
  clinicSettings: ClinicSettings;
  updateClinicSettings: (data: Partial<ClinicSettings>) => void;

  // Navigation (clinic selector)
  selectedClinicId: string;
  setSelectedClinicId: React.Dispatch<React.SetStateAction<string>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Debounced sync helper — now syncs to PostgreSQL tables via api.syncXxx()
// ─────────────────────────────────────────────────────────────────────────────

type SyncFn = (data: any) => Promise<void>;

function useDebouncedSync() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const syncStatusRef = useRef<(s: 'idle' | 'syncing' | 'synced' | 'error') => void>(() => {});

  const scheduleSync = useCallback((key: string, syncFn: SyncFn, getData: () => any) => {
    const existing = timersRef.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        syncStatusRef.current('syncing');
        const data = getData();
        await syncFn(data);
        const count = Array.isArray(data) ? data.length : 1;
        console.log(`[Sync] ✓ ${key} salvo no Supabase (${count} registro${count !== 1 ? 's' : ''})`);
        syncStatusRef.current('synced');
        setTimeout(() => syncStatusRef.current('idle'), 2000);
      } catch (err) {
        console.error(`[Sync] ✗ Falha ao salvar ${key}:`, err);
        syncStatusRef.current('error');
      }
      timersRef.current.delete(key);
    }, 800);

    timersRef.current.set(key, timer);
  }, []);

  return { scheduleSync, syncStatusRef };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Purge any legacy localStorage data on mount ────────────────────────────
  useEffect(() => {
    purgeLocalStorage();
  }, []);

  // ── Loading / sync state ──────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const dataLoadedRef = useRef(false);

  const { scheduleSync, syncStatusRef } = useDebouncedSync();
  syncStatusRef.current = setSyncStatus;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // ── Core Entities (start empty, load from Supabase tables) ─────────────────
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ── Financial ─────────────────────────────────────────────────────────────
  const [financialBillings, setFinancialBillings] = useState<FinancialBilling[]>([]);
  const [financialPayments, setFinancialPayments] = useState<FinancialPayment[]>([]);
  const [financialReceivables, setFinancialReceivables] = useState<FinancialReceivable[]>([]);
  const [financialPayables, setFinancialPayables] = useState<FinancialPayable[]>([]);

  // ── Other Entities ────────────────────────────────────────────────────────
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [telemedicineSessions, setTelemedicineSessions] = useState<TelemedicineSession[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [appTemplates, setAppTemplates] = useState<AppTemplate[]>([]);
  const [communicationMessages, setCommunicationMessages] = useState<CommunicationMessage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);

  const [selectedClinicId, setSelectedClinicId] = useState('');

  // ── Refs for current values (used by debounced sync) ──────────────────────
  const patientsRef = useRef(patients); patientsRef.current = patients;
  const appointmentsRef = useRef(appointments); appointmentsRef.current = appointments;
  const medicalRecordsRef = useRef(medicalRecords); medicalRecordsRef.current = medicalRecords;
  const examsRef = useRef(exams); examsRef.current = exams;
  const stockItemsRef = useRef(stockItems); stockItemsRef.current = stockItems;
  const queueEntriesRef = useRef(queueEntries); queueEntriesRef.current = queueEntries;
  const notificationsRef = useRef(notifications); notificationsRef.current = notifications;
  const financialBillingsRef = useRef(financialBillings); financialBillingsRef.current = financialBillings;
  const financialPaymentsRef = useRef(financialPayments); financialPaymentsRef.current = financialPayments;
  const financialReceivablesRef = useRef(financialReceivables); financialReceivablesRef.current = financialReceivables;
  const financialPayablesRef = useRef(financialPayables); financialPayablesRef.current = financialPayables;
  const professionalsRef = useRef(professionals); professionalsRef.current = professionals;
  const insurancesRef = useRef(insurances); insurancesRef.current = insurances;
  const protocolsRef = useRef(protocols); protocolsRef.current = protocols;
  const auditLogRef = useRef(auditLog); auditLogRef.current = auditLog;
  const telemedicineSessionsRef = useRef(telemedicineSessions); telemedicineSessionsRef.current = telemedicineSessions;
  const systemUsersRef = useRef(systemUsers); systemUsersRef.current = systemUsers;
  const appTemplatesRef = useRef(appTemplates); appTemplatesRef.current = appTemplates;
  const communicationMessagesRef = useRef(communicationMessages); communicationMessagesRef.current = communicationMessages;
  const campaignsRef = useRef(campaigns); campaignsRef.current = campaigns;
  const fileAttachmentsRef = useRef(fileAttachments); fileAttachmentsRef.current = fileAttachments;
  const clinicSettingsRef = useRef(clinicSettings); clinicSettingsRef.current = clinicSettings;

  // ── Check existing session on mount ────────────────────────────────────────
  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          api.setAccessToken(session.access_token);
          const meta = session.user?.user_metadata || {};
          const name = meta.name || session.user?.email?.split('@')[0] || 'Usuário';
          const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

          setCurrentUser({
            name,
            email: session.user?.email || '',
            crm: meta.crm || '',
            initials,
            role: (meta.role as UserRole) || 'admin',
            specialty: meta.specialty || '',
            phone: meta.phone || '',
          });
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('[Auth] Session check failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();

    // Listen for auth state changes
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        api.setAccessToken(null);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } else if (session?.access_token) {
        api.setAccessToken(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load all data from Supabase TABLES when authenticated ──────────────────
  useEffect(() => {
    if (!isAuthenticated || dataLoadedRef.current) return;

    async function loadData() {
      try {
        console.log('[Data] Loading all data from Supabase tables...');

        // Load directly from Supabase tables.
        // KV migration removed: KV store is confirmed empty and the system
        // runs entirely on Supabase tables — no migration needed.
        const data = await api.loadAllData();

        setPatients(data.patients);
        // Limpar cores antigas dos appointments (migração)
        const cleanedAppointments = data.appointments.map((apt: any) => ({
          ...apt,
          color: ''
        }));
        setAppointments(cleanedAppointments);
        setMedicalRecords(data.medicalRecords);
        setExams(data.exams);
        setStockItems(data.stockItems);
        setQueueEntries(data.queueEntries);
        setNotifications(data.notifications);
        setFinancialBillings(data.financialBillings);
        setFinancialPayments(data.financialPayments);
        setFinancialReceivables(data.financialReceivables);
        setFinancialPayables(data.financialPayables);
        setProfessionals(data.professionals);
        setInsurances(data.insurances);
        setProtocols(data.protocols.length > 0 ? data.protocols : defaultProtocols);
        setAuditLog(data.auditLog);
        setTelemedicineSessions(data.telemedicineSessions);
        setSystemUsers(data.systemUsers);
        setAppTemplates(data.appTemplates.length > 0 ? data.appTemplates : defaultTemplates);
        setCommunicationMessages(data.communicationMessages);
        setCampaigns(data.campaigns);
        setFileAttachments(data.fileAttachments);
        setClinicSettings(data.clinicSettings || DEFAULT_SETTINGS);

        dataLoadedRef.current = true;
        console.log('[Data] All tables loaded successfully');
      } catch (err) {
        console.error('[Data] Failed to load tables:', err);
        setProtocols(defaultProtocols);
        setAppTemplates(defaultTemplates);
        setClinicSettings(DEFAULT_SETTINGS);
        dataLoadedRef.current = true;
      }
    }

    loadData();
  }, [isAuthenticated]);

  // ── Auto-sync to Supabase tables (debounced, per collection) ───────────────

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('patients', api.syncPatients, () => patientsRef.current);
  }, [patients, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('appointments', api.syncAppointments, () => appointmentsRef.current);
  }, [appointments, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('medical_records', api.syncMedicalRecords, () => medicalRecordsRef.current);
  }, [medicalRecords, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('exams', api.syncExams, () => examsRef.current);
  }, [exams, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('stock', api.syncStockItems, () => stockItemsRef.current);
  }, [stockItems, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('queue', api.syncQueueEntries, () => queueEntriesRef.current);
  }, [queueEntries, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('notifications', api.syncNotifications, () => notificationsRef.current);
  }, [notifications, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('billings', api.syncBillings, () => financialBillingsRef.current);
  }, [financialBillings, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('payments', api.syncPayments, () => financialPaymentsRef.current);
  }, [financialPayments, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('receivables', api.syncReceivables, () => financialReceivablesRef.current);
  }, [financialReceivables, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('payables', api.syncPayables, () => financialPayablesRef.current);
  }, [financialPayables, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('professionals', api.syncProfessionals, () => professionalsRef.current);
  }, [professionals, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('insurances', api.syncInsurances, () => insurancesRef.current);
  }, [insurances, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('protocols', api.syncProtocols, () => protocolsRef.current);
  }, [protocols, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('audit_log', api.syncAuditLog, () => auditLogRef.current);
  }, [auditLog, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('telemedicine', api.syncTelemedicine, () => telemedicineSessionsRef.current);
  }, [telemedicineSessions, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('system_users', api.syncSystemUsers, () => systemUsersRef.current);
  }, [systemUsers, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('templates', api.syncTemplates, () => appTemplatesRef.current);
  }, [appTemplates, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('comm_messages', api.syncCommMessages, () => communicationMessagesRef.current);
  }, [communicationMessages, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('campaigns', api.syncCampaigns, () => campaignsRef.current);
  }, [campaigns, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('file_attachments', api.syncFileAttachments, () => fileAttachmentsRef.current);
  }, [fileAttachments, scheduleSync]);

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    scheduleSync('clinic_settings', api.syncClinicSettings, () => clinicSettingsRef.current);
  }, [clinicSettings, scheduleSync]);

  // ── Auto-notifications: monitor critical events ───────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkCriticalEvents = () => {
      const today = new Date();

      // 1. Critical stock items
      stockItems.forEach(item => {
        if (item.status === 'critico' || item.status === 'vencido') {
          const notifId = `stock_alert_${item.id}`;
          const alreadyNotified = notifications.some(n => n.id === notifId);
          if (!alreadyNotified) {
            setNotifications(prev => [{
              id: notifId,
              type: 'stock' as const,
              title: item.status === 'vencido' ? 'Item vencido no estoque' : 'Estoque crítico',
              message: `${item.name} — ${item.status === 'vencido' ? 'produto vencido' : `apenas ${item.quantity} ${item.unit} restantes`}`,
              time: 'Agora',
              read: false,
              urgent: true,
            }, ...prev.filter(n => n.id !== notifId).slice(0, 49)]);
          }
        }
      });

      // 2. Overdue financial receivables
      financialReceivables.forEach(rec => {
        if (rec.status === 'overdue') {
          const notifId = `recv_overdue_${rec.id}`;
          const alreadyNotified = notifications.some(n => n.id === notifId);
          if (!alreadyNotified) {
            setNotifications(prev => [{
              id: notifId,
              type: 'payment' as const,
              title: 'Recebimento vencido',
              message: `${rec.patient} — R$ ${rec.amount.toFixed(2)} venceu em ${rec.dueDate}`,
              time: 'Agora',
              read: false,
              urgent: false,
            }, ...prev.filter(n => n.id !== notifId).slice(0, 49)]);
          }
        }
      });

      // 3. Upcoming appointments today
      const todayStr = today.toISOString().split('T')[0];
      const todayAppts = appointments.filter(a => a.date === todayStr && a.status === 'confirmado');
      if (todayAppts.length > 0) {
        const notifId = `appt_today_${todayStr}`;
        const alreadyNotified = notifications.some(n => n.id === notifId);
        if (!alreadyNotified) {
          setNotifications(prev => [{
            id: notifId,
            type: 'appointment' as const,
            title: 'Consultas de hoje',
            message: `Você tem ${todayAppts.length} consulta(s) confirmada(s) para hoje.`,
            time: 'Agora',
            read: false,
            urgent: false,
          }, ...prev.filter(n => n.id !== notifId).slice(0, 49)]);
        }
      }
    };

    const timer = setTimeout(checkCriticalEvents, 2000);
    const interval = setInterval(checkCriticalEvents, 5 * 60 * 1000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, stockItems.length, financialReceivables.length, appointments.length]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const supabase = getSupabase();

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        if (signInError.message.includes('Invalid login') || signInError.message.includes('invalid_credentials')) {
          try {
            await api.signup({ email, password, name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) });
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
            if (retryError) {
              console.error('[Auth] Login retry failed:', retryError.message);
              return false;
            }
            if (retryData.session) {
              api.setAccessToken(retryData.session.access_token);
              const meta = retryData.session.user?.user_metadata || {};
              const name = meta.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              setCurrentUser({ name, email, crm: meta.crm || '', initials, role: (meta.role as UserRole) || 'admin', specialty: meta.specialty || '', phone: meta.phone || '' });
              setIsAuthenticated(true);
              dataLoadedRef.current = false;
              const entry: AuditEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toLocaleString('pt-BR'),
                user: name, userRole: 'admin', action: 'login',
                module: 'Sistema', description: `Primeiro login (auto-signup): ${email}`,
                ipAddress: '0.0.0.0', device: 'Web Browser', status: 'success',
              };
              setAuditLog(prev => [entry, ...prev.slice(0, 999)]);
              return true;
            }
          } catch (signupErr) {
            console.error('[Auth] Auto-signup failed:', signupErr);
            return false;
          }
        }
        console.error('[Auth] Login failed:', signInError.message);
        return false;
      }

      if (signInData.session) {
        api.setAccessToken(signInData.session.access_token);
        const meta = signInData.session.user?.user_metadata || {};
        const name = meta.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const user: AuthUser = { name, email, crm: meta.crm || '', initials, role: (meta.role as UserRole) || 'admin', specialty: meta.specialty || '', phone: meta.phone || '' };
        setCurrentUser(user);
        setIsAuthenticated(true);
        dataLoadedRef.current = false;
        const entry: AuditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleString('pt-BR'),
          user: name, userRole: user.role, action: 'login',
          module: 'Sistema', description: `Login realizado: ${email}`,
          ipAddress: '0.0.0.0', device: 'Web Browser', status: 'success',
        };
        setAuditLog(prev => [entry, ...prev.slice(0, 999)]);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[Auth] Unexpected login error:', err);
      return false;
    }
  };

  const signup = async (data: { email: string; password: string; name: string; role?: string; specialty?: string; crm?: string; phone?: string }): Promise<boolean> => {
    try {
      const supabase = getSupabase();

      // Use Edge Function to create user (auto-confirms email via service_role_key)
      await api.signup(data);

      // Sign in immediately after signup
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });

      if (signInError) {
        console.error('[Auth] Sign-in after signup failed:', signInError.message);
        // If sign-in fails, it might be because the user already existed
        if (signInError.message.includes('Invalid login')) {
          throw new Error('Conta criada mas não foi possível fazer login. Tente fazer login manualmente.');
        }
        return false;
      }

      if (signInData.session) {
        api.setAccessToken(signInData.session.access_token);
        const meta = signInData.session.user?.user_metadata || {};
        const name = meta.name || data.name || data.email.split('@')[0];
        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const user: AuthUser = { name, email: data.email, crm: meta.crm || data.crm || '', initials, role: (meta.role as UserRole) || 'admin', specialty: meta.specialty || data.specialty || '', phone: meta.phone || data.phone || '' };
        setCurrentUser(user);
        setIsAuthenticated(true);
        dataLoadedRef.current = false;
        const entry: AuditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleString('pt-BR'),
          user: name, userRole: user.role, action: 'create',
          module: 'Sistema', description: `Conta criada: ${data.email}`,
          ipAddress: '0.0.0.0', device: 'Web Browser', status: 'success',
        };
        setAuditLog(prev => [entry, ...prev.slice(0, 999)]);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[Auth] Unexpected signup error:', err);
      throw err;
    }
  };

  const clinicSignup = async (data: any) => {
    try {
      console.log('[Auth] Clinic signup started:', data.clinicName);
      
      // Call the Edge Function to register clinic + admin
      const result = await api.clinicSignup(data);
      
      // The Edge Function should have:
      // 1. Created the auth user
      // 2. Created the clinic
      // 3. Created clinic_memberships with role 'admin'
      
      // Now sign in with the admin email and password
      const supabase = getSupabase();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        console.error('[Auth] Sign-in after clinic signup failed:', signInError.message);
        throw new Error('Clínica criada, mas não foi possível fazer login. Tente novamente.');
      }

      if (signInData.session) {
        api.setAccessToken(signInData.session.access_token);
        const meta = signInData.session.user?.user_metadata || {};
        const adminName = meta.name || 'Administrador';
        const initials = adminName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        
        // Set current user as clinic admin
        const user: AuthUser = {
          name: adminName,
          email: data.email,
          crm: '',
          initials,
          role: 'admin',
          specialty: data.specialty || '',
          phone: data.phone || '',
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        dataLoadedRef.current = false;

        const entry: AuditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleString('pt-BR'),
          user: adminName,
          userRole: 'admin',
          action: 'create',
          module: 'Sistema',
          description: `Clínica registrada: ${data.clinicName} (ID: ${result.clinic?.id || 'N/A'})`,
          ipAddress: '0.0.0.0',
          device: 'Web Browser',
          status: 'success',
        };
        
        setAuditLog(prev => [entry, ...prev.slice(0, 999)]);
        
        console.log(`[Auth] Clinic signup complete: ${data.clinicName}`);
        return result;
      }

      throw new Error('Nenhuma sessão após registro da clínica');
    } catch (err: any) {
      console.error('[Auth] Clinic signup error:', err);
      throw err;
    }
  };

  const updateCurrentUser = useCallback((data: Partial<AuthUser>) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      api.updateProfile(data).catch(err => console.error('[Auth] Profile update failed:', err));
      return updated;
    });
  }, []);

  const logout = async () => {
    if (currentUser) {
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString('pt-BR'),
        user: currentUser.name, userRole: currentUser.role, action: 'logout',
        module: 'Sistema', description: `Logout realizado`,
        ipAddress: '0.0.0.0', device: 'Web Browser', status: 'success',
      };
      setAuditLog(prev => [entry, ...prev.slice(0, 999)]);
      // Save audit immediately before logout
      try {
        await api.syncAuditLog([...auditLog, entry].slice(0, 1000));
      } catch { /* best effort */ }
    }

    const supabase = getSupabase();
    await supabase.auth.signOut();
    api.setAccessToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    dataLoadedRef.current = false;

    // Reset all state
    setPatients([]);
    setAppointments([]);
    setMedicalRecords([]);
    setExams([]);
    setStockItems([]);
    setQueueEntries([]);
    setNotifications([]);
    setFinancialBillings([]);
    setFinancialPayments([]);
    setFinancialReceivables([]);
    setFinancialPayables([]);
    setProfessionals([]);
    setInsurances([]);
    setProtocols([]);
    setAuditLog([]);
    setTelemedicineSessions([]);
    setSystemUsers([]);
    setAppTemplates([]);
    setCommunicationMessages([]);
    setCampaigns([]);
    setFileAttachments([]);
    setClinicSettings(DEFAULT_SETTINGS);

    purgeLocalStorage();
  };

  // ── Patient helpers (now using UUID) ──────────────────────────────────────
  const addPatient = (data: Omit<Patient, 'id' | 'createdAt' | 'totalVisits'>): Patient => {
    const newPatient: Patient = { ...data, id: crypto.randomUUID(), createdAt: new Date().toLocaleDateString('pt-BR'), totalVisits: 0, lastVisit: data.lastVisit || '-' };
    setPatients((prev) => [...prev, newPatient]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Pacientes', description: `Paciente criado: ${data.name}`, status: 'success' });
    return newPatient;
  };
  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Pacientes', description: `Paciente atualizado: ID ${id}`, status: 'success' });
  };
  const deletePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Pacientes', description: `Paciente removido: ID ${id}`, status: 'success' });
  };

  // ── Medical Record helpers ────────────────────────────────────────────────
  const addMedicalRecord = (data: Omit<MedicalRecord, 'id' | 'createdAt'>): MedicalRecord => {
    const r: MedicalRecord = { ...data, id: crypto.randomUUID(), createdAt: new Date().toLocaleDateString('pt-BR') };
    setMedicalRecords(prev => [r, ...prev]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Prontuários', description: `Prontuário criado para ${data.patientName}`, status: 'success' });
    return r;
  };
  const updateMedicalRecord = (id: string, data: Partial<MedicalRecord>) => {
    setMedicalRecords(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Prontuários', description: `Prontuário atualizado: ID ${id}`, status: 'success' });
  };
  const deleteMedicalRecord = (id: string) => {
    setMedicalRecords(prev => prev.filter(r => r.id !== id));
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Prontuários', description: `Prontuário removido: ID ${id}`, status: 'success' });
  };

  // ── Professional helpers ──────────────────────────────────────────────────
  const addProfessional = (data: Omit<Professional, 'id' | 'createdAt'>): Professional => {
    const p: Professional = { ...data, id: crypto.randomUUID(), createdAt: new Date().toLocaleDateString('pt-BR') };
    setProfessionals(prev => [...prev, p]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Profissionais', description: `Profissional criado: ${data.name}`, status: 'success' });
    return p;
  };
  const updateProfessional = (id: string, data: Partial<Professional>) => setProfessionals(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  const deleteProfessional = (id: string) => setProfessionals(prev => prev.filter(p => p.id !== id));

  // ── Insurance helpers ─────────────────────────────────────────────────────
  const addInsurance = (data: Omit<Insurance, 'id'>): Insurance => {
    const ins: Insurance = { ...data, id: crypto.randomUUID() };
    setInsurances(prev => [...prev, ins]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Convênios', description: `Convênio criado: ${data.name}`, status: 'success' });
    return ins;
  };
  const updateInsurance = (id: string, data: Partial<Insurance>) => setInsurances(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  const deleteInsurance = (id: string) => setInsurances(prev => prev.filter(i => i.id !== id));

  // ── Protocol helpers ──────────────────────────────────────────────────────
  const addProtocol = (data: Omit<Protocol, 'id'>): Protocol => {
    const p: Protocol = { ...data, id: crypto.randomUUID() };
    setProtocols(prev => [...prev, p]);
    return p;
  };
  const updateProtocol = (id: string, data: Partial<Protocol>) => setProtocols(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  const deleteProtocol = (id: string) => setProtocols(prev => prev.filter(p => p.id !== id));

  // ── Audit helpers ─────────────────────────────────────────────────────────
  const addAuditEntry = (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'ipAddress' | 'device'>) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString('pt-BR'),
      ipAddress: '0.0.0.0',
      device: 'Web Browser',
    };
    setAuditLog(prev => [newEntry, ...prev.slice(0, 999)]);
  };

  // ── Telemedicine helpers ──────────────────────────────────────────────────
  const addTelemedicineSession = (data: Omit<TelemedicineSession, 'id'>): TelemedicineSession => {
    const s: TelemedicineSession = { ...data, id: crypto.randomUUID() };
    setTelemedicineSessions(prev => [...prev, s]);
    return s;
  };

  // ── Communication helpers ─────────────────────────────────────────────────
  const addCommunicationMessage = (data: Omit<CommunicationMessage, 'id' | 'createdAt'>): CommunicationMessage => {
    const msg: CommunicationMessage = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setCommunicationMessages(prev => [msg, ...prev]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Comunicação', description: `Mensagem para ${data.patientName} via ${data.channel}`, status: 'success' });
    return msg;
  };

  // ── Campaign helpers ──────────────────────────────────────────────────────
  const addCampaign = (data: Omit<Campaign, 'id' | 'createdAt'>): Campaign => {
    const c: Campaign = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setCampaigns(prev => [c, ...prev]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Campanhas', description: `Campanha criada: ${data.name}`, status: 'success' });
    return c;
  };
  const updateCampaign = (id: string, data: Partial<Campaign>) =>
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteCampaign = (id: string) =>
    setCampaigns(prev => prev.filter(c => c.id !== id));

  // ── File Attachment helpers ────────────────────────────────────────────────
  const addFileAttachment = (data: Omit<FileAttachment, 'id' | 'uploadedAt'>): FileAttachment => {
    const f: FileAttachment = { ...data, id: crypto.randomUUID(), uploadedAt: new Date().toISOString() };
    setFileAttachments(prev => [...prev, f]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: data.entityType, description: `Arquivo: ${data.name}`, status: 'success' });
    return f;
  };
  const deleteFileAttachment = (id: string) => {
    // Capture attachment BEFORE removing from state so we still have storagePath/bucketType
    const attachment = fileAttachmentsRef.current.find(f => f.id === id);

    // Remove from in-memory state (scheduleSync will also clean the DB row via upsert diff)
    setFileAttachments(prev => prev.filter(f => f.id !== id));

    addAuditEntry({
      user: currentUser?.name || 'Sistema',
      userRole: currentUser?.role || 'admin',
      action: 'delete',
      module: 'files',
      description: `Arquivo removido: ${attachment?.name || id}`,
      status: 'success',
    });

    // Atomic server-side cleanup: delete DB record + physical Storage file in one call
    // Uses fast-path (storagePath + bucketType provided) to avoid an extra DB lookup
    if (attachment?.storagePath) {
      api.deleteFileAttachmentRecord(
        id,
        attachment.storagePath,
        attachment.bucketType as api.BucketType,
      ).catch(err =>
        console.error(`[FileAttachment] Server-side cleanup failed for ${id} (non-fatal):`, err),
      );
    }
  };
  const getAttachmentsByEntity = (entityType: FileAttachment['entityType'], entityId: string) =>
    fileAttachments.filter(f => f.entityType === entityType && f.entityId === entityId);

  // ── Clinic Settings helpers ────────────────────────────────────────────────
  const updateClinicSettings = (data: Partial<ClinicSettings>) =>
    setClinicSettings(prev => ({ ...prev, ...data }));

  // ── System User helpers ───────────────────────────────────────────────────
  const addSystemUser = (data: Omit<SystemUser, 'id' | 'createdAt'>): SystemUser => {
    const u: SystemUser = { ...data, id: crypto.randomUUID(), createdAt: new Date().toLocaleDateString('pt-BR') };
    setSystemUsers(prev => [...prev, u]);
    return u;
  };
  const updateSystemUser = (id: string, data: Partial<SystemUser>) => setSystemUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  const deleteSystemUser = (id: string) => setSystemUsers(prev => prev.filter(u => u.id !== id));

  // ── Notification helpers ──────────────────────────────────────────────────
  const addNotification = (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => {
    const newNotif: AppNotification = { ...n, id: crypto.randomUUID(), time: 'Agora', read: false };
    setNotifications((prev) => [newNotif, ...prev]);
  };
  const markNotificationRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllNotificationsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const deleteNotification = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={{
      isAuthenticated, currentUser, login, signup, clinicSignup, logout, updateCurrentUser,
      isLoading, syncStatus,
      patients, setPatients, addPatient, updatePatient, deletePatient,
      appointments, setAppointments,
      medicalRecords, setMedicalRecords, addMedicalRecord, updateMedicalRecord, deleteMedicalRecord,
      exams, setExams,
      stockItems, setStockItems,
      queueEntries, setQueueEntries,
      notifications, setNotifications, addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification, unreadNotificationCount,
      financialBillings, setFinancialBillings,
      financialPayments, setFinancialPayments,
      financialReceivables, setFinancialReceivables,
      financialPayables, setFinancialPayables,
      professionals, setProfessionals, addProfessional, updateProfessional, deleteProfessional,
      insurances, setInsurances, addInsurance, updateInsurance, deleteInsurance,
      protocols, setProtocols, addProtocol, updateProtocol, deleteProtocol,
      auditLog, addAuditEntry,
      telemedicineSessions, setTelemedicineSessions, addTelemedicineSession,
      systemUsers, setSystemUsers, addSystemUser, updateSystemUser, deleteSystemUser,
      appTemplates, setAppTemplates,
      communicationMessages, setCommunicationMessages, addCommunicationMessage,
      campaigns, setCampaigns, addCampaign, updateCampaign, deleteCampaign,
      fileAttachments, addFileAttachment, deleteFileAttachment, getAttachmentsByEntity,
      clinicSettings, updateClinicSettings,
      selectedClinicId, setSelectedClinicId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}