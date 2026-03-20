/**
 * Base de dados de clínicas - Sistema Multi-Clínica
 */

export interface Clinic {
  id: string;
  name: string;
  cnpj: string;
  registroANS: string;
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  businessHours: BusinessHours[];
  rooms: ConsultationRoom[];
  specialties: string[];
  insurances: string[];
  financialInfo: {
    bankAccount: {
      bank: string;
      agency: string;
      account: string;
    };
    taxRegime: 'simples' | 'lucro_presumido' | 'lucro_real';
  };
  settings: {
    defaultConsultationDuration: number; // minutos
    allowOverlappingAppointments: boolean;
    requirePaymentBeforeConsultation: boolean;
    sendAppointmentReminders: boolean;
    reminderHoursBefore: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isOpen: boolean;
  shifts: {
    start: string;
    end: string;
  }[];
}

export interface ConsultationRoom {
  id: string;
  name: string;
  type: 'consultation' | 'exam' | 'procedure' | 'telemedicine';
  capacity: number;
  equipment: string[];
  available: boolean;
}

// Mock database
export const clinicsDatabase: Clinic[] = [];