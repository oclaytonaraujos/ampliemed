import { describe, it, expect } from 'vitest';
import {
  patientToRow,
  patientFromRow,
  appointmentToRow,
  appointmentFromRow,
} from '../dataMappers';
import type { PatientInput, AppointmentInput } from '../../types';

describe('Data Mappers', () => {
  describe('Patient Mappers', () => {
    const mockPatientInput: PatientInput = {
      id: '1',
      name: 'João Silva',
      cpf: '123.456.789-00',
      rg: '1234567',
      birthDate: '01/01/1990',
      age: 34,
      gender: 'M',
      phone: '(11) 98765-4321',
      email: 'joao@example.com',
      address: {
        cep: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      motherName: 'Maria Silva',
      maritalStatus: 'married',
      occupation: 'Engineer',
      insurance: 'Unimed',
      lgpdConsent: true,
      status: 'active',
      totalVisits: 5,
    };

    it('should convert PatientInput to PatientRow', () => {
      const row = patientToRow(mockPatientInput, 'clinic-1');

      expect(row.id).toBe('1');
      expect(row.owner_id).toBe('clinic-1');
      expect(row.name).toBe('João Silva');
      expect(row.cpf).toBe('123.456.789-00');
      expect(row.address_street).toBe('Avenida Paulista');
    });

    it('should convert PatientRow back to PatientInput', () => {
      const row = patientToRow(mockPatientInput, 'clinic-1');
      const patient = patientFromRow(row);

      expect(patient.id).toBe(mockPatientInput.id);
      expect(patient.name).toBe(mockPatientInput.name);
      expect(patient.address.city).toBe(mockPatientInput.address.city);
    });

    it('should handle optional fields', () => {
      const minimalPatient: PatientInput = {
        id: '1',
        name: 'Test',
        cpf: '',
        rg: '',
        birthDate: '',
        age: 0,
        gender: '',
        phone: '',
        email: '',
        address: {
          cep: '',
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
        },
        motherName: '',
        maritalStatus: '',
        occupation: '',
        insurance: '',
        lgpdConsent: false,
        status: 'active',
        totalVisits: 0,
      };

      const row = patientToRow(minimalPatient, 'clinic-1');
      expect(row.name).toBe('Test');
      expect(row.phone).toBe('');
    });
  });

  describe('Appointment Mappers', () => {
    const mockAppointmentInput: AppointmentInput = {
      id: 'apt-1',
      patientName: 'João Silva',
      patientCPF: '123.456.789-00',
      patientPhone: '(11) 98765-4321',
      patientEmail: 'joao@example.com',
      doctorName: 'Dr. Carlos',
      specialty: 'Cardiology',
      time: '14:30',
      date: '2026-03-25',
      duration: 30,
      type: 'presencial',
      status: 'confirmado',
      consultationValue: 150,
      paymentType: 'particular',
      paymentStatus: 'pendente',
    };

    it('should convert AppointmentInput to AppointmentRow', () => {
      const row = appointmentToRow(mockAppointmentInput, 'clinic-1');

      expect(row.id).toBe('apt-1');
      expect(row.owner_id).toBe('clinic-1');
      expect(row.patient_name).toBe('João Silva');
      expect(row.doctor_name).toBe('Dr. Carlos');
      expect(row.appointment_date).toBe('2026-03-25');
    });

    it('should convert AppointmentRow back to AppointmentInput', () => {
      const row = appointmentToRow(mockAppointmentInput, 'clinic-1');
      const appointment = appointmentFromRow(row);

      expect(appointment.id).toBe(mockAppointmentInput.id);
      expect(appointment.patientName).toBe(mockAppointmentInput.patientName);
      expect(appointment.doctorName).toBe(mockAppointmentInput.doctorName);
    });

    it('should handle numeric conversions', () => {
      const row = appointmentToRow(mockAppointmentInput, 'clinic-1');
      const appointment = appointmentFromRow(row);

      expect(appointment.consultationValue).toBe(150);
      expect(appointment.duration).toBe(30);
    });
  });
});
