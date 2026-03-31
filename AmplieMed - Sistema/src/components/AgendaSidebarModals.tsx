import { useState, useEffect, useRef } from 'react';
import { X, Users, Clock, Calendar, Plus, Trash2, Settings, MessageSquare, Send, Loader2, Trash } from 'lucide-react';
import { useApp } from './AppContext';
import { getSupabase } from '../utils/supabaseClient';
import { loadWorkSchedules, saveWorkSchedules, type WorkScheduleDay } from '../utils/api';
import { toastSuccess, toastError } from '../utils/toastService';

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitingListModal({ isOpen, onClose }: WaitingListModalProps) {
  const { appointments, setAppointments, patients } = useApp();

  const waitingList = appointments.filter(apt => apt.status === 'pendente');

  const handleConfirm = (id: string) => {
    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, status: 'confirmado' } : apt)
    );
  };

  const handleRemove = (id: string) => {
    setAppointments(prev =>
      prev.map(apt => apt.id === id ? { ...apt, status: 'cancelado' } : apt)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl mx-4 shadow-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Lista de Espera</h3>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium">
              {waitingList.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {waitingList.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum paciente na lista de espera</p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {waitingList.map((apt) => {
                const patient = patients.find(p => p.id === apt.patientId);
                return (
                  <div key={apt.id} className="border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {apt.patientName.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{apt.patientName}</p>
                            <p className="text-xs text-gray-500">{patient?.phone || apt.patientPhone || 'Sem telefone'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mt-2 ml-13">
                          <div><span className="font-medium">Especialidade:</span> {apt.specialty || '—'}</div>
                          <div><span className="font-medium">Médico:</span> {apt.doctorName || '—'}</div>
                          <div>
                            <span className="font-medium">Data:</span>{' '}
                            {new Date(apt.date).toLocaleDateString('pt-BR')}
                          </div>
                          <div><span className="font-medium">Horário:</span> {apt.time}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleConfirm(apt.id)}
                          className="px-3 py-1 bg-pink-600 text-white text-xs hover:bg-pink-700 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleRemove(apt.id)}
                          className="p-1 hover:bg-red-50 text-red-500 transition-colors"
                          title="Cancelar agendamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface PatientsWaitingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatientsWaitingModal({ isOpen, onClose }: PatientsWaitingModalProps) {
  const { queueEntries, appointments, patients } = useApp();
  
  // Pacientes que estão aguardando atendimento
  const waitingPatients = queueEntries.filter(q => q.status === 'waiting');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl mx-4 shadow-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-pink-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pacientes Esperando</h3>
            <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs font-medium">
              {waitingPatients.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {waitingPatients.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum paciente aguardando atendimento</p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {waitingPatients.map((entry) => {
                const appointment = appointments.find(a => a.id === entry.appointmentId);
                const patient = patients.find(p => p.id === entry.patientId);
                
                if (!appointment || !patient) return null;

                const waitTime = Math.floor((Date.now() - new Date(entry.arrivedAt || Date.now()).getTime()) / 60000);

                return (
                  <div key={entry.id} className="border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                            <p className="text-xs text-gray-500">Aguardando há {waitTime} min</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 ml-13">
                          <div>
                            <span className="font-medium">Horário:</span> {appointment.time}
                          </div>
                          <div>
                            <span className="font-medium">Médico:</span> {appointment.doctorName}
                          </div>
                          <div>
                            <span className="font-medium">Especialidade:</span> {appointment.specialty}
                          </div>
                          <div>
                            <span className="font-medium">Sala:</span> {appointment.room || 'A definir'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="px-3 py-1 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors whitespace-nowrap"
                          title="Chamar paciente"
                        >
                          Chamar
                        </button>
                        <button
                          className="px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-50 transition-colors whitespace-nowrap"
                          title="Cancelar"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScaleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SCHEDULE: WorkScheduleDay[] = [
  { dayOfWeek: 1, shiftStart: '08:00', shiftEnd: '18:00', breakTime: '12:00', isActive: true,  consultationDuration: 30 },
  { dayOfWeek: 2, shiftStart: '08:00', shiftEnd: '18:00', breakTime: '12:00', isActive: true,  consultationDuration: 30 },
  { dayOfWeek: 3, shiftStart: '08:00', shiftEnd: '18:00', breakTime: '12:00', isActive: true,  consultationDuration: 30 },
  { dayOfWeek: 4, shiftStart: '08:00', shiftEnd: '18:00', breakTime: '12:00', isActive: true,  consultationDuration: 30 },
  { dayOfWeek: 5, shiftStart: '08:00', shiftEnd: '18:00', breakTime: '12:00', isActive: true,  consultationDuration: 30 },
  { dayOfWeek: 6, shiftStart: '08:00', shiftEnd: '13:00', breakTime: '',      isActive: false, consultationDuration: 30 },
  { dayOfWeek: 0, shiftStart: '08:00', shiftEnd: '12:00', breakTime: '',      isActive: false, consultationDuration: 30 },
];
const DAY_LABELS: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' };

export function ScaleConfigModal({ isOpen, onClose }: ScaleConfigModalProps) {
  const { professionals, selectedClinicId } = useApp();
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [schedule, setSchedule] = useState<WorkScheduleDay[]>(DEFAULT_SCHEDULE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const doctors = professionals.filter(p => p.role === 'doctor' || (!p.role && p.crm));

  // Carrega a escala existente quando o médico é selecionado
  useEffect(() => {
    if (!selectedDoctor || !selectedClinicId) {
      setSchedule(DEFAULT_SCHEDULE);
      return;
    }
    setIsLoading(true);
    loadWorkSchedules(selectedDoctor, selectedClinicId)
      .then(rows => {
        if (rows.length === 0) {
          setSchedule(DEFAULT_SCHEDULE);
        } else {
          setSchedule(DEFAULT_SCHEDULE.map(day => {
            const row = rows.find(r => r.dayOfWeek === day.dayOfWeek);
            if (!row) return { ...day, isActive: false };
            return { ...day, ...row };
          }));
        }
      })
      .catch(err => console.error('[ScaleConfig] Load error:', err))
      .finally(() => setIsLoading(false));
  }, [selectedDoctor, selectedClinicId]);

  const updateDay = (dayOfWeek: number, field: keyof WorkScheduleDay, value: string | boolean | number) => {
    setSchedule(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    if (!selectedDoctor || !selectedClinicId) return;
    setIsSaving(true);
    try {
      await saveWorkSchedules(selectedDoctor, selectedClinicId, schedule);
      toastSuccess('Escala salva com sucesso!');
      onClose();
    } catch (err: any) {
      toastError('Erro ao salvar escala', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl mx-4 shadow-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Configurar Escalas</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Seletor de Médico */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Selecione o Profissional</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Selecione um médico...</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>
                ))}
              </select>
            </div>

            {selectedDoctor && isLoading && (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pink-500" />
                <p className="text-sm">Carregando escala...</p>
              </div>
            )}

            {selectedDoctor && !isLoading && (
              <>
                {/* Grid de Horários */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Horários de Atendimento</h4>
                  <div className="border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700">Dia da Semana</th>
                          <th className="px-4 py-2 text-left text-gray-700">Início</th>
                          <th className="px-4 py-2 text-left text-gray-700">Fim</th>
                          <th className="px-4 py-2 text-left text-gray-700">Intervalo</th>
                          <th className="px-4 py-2 text-left text-gray-700">Duração (min)</th>
                          <th className="px-4 py-2 text-center text-gray-700">Ativo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((day) => (
                          <tr key={day.dayOfWeek} className={`border-t border-gray-200 ${!day.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                            <td className="px-4 py-2 text-gray-900 font-medium">{DAY_LABELS[day.dayOfWeek]}</td>
                            <td className="px-4 py-2">
                              <input
                                type="time"
                                value={day.shiftStart}
                                onChange={(e) => updateDay(day.dayOfWeek, 'shiftStart', e.target.value)}
                                disabled={!day.isActive}
                                className="px-2 py-1 border border-gray-200 text-xs w-full disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="time"
                                value={day.shiftEnd}
                                onChange={(e) => updateDay(day.dayOfWeek, 'shiftEnd', e.target.value)}
                                disabled={!day.isActive}
                                className="px-2 py-1 border border-gray-200 text-xs w-full disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="time"
                                value={day.breakTime}
                                onChange={(e) => updateDay(day.dayOfWeek, 'breakTime', e.target.value)}
                                disabled={!day.isActive}
                                className="px-2 py-1 border border-gray-200 text-xs w-full disabled:bg-gray-100"
                                placeholder="—"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={day.consultationDuration}
                                onChange={(e) => updateDay(day.dayOfWeek, 'consultationDuration', Number(e.target.value))}
                                disabled={!day.isActive}
                                min={5}
                                max={120}
                                className="px-2 py-1 border border-gray-200 text-xs w-20 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={day.isActive}
                                onChange={(e) => updateDay(day.dayOfWeek, 'isActive', e.target.checked)}
                                className="w-4 h-4"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Intervalo = horário de início da pausa/almoço</p>
                </div>
              </>
            )}

            {!selectedDoctor && (
              <div className="py-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Selecione um profissional para configurar a escala</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          {selectedDoctor && !isLoading && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Escala
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

