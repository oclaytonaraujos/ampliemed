/**
 * Base de dados de médicos - Sistema Multi-Clínica
 */

export interface Doctor {
  id: string;
  personalInfo: {
    name: string;
    cpf: string;
    birthDate: string;
    gender: 'M' | 'F' | 'Outro';
    photo?: string;
  };
  professionalInfo: {
    crm: string;
    crmUf: string;
    registroANS: string;
    specialties: string[];
    subspecialties?: string[];
    rqe?: string; // Registro de Qualificação de Especialista
  };
  contact: {
    email: string;
    phone: string;
    cellphone: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  digitalCertificate: {
    type: 'A1' | 'A3';
    issuer: string;
    validUntil: string;
    serialNumber: string;
  };
  clinics: DoctorClinicAssignment[];
  workSchedule: WorkSchedule[];
  financialInfo: {
    paymentModel: 'fixed' | 'percentage' | 'procedure' | 'mixed';
    fixedSalary?: number;
    percentage?: number; // % do faturamento
    procedureValues?: ProcedureHonorarium[];
  };
  performance: {
    goals: {
      monthlyConsultations?: number;
      monthlyRevenue?: number;
      patientSatisfaction?: number;
    };
    current: {
      consultationsThisMonth: number;
      revenueThisMonth: number;
      averageSatisfaction: number;
      averageConsultationTime: number; // em minutos
    };
  };
  status: 'active' | 'inactive' | 'vacation' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface DoctorClinicAssignment {
  clinicId: string;
  clinicName: string;
  role: 'owner' | 'employee' | 'partner' | 'volunteer';
  startDate: string;
  endDate?: string;
  consultationDuration: number; // minutos
  room?: string;
}

export interface WorkSchedule {
  clinicId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=domingo
  shifts: {
    start: string; // HH:mm
    end: string; // HH:mm
    consultationDuration: number;
    maxConsultationsPerShift?: number;
  }[];
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface ProcedureHonorarium {
  tussCode: string;
  value: number;
  percentage?: number; // % do valor do procedimento
}

export interface TimeOff {
  doctorId: string;
  type: 'vacation' | 'sick_leave' | 'conference' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  reason?: string;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
}

// Mock database
export const doctorsDatabase: Doctor[] = [];

// Utility Functions

export function getDoctorById(id: string): Doctor | undefined {
  return doctorsDatabase.find(doctor => doctor.id === id);
}

export function getDoctorsByClinic(clinicId: string): Doctor[] {
  return doctorsDatabase.filter(doctor =>
    doctor.status === 'active' &&
    doctor.clinics.some(clinic => clinic.clinicId === clinicId)
  );
}

export function getDoctorsBySpecialty(specialty: string): Doctor[] {
  return doctorsDatabase.filter(doctor =>
    doctor.status === 'active' &&
    doctor.professionalInfo.specialties.includes(specialty)
  );
}

export function isDoctorAvailable(
  doctorId: string,
  clinicId: string,
  date: Date,
  time: string
): boolean {
  const doctor = getDoctorById(doctorId);
  if (!doctor || doctor.status !== 'active') return false;

  // Check if doctor works at this clinic
  const clinicAssignment = doctor.clinics.find(c => c.clinicId === clinicId);
  if (!clinicAssignment) return false;

  // Check work schedule for the day
  const dayOfWeek = date.getDay();
  const schedule = doctor.workSchedule.find(
    s => s.clinicId === clinicId && s.dayOfWeek === dayOfWeek
  );
  
  if (!schedule || schedule.shifts.length === 0) return false;

  // Check if time falls within any shift
  return schedule.shifts.some(shift => {
    const [shiftStartHour, shiftStartMin] = shift.start.split(':').map(Number);
    const [shiftEndHour, shiftEndMin] = shift.end.split(':').map(Number);
    const [timeHour, timeMin] = time.split(':').map(Number);

    const shiftStart = shiftStartHour * 60 + shiftStartMin;
    const shiftEnd = shiftEndHour * 60 + shiftEndMin;
    const timeMinutes = timeHour * 60 + timeMin;

    return timeMinutes >= shiftStart && timeMinutes < shiftEnd;
  });
}

export function getAvailableSlots(
  doctorId: string,
  clinicId: string,
  date: Date
): string[] {
  const doctor = getDoctorById(doctorId);
  if (!doctor || doctor.status !== 'active') return [];

  const clinicAssignment = doctor.clinics.find(c => c.clinicId === clinicId);
  if (!clinicAssignment) return [];

  const dayOfWeek = date.getDay();
  const schedule = doctor.workSchedule.find(
    s => s.clinicId === clinicId && s.dayOfWeek === dayOfWeek
  );

  if (!schedule) return [];

  const slots: string[] = [];
  schedule.shifts.forEach(shift => {
    const [startHour, startMin] = shift.start.split(':').map(Number);
    const [endHour, endMin] = shift.end.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      currentMinutes += shift.consultationDuration;
    }
  });

  return slots;
}

export function calculateDoctorHonorarium(
  doctorId: string,
  tussCode: string,
  procedureValue: number
): number {
  const doctor = getDoctorById(doctorId);
  if (!doctor) return 0;

  const { paymentModel, fixedSalary, percentage, procedureValues } = doctor.financialInfo;

  switch (paymentModel) {
    case 'fixed':
      return 0; // Fixed salary is paid monthly, not per procedure

    case 'percentage':
      return procedureValue * (percentage || 0) / 100;

    case 'procedure':
      const procedureConfig = procedureValues?.find(p => p.tussCode === tussCode);
      if (!procedureConfig) return 0;
      
      if (procedureConfig.percentage) {
        return procedureValue * procedureConfig.percentage / 100;
      }
      return procedureConfig.value;

    case 'mixed':
      const percentageAmount = procedureValue * (percentage || 0) / 100;
      return percentageAmount; // Fixed salary paid separately

    default:
      return 0;
  }
}

export function getDoctorProductivitySummary(doctorId: string): {
  goalsAchievement: {
    consultations: number;
    revenue: number;
    satisfaction: number;
  };
  projections: {
    consultationsEndOfMonth: number;
    revenueEndOfMonth: number;
  };
  status: 'excellent' | 'good' | 'attention' | 'critical';
} {
  const doctor = getDoctorById(doctorId);
  
  if (!doctor) {
    return {
      goalsAchievement: { consultations: 0, revenue: 0, satisfaction: 0 },
      projections: { consultationsEndOfMonth: 0, revenueEndOfMonth: 0 },
      status: 'critical'
    };
  }

  const { goals, current } = doctor.performance;

  // Calculate goal achievement percentages
  const consultationsAchievement = goals.monthlyConsultations 
    ? (current.consultationsThisMonth / goals.monthlyConsultations) * 100 
    : 0;
  
  const revenueAchievement = goals.monthlyRevenue 
    ? (current.revenueThisMonth / goals.monthlyRevenue) * 100 
    : 0;
  
  const satisfactionAchievement = goals.patientSatisfaction 
    ? (current.averageSatisfaction / goals.patientSatisfaction) * 100 
    : 0;

  // Simple projection: assume current pace continues for rest of month
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectionMultiplier = daysInMonth / dayOfMonth;

  const projections = {
    consultationsEndOfMonth: Math.round(current.consultationsThisMonth * projectionMultiplier),
    revenueEndOfMonth: Math.round(current.revenueThisMonth * projectionMultiplier)
  };

  // Determine overall status
  const avgAchievement = (consultationsAchievement + revenueAchievement + satisfactionAchievement) / 3;
  let status: 'excellent' | 'good' | 'attention' | 'critical';
  
  if (avgAchievement >= 90) status = 'excellent';
  else if (avgAchievement >= 70) status = 'good';
  else if (avgAchievement >= 50) status = 'attention';
  else status = 'critical';

  return {
    goalsAchievement: {
      consultations: consultationsAchievement,
      revenue: revenueAchievement,
      satisfaction: satisfactionAchievement
    },
    projections,
    status
  };
}