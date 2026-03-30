import { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertCircle, Play, Pause, Monitor, Phone, MessageSquare, Plus, X, Bell, Download, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { UserRole } from '../App';
import type { QueueEntry } from './AppContext';
import { useApp } from './AppContext';
import { MedicalConsultationWorkspace } from './MedicalConsultationWorkspace';
import { toastSuccess, toastInfo } from '../utils/toastService';
import { sendEvolutionMessage } from '../utils/api';
import { exportToCSV, exportToPDF } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface QueueManagementProps { userRole: UserRole; }
type QueuePatient = QueueEntry;

export function QueueManagement({ userRole }: QueueManagementProps) {
  const { queueEntries: queuePatients, setQueueEntries: setQueuePatients, patients, appointments, addNotification, addAuditEntry, currentUser, selectedClinicId, addCommunicationMessage, appTemplates } = useApp();
  const { canCreate, canExport } = usePermission('queue');
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'queue' | 'tv-panel'>('queue');
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [currentTicket, setCurrentTicket] = useState('');
  const [patientInConsultation, setPatientInConsultation] = useState<QueuePatient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ name: '', specialty: '', doctor: '', priority: false, cpf: '', phone: '', insurance: '', room: '' });

  // Auto-increment waiting times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setQueuePatients(prev => prev.map(p =>
        p.status === 'waiting' ? { ...p, waitingTime: p.waitingTime + 1 } : p
      ));
    }, 60000);
    return () => clearInterval(interval);
  }, [setQueuePatients]);

  const stats = {
    waiting: queuePatients.filter(p => p.status === 'waiting').length,
    inProgress: queuePatients.filter(p => p.status === 'in-progress').length,
    completed: queuePatients.filter(p => p.status === 'completed').length,
    averageWait: queuePatients.filter(p => p.status === 'waiting').length > 0
      ? Math.round(queuePatients.filter(p => p.status === 'waiting').reduce((s, p) => s + p.waitingTime, 0) / queuePatients.filter(p => p.status === 'waiting').length)
      : 0,
  };

  const handleCallPatient = (patient: QueuePatient) => {
    setCurrentTicket(patient.ticketNumber);
    setQueuePatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: 'called' as const } : p));
    const roomInfo = patient.room ? ` — Sala ${patient.room}` : '';
    addNotification({ type: 'appointment', title: 'Paciente chamado', message: `Paciente ${patient.name} — Senha ${patient.ticketNumber}${roomInfo} — chamado para ${patient.doctor || 'consultório'}`, urgent: false });
    if (patient.phone && selectedClinicId) {
      const text = `Olá ${patient.name}! Sua senha ${patient.ticketNumber} foi chamada. Por favor, dirija-se${patient.room ? ` à Sala ${patient.room}` : ` ao consultório${patient.doctor ? ` de ${patient.doctor}` : ''}`}.`;
      const msg = addCommunicationMessage({ type: 'reminder', patientName: patient.name, channel: 'whatsapp', subject: 'Chamada de senha', body: text, status: 'pending' });
      sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone: patient.phone, text }).catch(() => {});
    }
    toastSuccess(`Paciente ${patient.name} chamado!`, { description: `Senha ${patient.ticketNumber}${roomInfo}` });
  };

  const handleStartConsultation = (patient: QueuePatient) => {
    setCurrentTicket(patient.ticketNumber);
    setQueuePatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: 'in-progress' as const } : p));
    setPatientInConsultation(patient);
    addNotification({ type: 'appointment', title: 'Consulta iniciada', message: `Consulta de ${patient.name} iniciada com ${patient.doctor}`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Fila de Espera', description: `Consulta iniciada: ${patient.name}`, status: 'success' });
    
    // Sugestão de templates da especialidade
    const targetSpecialty = currentUser?.specialty || patient.specialty;
    if (targetSpecialty) {
      const suggested = appTemplates.filter(t => t.specialty?.toLowerCase() === targetSpecialty.toLowerCase());
      if (suggested.length > 0) {
        toastInfo(`Dica: Você possui ${suggested.length} template(s) de ${targetSpecialty}. Utilize-os nas abas de Prescrição ou Documentos.`);
      }
    }
  };

  // Get current patient being called or in progress for TV panel
  const currentPatientOnScreen = currentTicket 
    ? queuePatients.find(p => p.ticketNumber === currentTicket)
    : queuePatients.find(p => p.status === 'called' || p.status === 'in-progress');

  const handleFinishConsultation = () => {
    if (patientInConsultation) {
      setQueuePatients(prev => prev.map(p => p.id === patientInConsultation.id ? { ...p, status: 'completed' as const } : p));
      addNotification({ type: 'appointment', title: 'Consulta concluída', message: `Consulta de ${patientInConsultation.name} finalizada com sucesso`, urgent: false });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Fila de Espera', description: `Consulta concluída: ${patientInConsultation.name}`, status: 'success' });
      toastSuccess(`Consulta de ${patientInConsultation.name} concluída!`);
    }
    setPatientInConsultation(null);
  };

  const handleNotifyPatient = (patient: QueuePatient, method: 'sms' | 'whatsapp') => {
    if (method === 'whatsapp' && patient.phone && selectedClinicId) {
      const text = `Olá ${patient.name}! Você está na fila de espera. Sua senha é ${patient.ticketNumber}. Aguarde ser chamado.`;
      const msg = addCommunicationMessage({ type: 'reminder', patientName: patient.name, channel: 'whatsapp', subject: 'Lembrete de fila', body: text, status: 'pending' });
      sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone: patient.phone, text }).catch(() => {});
    }
    addNotification({ type: 'info', title: `Notificação ${method.toUpperCase()} enviada`, message: `Lembrete enviado para ${patient.name} via ${method === 'whatsapp' ? 'WhatsApp' : 'SMS'}`, urgent: false });
    toastInfo(`Notificação ${method.toUpperCase()} enviada`, { description: `Lembrete para ${patient.name}` });
  };

  const handleAddToQueue = () => {
    if (!newPatientForm.name.trim()) return;
    // Derive next ticket number from the highest existing ticket, not from array length.
    // This prevents duplicate tickets when entries have been removed from the queue.
    const maxTicket = queuePatients.reduce((max, p) => {
      const n = parseInt(p.ticketNumber, 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const ticketNum = String(maxTicket + 1).padStart(3, '0');
    const existingPatient = patients.find(p =>
      p.name.toLowerCase() === newPatientForm.name.toLowerCase() ||
      (newPatientForm.cpf && p.cpf.replace(/\D/g, '') === newPatientForm.cpf.replace(/\D/g, ''))
    );
    const newEntry: QueueEntry = {
      id: crypto.randomUUID(),
      ticketNumber: ticketNum,
      name: existingPatient?.name || newPatientForm.name,
      status: 'waiting',
      arrivalTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      waitingTime: 0,
      doctor: newPatientForm.doctor,
      specialty: newPatientForm.specialty,
      priority: newPatientForm.priority,
      cpf: existingPatient?.cpf || newPatientForm.cpf,
      phone: existingPatient?.phone || newPatientForm.phone,
      insurance: existingPatient?.insurance || newPatientForm.insurance,
      room: newPatientForm.room,
    };
    setQueuePatients(prev => [...prev, newEntry]);
    addNotification({ type: 'appointment', title: 'Paciente na fila', message: `${newEntry.name} adicionado à fila — Senha ${ticketNum}`, urgent: newPatientForm.priority });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Fila de Espera', description: `Paciente adicionado: ${newEntry.name} — Senha ${ticketNum}`, status: 'success' });
    toastSuccess(`Senha ${ticketNum} emitida`, { description: newEntry.name });
    setShowAddModal(false);
    setNewPatientForm({ name: '', specialty: '', doctor: '', priority: false, cpf: '', phone: '', insurance: '', room: '' });
  };

  const handleRemoveFromQueue = (id: string, name: string) => {
    setQueuePatients(prev => prev.filter(p => p.id !== id));
    toastSuccess(`${name} removido da fila`);
  };

  const handleExportCSV = () => {
    exportToCSV(queuePatients as unknown as Record<string, unknown>[], 'fila_espera', [
      { key: 'ticketNumber', label: 'Senha' },
      { key: 'name', label: 'Paciente' },
      { key: 'specialty', label: 'Especialidade' },
      { key: 'doctor', label: 'Médico' },
      { key: 'arrivalTime', label: 'Chegada' },
      { key: 'waitingTime', label: 'Espera (min)' },
      { key: 'status', label: 'Status' },
    ]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Fila de Espera', description: 'Fila exportada em CSV', status: 'success' });
  };

  if (patientInConsultation) {
    const patientData = patients.find(p => p.name === patientInConsultation.name || p.cpf === patientInConsultation.cpf);
    return (
      <MedicalConsultationWorkspace
        userRole={userRole}
        patient={{
          id: patientData?.id || patientInConsultation.id,
          name: patientInConsultation.name,
          cpf: patientInConsultation.cpf || '',
          birthDate: patientData?.birthDate || '',
          age: patientData?.age || 0,
          gender: patientInConsultation.gender || 'M',
          phone: patientInConsultation.phone || '',
          email: patientData?.email || '',
          insurance: patientInConsultation.insurance || '',
          allergies: patientData?.allergies || patientInConsultation.allergies || '',
        }}
        onClose={handleFinishConsultation}
        onFinish={handleFinishConsultation}
      />
    );
  }

  const statusColor = (s: string) => s === 'waiting' ? 'bg-yellow-100 text-yellow-700' : s === 'called' ? 'bg-pink-100 text-pink-700' : s === 'in-progress' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  const statusLabel = (s: string) => s === 'waiting' ? 'Aguardando' : s === 'called' ? 'Chamado' : s === 'in-progress' ? 'Em Atendimento' : 'Concluído';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Fila de Espera</h2>
          <p className="text-gray-600">Gerenciamento de atendimento em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {canExport && (
            <button onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          <div className="flex border border-gray-200 bg-white">
            {[{ id: 'queue', label: 'Fila', icon: Users }, { id: 'tv-panel', label: 'Painel TV', icon: Monitor }].map(v => {
              const Icon = v.icon;
              return (
                <button key={v.id} onClick={() => setActiveView(v.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${activeView === v.id ? 'bg-pink-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />{v.label}
                </button>
              );
            })}
          </div>
          {canCreate && (
            null
          )}
        </div>
      </div>

      {/* Stats */}
      <div>
        <button
          onClick={() => setStatsExpanded(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? '' : '-rotate-90'}`} />
          <span>Resumo — Aguardando: <span className="text-yellow-600 font-semibold">{stats.waiting}</span> · Em Atendimento: <span className="text-green-600 font-semibold">{stats.inProgress}</span> · Concluídos: <span className="text-pink-600 font-semibold">{stats.completed}</span> · Espera Média: <span className="text-gray-600 font-semibold">{stats.averageWait} min</span></span>
        </button>
        {statsExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Aguardando', value: stats.waiting, color: 'text-yellow-600' },
              { label: 'Em Atendimento', value: stats.inProgress, color: 'text-green-600' },
              { label: 'Concluídos', value: stats.completed, color: 'text-pink-600' },
              { label: 'Espera Média (min)', value: stats.averageWait, color: 'text-gray-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeView === 'tv-panel' ? (
        <div className="bg-gray-900 text-white p-8 min-h-[500px] flex flex-col items-center justify-center">
          
          
          {currentPatientOnScreen ? (
            <div className="text-center">
              <p className="text-5xl font-bold text-gray-200 mb-6">{currentPatientOnScreen.name}</p>
              <div className="text-9xl font-bold text-yellow-400 mb-6">{currentPatientOnScreen.ticketNumber}</div>
              <p className="text-3xl text-gray-300 mt-4">{currentPatientOnScreen.doctor}</p>
              {currentPatientOnScreen.room && (
                <p className="text-2xl text-pink-400 mt-3">{currentPatientOnScreen.room}</p>
              )}
            </div>
          ) : <p className="text-gray-500 text-2xl">Aguardando próximo chamado...</p>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Senha</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Especialidade</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Médico</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Sala</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Chegada</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Agendado</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queuePatients.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Fila vazia</p>
                    <p className="text-sm text-gray-400 mt-1">Adicione pacientes à fila para começar.</p>
                  </td></tr>
                ) : queuePatients.map(patient => (
                  <tr key={patient.id} className={`group hover:bg-gray-50 ${patient.priority ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">{patient.ticketNumber}</span>
                        {patient.priority && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700">PRIO</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{patient.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{patient.specialty || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{patient.doctor || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{patient.room || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {patient.arrivalTime
                        ? patient.arrivalTime.includes('T')
                          ? new Date(patient.arrivalTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : patient.arrivalTime
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(() => {
                        const time = patient.appointmentId
                          ? appointments.find(a => a.id === patient.appointmentId)?.time
                          : patient.appointmentTime;
                        return time ? time.substring(0, 5) : '-';
                      })()}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 ${statusColor(patient.status)}`}>{statusLabel(patient.status)}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleRemoveFromQueue(patient.id, patient.name)}
                          className="p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover da fila"><X className="w-4 h-4" /></button>
                        {patient.status === 'waiting' && (
                          <>
                            <button onClick={() => handleNotifyPatient(patient, 'whatsapp')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="WhatsApp"><MessageSquare className="w-4 h-4" /></button>
                            <button onClick={() => handleCallPatient(patient)}
                              className="px-3 py-1.5 bg-pink-600 text-white text-xs hover:bg-pink-700 transition-colors flex items-center gap-1">
                              <Bell className="w-3 h-3" /> Chamar
                            </button>
                          </>
                        )}
                        {patient.status === 'called' && (
                          <>
                            <button onClick={() => handleCallPatient(patient)} className="p-1.5 text-pink-600 hover:bg-pink-50 rounded" title="Chamar novamente"><Bell className="w-4 h-4" /></button>
                            <button onClick={() => handleStartConsultation(patient)}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors flex items-center gap-1">
                              <Play className="w-3 h-3" /> Iniciar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add to Queue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Adicionar à Fila</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Quick pick from patients */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Paciente cadastrado</label>
                <select onChange={(e) => {
                  const p = patients.find(pt => pt.id === e.target.value);
                  if (p) setNewPatientForm(prev => ({ ...prev, name: p.name, cpf: p.cpf, phone: p.phone, insurance: p.insurance }));
                }} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="">Selecionar paciente cadastrado...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.cpf}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Ou preencha manualmente abaixo</p>
              </div>
              {[
                { label: 'Nome *', key: 'name', type: 'text', placeholder: 'Nome completo' },
                { label: 'CPF', key: 'cpf', type: 'text', placeholder: '000.000.000-00' },
                { label: 'Telefone', key: 'phone', type: 'text', placeholder: '(00) 00000-0000' },
                { label: 'Especialidade', key: 'specialty', type: 'text', placeholder: 'Cardiologia, Pediatria...' },
                { label: 'Médico', key: 'doctor', type: 'text', placeholder: 'Dr. Nome' },
                { label: 'Convênio', key: 'insurance', type: 'text', placeholder: 'Particular, Unimed...' },
                { label: 'Sala', key: 'room', type: 'text', placeholder: '01, 02...' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm text-gray-700 mb-1">{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder}
                    value={(newPatientForm as any)[field.key]}
                    onChange={(e) => setNewPatientForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white" />
                </div>
              ))}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-red-50 border border-red-200">
                <input type="checkbox" checked={newPatientForm.priority} onChange={(e) => setNewPatientForm(prev => ({ ...prev, priority: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-red-700">Atendimento prioritário (idoso, gestante, emergência)</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddToQueue} disabled={!newPatientForm.name.trim()}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors disabled:opacity-50">
                Emitir Senha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}