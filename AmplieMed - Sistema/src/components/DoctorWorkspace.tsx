import { useState, useEffect } from 'react';
import {
  Stethoscope, Clock, CheckCircle, Play, Bell, User,
  Calendar, AlertCircle, ChevronRight, MessageSquare,
} from 'lucide-react';
import type { UserRole } from '../App';
import type { QueueEntry, ScheduleAppointment } from './AppContext';
import { useApp } from './AppContext';
import { MedicalConsultationWorkspace } from './MedicalConsultationWorkspace';
import { toastSuccess, toastInfo } from '../utils/toastService';
import { sendEvolutionMessage } from '../utils/api';

interface DoctorWorkspaceProps {
  userRole: UserRole;
}

type ConsultationSource =
  | { kind: 'queue'; entry: QueueEntry }
  | { kind: 'schedule'; appointment: ScheduleAppointment };

function normalizeName(n: string) {
  return n.toLowerCase().trim().replace(/^dr\.?\s*/i, '');
}

function matchesDoctor(field: string, currentName: string) {
  return normalizeName(field) === normalizeName(currentName) ||
    normalizeName(field).includes(normalizeName(currentName)) ||
    normalizeName(currentName).includes(normalizeName(field));
}

export function DoctorWorkspace({ userRole }: DoctorWorkspaceProps) {
  const {
    currentUser, patients, appointments, queueEntries, setQueueEntries,
    addNotification, addAuditEntry, selectedClinicId, addCommunicationMessage,
  } = useApp();

  const [activeConsultation, setActiveConsultation] = useState<ConsultationSource | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const doctorName = currentUser?.name || '';

  // Today's appointments for this doctor
  const todayAppointments = appointments.filter(
    a => a.date === today && matchesDoctor(a.doctorName, doctorName)
  ).sort((a, b) => a.time.localeCompare(b.time));

  // Queue entries assigned to this doctor (non-completed)
  const myQueue = queueEntries.filter(
    q => matchesDoctor(q.doctor, doctorName)
  );

  // Auto-increment waiting times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueEntries(prev =>
        prev.map(p => p.status === 'waiting' ? { ...p, waitingTime: p.waitingTime + 1 } : p)
      );
    }, 60000);
    return () => clearInterval(interval);
  }, [setQueueEntries]);

  const stats = {
    scheduled: todayAppointments.length,
    waiting: myQueue.filter(q => q.status === 'waiting' || q.status === 'called').length,
    inProgress: myQueue.filter(q => q.status === 'in-progress').length,
    completed: [
      ...todayAppointments.filter(a => a.status === 'realizado'),
      ...myQueue.filter(q => q.status === 'completed'),
    ].length,
  };

  // ── Queue actions ──────────────────────────────────────────────────────────

  const handleCallPatient = (entry: QueueEntry) => {
    setQueueEntries(prev =>
      prev.map(p => p.id === entry.id ? { ...p, status: 'called' as const } : p)
    );
    addNotification({
      type: 'appointment',
      title: 'Paciente chamado',
      message: `${entry.name} — Senha ${entry.ticketNumber} chamado`,
      urgent: false,
    });
    if (entry.phone && selectedClinicId) {
      const text = `Olá ${entry.name}! Sua senha ${entry.ticketNumber} foi chamada. Por favor, dirija-se ao consultório.`;
      const msg = addCommunicationMessage({ type: 'reminder', patientName: entry.name, channel: 'whatsapp', subject: 'Chamada de senha', body: text, status: 'pending' });
      sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone: entry.phone, text }).catch(() => {});
    }
    toastSuccess(`${entry.name} chamado!`, { description: `Senha ${entry.ticketNumber}` });
  };

  const handleStartFromQueue = (entry: QueueEntry) => {
    setQueueEntries(prev =>
      prev.map(p => p.id === entry.id ? { ...p, status: 'in-progress' as const } : p)
    );
    addAuditEntry({
      user: doctorName || 'Médico',
      userRole: 'doctor',
      action: 'update',
      module: 'Consultório',
      description: `Consulta iniciada: ${entry.name}`,
      status: 'success',
    });
    setActiveConsultation({ kind: 'queue', entry });
  };

  const handleStartFromSchedule = (appointment: ScheduleAppointment) => {
    addAuditEntry({
      user: doctorName || 'Médico',
      userRole: 'doctor',
      action: 'update',
      module: 'Consultório',
      description: `Consulta iniciada pela agenda: ${appointment.patientName}`,
      status: 'success',
    });
    setActiveConsultation({ kind: 'schedule', appointment });
  };

  const handleFinishConsultation = () => {
    if (!activeConsultation) return;
    if (activeConsultation.kind === 'queue') {
      const entry = activeConsultation.entry;
      setQueueEntries(prev =>
        prev.map(p => p.id === entry.id ? { ...p, status: 'completed' as const } : p)
      );
      addNotification({ type: 'appointment', title: 'Consulta concluída', message: `Consulta de ${entry.name} finalizada`, urgent: false });
      toastSuccess(`Consulta de ${entry.name} concluída!`);
    } else {
      const appt = activeConsultation.appointment;
      addNotification({ type: 'appointment', title: 'Consulta concluída', message: `Consulta de ${appt.patientName} finalizada`, urgent: false });
      toastSuccess(`Consulta de ${appt.patientName} concluída!`);
    }
    addAuditEntry({
      user: doctorName || 'Médico',
      userRole: 'doctor',
      action: 'update',
      module: 'Consultório',
      description: `Consulta finalizada`,
      status: 'success',
    });
    setActiveConsultation(null);
  };

  // ── Build patient object for workspace ────────────────────────────────────

  const buildPatient = (src: ConsultationSource) => {
    if (src.kind === 'queue') {
      const entry = src.entry;
      const found = patients.find(
        p => p.name === entry.name || (entry.cpf && p.cpf.replace(/\D/g, '') === entry.cpf.replace(/\D/g, ''))
      );
      return {
        id: found?.id || entry.id,
        name: entry.name,
        cpf: entry.cpf || '',
        birthDate: found?.birthDate || '',
        age: found?.age || 0,
        gender: entry.gender || found?.gender || 'M',
        phone: entry.phone || found?.phone || '',
        email: found?.email || '',
        insurance: entry.insurance || found?.insurance || '',
        allergies: found?.allergies || entry.allergies || '',
      };
    } else {
      const appt = src.appointment;
      const found = patients.find(
        p => p.name === appt.patientName ||
          (appt.patientCPF && p.cpf.replace(/\D/g, '') === appt.patientCPF.replace(/\D/g, ''))
      );
      return {
        id: found?.id || appt.id,
        name: appt.patientName,
        cpf: appt.patientCPF || found?.cpf || '',
        birthDate: found?.birthDate || '',
        age: found?.age || 0,
        gender: found?.gender || 'M',
        phone: appt.patientPhone || found?.phone || '',
        email: appt.patientEmail || found?.email || '',
        insurance: appt.insuranceName || appt.paymentType === 'convenio' ? (appt.insuranceName || '') : (found?.insurance || ''),
        allergies: found?.allergies || '',
      };
    }
  };

  // ── Render consultation workspace ─────────────────────────────────────────

  if (activeConsultation) {
    return (
      <MedicalConsultationWorkspace
        userRole={userRole}
        patient={buildPatient(activeConsultation)}
        onClose={handleFinishConsultation}
        onFinish={handleFinishConsultation}
      />
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  const statusColor = (s: string) =>
    s === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
    s === 'called'  ? 'bg-pink-100 text-pink-700' :
    s === 'in-progress' ? 'bg-green-100 text-green-700' :
    'bg-gray-100 text-gray-500';

  const statusLabel = (s: string) =>
    s === 'waiting' ? 'Aguardando' :
    s === 'called'  ? 'Chamado' :
    s === 'in-progress' ? 'Em Atendimento' : 'Concluído';

  const apptStatusColor = (s: string) =>
    s === 'confirmado' ? 'bg-blue-100 text-blue-700' :
    s === 'pendente'   ? 'bg-yellow-100 text-yellow-700' :
    s === 'realizado'  ? 'bg-gray-100 text-gray-500' :
    'bg-red-100 text-red-700';

  const apptStatusLabel = (s: string) =>
    s === 'confirmado' ? 'Confirmado' :
    s === 'pendente'   ? 'Pendente' :
    s === 'realizado'  ? 'Realizado' : 'Cancelado';

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-1 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-pink-600" />
            Meu Consultório
          </h2>
          <p className="text-gray-500 text-sm capitalize">{todayFormatted}</p>
          {currentUser?.specialty && (
            <p className="text-xs text-gray-400 mt-0.5">{currentUser.specialty}{currentUser.crm ? ` · ${currentUser.crm}` : ''}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Agendados Hoje', value: stats.scheduled, color: 'bg-blue-600', icon: Calendar },
          { label: 'Aguardando',     value: stats.waiting,   color: 'bg-yellow-500', icon: Clock },
          { label: 'Em Atendimento', value: stats.inProgress, color: 'bg-green-600', icon: Play },
          { label: 'Concluídos',     value: stats.completed, color: 'bg-pink-600',  icon: CheckCircle },
        ].map(s => { const Icon = s.icon; return (
          <div key={s.label} className="bg-white border border-gray-200 p-4">
            <div className={`w-9 h-9 ${s.color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-600">{s.label}</p>
          </div>
        ); })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Agenda do dia ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pink-600" />
            <h3 className="text-sm font-medium text-gray-900">Agenda de Hoje</h3>
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {todayAppointments.length}
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayAppointments.map(appt => (
                <div key={appt.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-semibold text-gray-900">{appt.time}</p>
                    <p className="text-xs text-gray-400">{appt.duration}min</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{appt.patientName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{appt.specialty}</span>
                      {appt.type === 'telemedicina' && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5">Telemedicina</span>
                      )}
                      {appt.room && (
                        <span className="text-xs text-gray-400">· Sala {appt.room}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 ${apptStatusColor(appt.status)}`}>
                      {apptStatusLabel(appt.status)}
                    </span>
                    {(appt.status === 'confirmado' || appt.status === 'pendente') && (
                      <button
                        onClick={() => handleStartFromSchedule(appt)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors"
                      >
                        <Play className="w-3 h-3" /> Iniciar
                      </button>
                    )}
                    {appt.status === 'realizado' && (
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Fila de espera ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <User className="w-4 h-4 text-pink-600" />
            <h3 className="text-sm font-medium text-gray-900">Fila de Espera</h3>
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {myQueue.filter(q => q.status !== 'completed').length}
            </span>
          </div>

          {myQueue.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhum paciente na fila</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myQueue.map(entry => (
                <div
                  key={entry.id}
                  className={`px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${entry.priority ? 'bg-red-50 border-l-2 border-red-500' : ''}`}
                >
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold font-mono text-gray-900">{entry.ticketNumber}</p>
                    {entry.priority && (
                      <span className="text-xs bg-red-100 text-red-700 px-1">PRIO</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{entry.waitingTime} min</span>
                      {entry.waitingTime >= 30 && (
                        <AlertCircle className="w-3 h-3 text-orange-500" title="Espera longa" />
                      )}
                      {entry.insurance && (
                        <span className="text-xs text-gray-400">· {entry.insurance}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 ${statusColor(entry.status)}`}>
                      {statusLabel(entry.status)}
                    </span>

                    {entry.status === 'waiting' && (
                      <button
                        onClick={() => handleCallPatient(entry)}
                        className="p-1.5 text-pink-600 hover:bg-pink-50 rounded"
                        title="Chamar paciente"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    )}

                    {entry.status === 'waiting' && entry.phone && selectedClinicId && (
                      <button
                        onClick={() => {
                          const text = `Olá ${entry.name}! Você está na fila de espera. Sua senha é ${entry.ticketNumber}. Aguarde ser chamado.`;
                          const msg = addCommunicationMessage({ type: 'reminder', patientName: entry.name, channel: 'whatsapp', subject: 'Lembrete de fila', body: text, status: 'pending' });
                          sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone: entry.phone!, text }).catch(() => {});
                          toastInfo('WhatsApp enviado', { description: entry.name });
                        }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Notificar via WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    {(entry.status === 'waiting' || entry.status === 'called') && (
                      <button
                        onClick={() => handleStartFromQueue(entry)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors"
                      >
                        <Play className="w-3 h-3" /> Iniciar
                      </button>
                    )}

                    {entry.status === 'in-progress' && (
                      <button
                        onClick={() => handleStartFromQueue(entry)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" /> Retomar
                      </button>
                    )}

                    {entry.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
