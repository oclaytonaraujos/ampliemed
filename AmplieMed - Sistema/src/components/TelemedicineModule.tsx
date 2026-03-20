import { useState } from 'react';
import { Video, Link2, Lock, Clock, FileText, PlayCircle, Users, Plus, X, CheckCircle, Copy, Calendar, Phone } from 'lucide-react';
import type { UserRole } from '../App';
import type { TelemedicineSession } from './AppContext';
import { useApp } from './AppContext';
import { medicalToast, toastSuccess, toastInfo } from '../utils/toastService';
import { usePermission } from './PermissionGuard';

interface TelemedicineModuleProps { userRole: UserRole; }

export function TelemedicineModule({ userRole }: TelemedicineModuleProps) {
  const { telemedicineSessions, addTelemedicineSession, setTelemedicineSessions, appointments, patients, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate } = usePermission('telemedicine');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientName: '', doctorName: '', specialty: '', date: '', time: '', duration: 30,
    recordingConsent: false, notes: '',
  });

  // Derive sessions from appointments with type=telemedicina too
  const teleSessions: TelemedicineSession[] = [
    ...telemedicineSessions,
    ...appointments
      .filter(a => a.type === 'telemedicina' && !telemedicineSessions.some(s => s.appointmentId === a.id))
      .map(a => ({
        id: `apt_tele_${a.id}`,
        patientName: a.patientName,
        doctorName: a.doctorName,
        specialty: a.specialty,
        date: a.date,
        time: a.time,
        duration: a.duration,
        link: a.telemedLink || `https://meet.jit.si/ampliemed-${a.id.slice(-8)}`,
        status: a.status === 'realizado' ? 'completed' as const : a.status === 'cancelado' ? 'cancelled' as const : 'scheduled' as const,
        recordingConsent: false,
        appointmentId: a.id,
        notes: a.notes,
      }))
  ];

  const generateLink = () => `https://meet.jit.si/ampliemed-${Math.random().toString(36).substr(2, 8)}`;

  const handleCreate = () => {
    if (!formData.patientName || !formData.date) return;
    const link = generateLink();
    addTelemedicineSession({
      patientName: formData.patientName,
      doctorName: formData.doctorName,
      specialty: formData.specialty,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      link,
      status: 'scheduled',
      recordingConsent: formData.recordingConsent,
      notes: formData.notes,
    });
    addNotification({ type: 'appointment', title: 'Sessão de telemedicina agendada', message: `Teleconsulta de ${formData.patientName} agendada para ${formData.date} às ${formData.time}`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Telemedicina', description: `Teleconsulta criada: ${formData.patientName} — ${formData.date}`, status: 'success' });
    medicalToast.teleconsultStarted(formData.patientName);
    setShowSessionModal(false);
    setFormData({ patientName: '', doctorName: '', specialty: '', date: '', time: '', duration: 30, recordingConsent: false, notes: '' });
  };

  const handleUpdateStatus = (id: string, status: TelemedicineSession['status'], name: string) => {
    setTelemedicineSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (status === 'in-progress') {
      addNotification({ type: 'appointment', title: 'Teleconsulta iniciada', message: `Sessão com ${name} em andamento`, urgent: false });
      medicalToast.teleconsultStarted(name);
    } else if (status === 'completed') {
      addNotification({ type: 'appointment', title: 'Teleconsulta concluída', message: `Sessão com ${name} finalizada`, urgent: false });
      medicalToast.teleconsultEnded(name);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Telemedicina', description: `Teleconsulta concluída: ${name}`, status: 'success' });
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const statusColor = (s: string) => ({
    scheduled: 'bg-blue-100 text-blue-700',
    'in-progress': 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-700');

  const statusLabel = (s: string) => ({ scheduled: 'Agendada', 'in-progress': 'Em Andamento', completed: 'Finalizada', cancelled: 'Cancelada' }[s] || s);

  const stats = {
    scheduled: teleSessions.filter(s => s.status === 'scheduled').length,
    inProgress: teleSessions.filter(s => s.status === 'in-progress').length,
    completed: teleSessions.filter(s => s.status === 'completed').length,
    total: teleSessions.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-2">Portal de Telemedicina</h2>
          <p className="text-gray-600">Consultas online seguras com links únicos e gravação opcional</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Video className="w-4 h-4" /> Nova Sessão
          </button>
        )}
      </div>

      {/* Security cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div><p className="text-sm text-gray-900 mb-1">Conexão Segura E2EE</p><p className="text-xs text-gray-600">Links únicos por sessão com criptografia ponta-a-ponta para proteção de dados sensíveis.</p></div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div><p className="text-sm text-gray-900 mb-1">Termo de Consentimento</p><p className="text-xs text-gray-600">Registro obrigatório de consentimento expresso para gravação de teleconsultas.</p></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Agendadas', value: stats.scheduled, color: 'bg-blue-600', icon: Calendar },
          { label: 'Em Andamento', value: stats.inProgress, color: 'bg-green-600', icon: PlayCircle },
          { label: 'Concluídas', value: stats.completed, color: 'bg-gray-600', icon: CheckCircle },
          { label: 'Total', value: stats.total, color: 'bg-blue-800', icon: Video },
        ].map(s => { const Icon = s.icon; return (
          <div key={s.label} className="bg-white border border-gray-200 p-4">
            <div className={`w-9 h-9 ${s.color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5 text-white" /></div>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-600">{s.label}</p>
          </div>
        ); })}
      </div>

      {/* Sessions */}
      <div className="bg-white border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">Sessões de Telemedicina</h3>
          <p className="text-xs text-gray-500">Inclui sessões criadas manualmente e agendamentos de telemedicina da Agenda</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Paciente</th>
              <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Médico</th>
              <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Data/Hora</th>
              <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Link</th>
              <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
              <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {teleSessions.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center">
                  <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma sessão agendada</p>
                  <p className="text-sm text-gray-400 mt-1">Clique em "Nova Sessão" ou agende uma teleconsulta na Agenda.</p>
                </td></tr>
              ) : teleSessions.map(session => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm text-gray-900">{session.patientName}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-900">{session.doctorName}</p>
                    <p className="text-xs text-gray-500">{session.specialty}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{session.date} {session.time && `às ${session.time}`}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-600 truncate max-w-[160px]">{session.link}</span>
                      <button onClick={() => copyLink(session.link)} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
                        {copiedLink === session.link ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className={`text-xs px-2 py-1 ${statusColor(session.status)}`}>{statusLabel(session.status)}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {session.status === 'scheduled' && (
                        <button onClick={() => handleUpdateStatus(session.id, 'in-progress', session.patientName)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" /> Iniciar
                        </button>
                      )}
                      {session.status === 'in-progress' && (
                        <button onClick={() => handleUpdateStatus(session.id, 'completed', session.patientName)}
                          className="px-3 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Finalizar
                        </button>
                      )}
                      <a href={session.link} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs hover:bg-blue-700 flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Entrar
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Nova Sessão de Telemedicina</h3>
              <button onClick={() => setShowSessionModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Paciente *', key: 'patientName', type: 'text' },
                { label: 'Médico', key: 'doctorName', type: 'text' },
                { label: 'Especialidade', key: 'specialty', type: 'text' },
                { label: 'Data *', key: 'date', type: 'date' },
                { label: 'Horário', key: 'time', type: 'time' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-700 mb-1.5">{f.label}</label>
                  <input type={f.type} value={(formData as any)[f.key]}
                    onChange={(e) => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Duração (minutos)</label>
                <select value={formData.duration} onChange={(e) => setFormData(p => ({ ...p, duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 border border-blue-200">
                <input type="checkbox" checked={formData.recordingConsent} onChange={(e) => setFormData(p => ({ ...p, recordingConsent: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-blue-700">Paciente consente com a gravação da sessão</span>
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-600">
                <Lock className="w-3 h-3 inline mr-1" />
                Um link único criptografado será gerado automaticamente para esta sessão.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowSessionModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={!formData.patientName || !formData.date}
                className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                Criar Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}