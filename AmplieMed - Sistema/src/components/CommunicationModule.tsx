import { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, CheckCircle, Users, Bell, Plus, X, Phone, Mail, Calendar, Filter, User, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router';
import type { UserRole } from '../App';
import type { Campaign } from './AppContext';
import { useApp } from './AppContext';
import { BackToPatientBanner } from './BackToPatientBanner';
import { toastSuccess, toastInfo, toastError } from '../utils/toastService';
import { sendEvolutionMessage } from '../utils/api';

interface CommunicationModuleProps { userRole: UserRole; }

interface Reminder {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  channel: 'whatsapp';
  status: 'pending' | 'sent' | 'confirmed' | 'cancelled';
  daysBeforeAppointment: number;
  phone?: string;
}

// New campaign form state
interface NewCampaignForm {
  name: string;
  message: string;
  channel: 'whatsapp';
  type: 'birthday' | 'followup' | 'custom';
}

export function CommunicationModule({ userRole }: CommunicationModuleProps) {
  const {
    appointments, patients, communicationMessages, setCommunicationMessages,
    addNotification, addCommunicationMessage, addAuditEntry, currentUser,
    campaigns, addCampaign, updateCampaign, deleteCampaign,
    selectedClinicId,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'reminders' | 'campaigns' | 'direct'>('reminders');
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [recentMessagesExpanded, setRecentMessagesExpanded] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState<NewCampaignForm>({ name: '', message: '', channel: 'whatsapp', type: 'custom' });

  // Direct message state (pre-filled from PatientDetailView)
  const [directMessage, setDirectMessage] = useState({ patientName: '', phone: '', channel: 'whatsapp' as 'whatsapp', message: '' });
  const [patientQuery, setPatientQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const filteredPatients = patientQuery.trim().length >= 1
    ? patients.filter(p =>
        p.name.toLowerCase().includes(patientQuery.toLowerCase()) ||
        p.phone?.includes(patientQuery)
      ).slice(0, 8)
    : [];
  const [preselectedPatientInfo, setPreselectedPatientInfo] = useState<{ id: string; name: string } | null>(null);
  const location = useLocation();
  useEffect(() => {
    const state = location.state as any;
    if (state?.preselectedPatient) {
      const p = state.preselectedPatient;
      setDirectMessage({
        patientName: p.name || '',
        phone: p.phone || '',
        channel: 'whatsapp',
        message: '',
      });
      setActiveTab('direct');
      setPreselectedPatientInfo({ id: p.id, name: p.name });
      toastInfo(`Paciente pré-selecionado: ${p.name}`, { description: 'Compose sua mensagem e envie.' });
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Auto-generate reminders from upcoming appointments
  const upcomingAppointments = appointments.filter(a => {
    if (a.status === 'cancelado' || a.status === 'realizado') return false;
    const apptDate = new Date(a.date);
    const today = new Date();
    const diff = (apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  const reminders: Reminder[] = upcomingAppointments.map(a => {
    const apptDate = new Date(a.date);
    const diff = Math.ceil((apptDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const patient = patients.find(p => p.name === a.patientName || p.cpf === a.patientCPF);
    return {
      id: `rem_${a.id}`,
      patientName: a.patientName,
      doctorName: a.doctorName,
      date: a.date,
      time: a.time,
      channel: 'whatsapp',
      status: diff <= 1 ? 'pending' : 'pending',
      daysBeforeAppointment: diff,
      phone: a.patientPhone || patient?.phone,
    };
  });

  const handleSendReminder = async (reminder: Reminder) => {
    const patient = patients.find(p => p.name === reminder.patientName);
    const portalLink = patient?.portalToken
      ? `\n\nAcesse seu portal: ${window.location.origin}/paciente?t=${patient.portalToken}`
      : '';
    const text = `Olá ${reminder.patientName}! Lembramos sua consulta com ${reminder.doctorName} em ${reminder.date} às ${reminder.time}. Responda SIM para confirmar.${portalLink}`;

    // Save message record with pending status
    const msg = addCommunicationMessage({
      type: 'reminder',
      patientName: reminder.patientName,
      channel: reminder.channel,
      subject: `Lembrete de consulta — ${reminder.date}`,
      body: text,
      status: 'pending',
    });

    if (reminder.channel === 'whatsapp' && reminder.phone && selectedClinicId) {
      try {
        await sendEvolutionMessage({
          clinicId: selectedClinicId,
          messageId: msg.id,
          phone: reminder.phone,
          text,
        });
        setCommunicationMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m),
        );
        addNotification({
          type: 'info',
          title: 'Lembrete WhatsApp enviado',
          message: `Lembrete enviado para ${reminder.patientName} — ${reminder.date} às ${reminder.time}`,
          urgent: false,
        });
        toastSuccess(`Lembrete WhatsApp enviado para ${reminder.patientName}`);
      } catch (err: any) {
        setCommunicationMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m),
        );
        toastError(`Falha ao enviar lembrete WhatsApp: ${err.message}`);
      }
      // Other channels restricted in UI, handled as success
      setCommunicationMessages(prev =>
        prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m),
      );
      addNotification({
        type: 'info',
        title: `Lembrete ${reminder.channel.toUpperCase()} registrado`,
        message: `Lembrete registrado para ${reminder.patientName} via ${reminder.channel} — ${reminder.date} às ${reminder.time}`,
        urgent: false,
      });
      toastSuccess(`Lembrete registrado para ${reminder.patientName}`);
    }
  };

  const handleSendAllPending = async () => {
    const pending = reminders.filter(r => r.status === 'pending');
    if (pending.length === 0) return;
    // Send sequentially to avoid hammering Evolution API
    let sent = 0;
    let failed = 0;
    for (const reminder of pending) {
      try {
        await handleSendReminder(reminder);
        sent++;
      } catch {
        failed++;
      }
    }
    if (failed === 0) {
      toastSuccess(`${sent} lembretes enviados com sucesso!`);
    } else {
      toastError(`${sent} enviados, ${failed} falharam. Verifique as configurações do WhatsApp.`);
    }
  };

  const handleToggleCampaign = (id: string, currentStatus: Campaign['status']) => {
    updateCampaign(id, { status: currentStatus === 'active' ? 'paused' : 'active' });
    toastSuccess(currentStatus === 'active' ? 'Campanha pausada' : 'Campanha ativada');
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim() || !newCampaign.message.trim()) {
      toastError('Preencha o nome e a mensagem da campanha');
      return;
    }
    addCampaign({
      name: newCampaign.name,
      message: newCampaign.message,
      channel: newCampaign.channel,
      type: newCampaign.type,
      status: 'draft',
      totalRecipients: patients.length,
      sent: 0,
    });
    setNewCampaign({ name: '', message: '', channel: 'whatsapp', type: 'custom' });
    setShowCampaignModal(false);
    toastSuccess('Campanha criada e salva!');
    addAuditEntry({
      user: currentUser?.name || 'Sistema',
      userRole: currentUser?.role || 'admin',
      action: 'create',
      module: 'Campanhas',
      description: `Campanha "${newCampaign.name}" criada via ${newCampaign.channel}`,
      status: 'success',
    });
  };

  // Stats
  const totalSent = communicationMessages.filter(m => m.status === 'sent' || m.status === 'read').length;
  const confirmationRate = appointments.length > 0 ? Math.round((appointments.filter(a => a.status === 'confirmado').length / appointments.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back to patient banner */}
      {preselectedPatientInfo && (
        <BackToPatientBanner
          patientName={preselectedPatientInfo.name}
          patientId={preselectedPatientInfo.id}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900 mb-2">Módulo de Comunicação</h2>
          <p className="text-gray-600">Lembretes automáticos, chatbot de confirmação e campanhas</p>
        </div>
        {activeTab === 'reminders' && reminders.filter(r => r.status === 'pending').length > 0 && (
          <button onClick={handleSendAllPending} className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 text-white hover:bg-pink-700">
            <Send className="w-4 h-4" /> Enviar Todos Pendentes ({reminders.filter(r => r.status === 'pending').length})
          </button>
        )}
      </div>

      {/* Stats */}
      <div>
        <button
          onClick={() => setStatsExpanded(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? '' : '-rotate-90'}`} />
          <span>Resumo — Próximas 7 dias: <span className="text-pink-600 font-semibold">{upcomingAppointments.length}</span> · Lembretes pendentes: <span className="text-orange-600 font-semibold">{reminders.filter(r => r.status === 'pending').length}</span> · Confirmação: <span className="text-green-600 font-semibold">{confirmationRate}%</span> · Pacientes: <span className="text-gray-700 font-semibold">{patients.length}</span></span>
        </button>
        {statsExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Consultas próximas 7 dias', value: upcomingAppointments.length, color: 'text-pink-600' },
              { label: 'Lembretes pendentes', value: reminders.filter(r => r.status === 'pending').length, color: 'text-orange-600' },
              { label: 'Taxa de confirmação', value: `${confirmationRate}%`, color: 'text-green-600' },
              { label: 'Pacientes cadastrados', value: patients.length, color: 'text-gray-700' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[{ id: 'reminders', label: 'Lembretes Automáticos', icon: Bell }, { id: 'direct', label: 'Mensagem Direta', icon: MessageSquare }, { id: 'campaigns', label: 'Campanhas', icon: Users }].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm border-b-2 transition-all ${activeTab === t.id ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="bg-pink-50 border border-pink-200 p-4 flex items-start gap-3">
                <Bell className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-pink-900">Lembretes automáticos baseados na agenda</p>
                  <p className="text-xs text-pink-700 mt-1">Os lembretes são gerados automaticamente para consultas nos próximos 7 dias. Integre com WhatsApp Business API para envio real.</p>
                </div>
              </div>

              {reminders.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum lembrete pendente</p>
                  <p className="text-sm text-gray-400 mt-1">Agende consultas para os próximos dias para ver lembretes aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map(r => (
                    <div key={r.id} className="border border-gray-200 p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-sm font-medium text-gray-900">{r.patientName}</p>
                            <span className={`text-xs px-2 py-0.5 ${r.daysBeforeAppointment <= 1 ? 'bg-red-100 text-red-700' : r.daysBeforeAppointment <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-pink-100 text-pink-700'}`}>
                              {r.daysBeforeAppointment === 0 ? 'Hoje' : r.daysBeforeAppointment === 1 ? 'Amanhã' : `Em ${r.daysBeforeAppointment} dias`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{r.doctorName} • {r.date} às {r.time}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {r.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => handleSendReminder({ ...r, channel: 'whatsapp' })}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700">
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Enviar mensagem direta ao paciente</p>
                  <p className="text-xs text-green-700 mt-1">Envie comunicação personalizada via WhatsApp.</p>
                </div>
              </div>

              <div className="border border-gray-200 p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm text-gray-700 mb-1.5">Paciente</label>
                    <input
                      type="text"
                      value={patientQuery || directMessage.patientName}
                      onChange={e => {
                        setPatientQuery(e.target.value);
                        setDirectMessage(prev => ({ ...prev, patientName: e.target.value, phone: '' }));
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-pink-500"
                      placeholder="Buscar paciente cadastrado..."
                      autoComplete="off"
                    />
                    {showPatientDropdown && filteredPatients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => {
                              setDirectMessage(prev => ({
                                ...prev,
                                patientName: p.name,
                                phone: p.phone || '',
                                channel: 'whatsapp',
                              }));
                              setPatientQuery('');
                              setShowPatientDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-pink-50 text-sm"
                          >
                            <span className="font-medium text-gray-900">{p.name}</span>
                            {p.phone && <span className="ml-2 text-xs text-gray-500">{p.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">Telefone</label>
                    <input type="text" value={directMessage.phone}
                      onChange={e => setDirectMessage(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-pink-500"
                      placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Mensagem *</label>
                  <textarea rows={4} value={directMessage.message}
                    onChange={e => setDirectMessage(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none resize-none focus:border-pink-500"
                    placeholder={`Olá ${directMessage.patientName || '[NOME]'}, ...`} />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setDirectMessage({ patientName: '', phone: '', channel: 'whatsapp', message: '' }); setPatientQuery(''); }}
                    className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">Limpar</button>
                  <button onClick={async () => {
                    if (!directMessage.patientName || !directMessage.message) return;

                    // Save record with pending status immediately
                    const msg = addCommunicationMessage({
                      type: 'reminder',
                      patientName: directMessage.patientName,
                      channel: directMessage.channel,
                      subject: `Mensagem direta para ${directMessage.patientName}`,
                      body: directMessage.message,
                      status: 'pending',
                    });

                    if (directMessage.channel === 'whatsapp' && directMessage.phone && selectedClinicId) {
                      try {
                        await sendEvolutionMessage({
                          clinicId: selectedClinicId,
                          messageId: msg.id,
                          phone: directMessage.phone,
                          text: directMessage.message,
                        });
                        setCommunicationMessages(prev =>
                          prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m),
                        );
                        addNotification({
                          type: 'info',
                          title: 'Mensagem WhatsApp enviada',
                          message: `Mensagem enviada para ${directMessage.patientName} via WhatsApp (${directMessage.phone})`,
                          urgent: false,
                        });
                        toastSuccess(`Mensagem WhatsApp enviada para ${directMessage.patientName}`);
                      } catch (err: any) {
                        setCommunicationMessages(prev =>
                          prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m),
                        );
                        toastError(`Falha ao enviar WhatsApp: ${err.message}`);
                        return; // keep the form filled so user can retry
                      }
                    } else {
                      // SMS or email — mark as sent (external providers not yet integrated)
                      setCommunicationMessages(prev =>
                        prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m),
                      );
                      const dest = directMessage.phone;
                      addNotification({
                        type: 'info',
                        title: `Mensagem ${directMessage.channel.toUpperCase()} registrada`,
                        message: `Mensagem registrada para ${directMessage.patientName} via ${directMessage.channel} (${dest})`,
                        urgent: false,
                      });
                      toastSuccess(`Mensagem registrada para ${directMessage.patientName} via ${directMessage.channel}`);
                    }

                    addAuditEntry({
                      user: currentUser?.name || 'Sistema',
                      userRole: currentUser?.role || 'admin',
                      action: 'create',
                      module: 'Comunicação',
                      description: `Mensagem direta enviada para ${directMessage.patientName} via ${directMessage.channel}`,
                      status: 'success',
                    });
                    setDirectMessage(prev => ({ ...prev, message: '' }));
                  }} className="flex items-center gap-2 px-5 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700">
                    <Send className="w-4 h-4" /> Enviar
                  </button>
                </div>
              </div>

              {/* Recent direct messages */}
              {communicationMessages.filter(m => m.status === 'sent').length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setRecentMessagesExpanded(v => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors focus:outline-none w-full text-left"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${recentMessagesExpanded ? '' : '-rotate-90'}`} />
                    Mensagens Recentes
                  </button>
                  
                  {recentMessagesExpanded && (
                    <div className="space-y-2 mt-4">
                      {communicationMessages.filter(m => m.status === 'sent').slice(0, 10).map((m, i) => (
                        <div key={i} className="border border-gray-200 p-3 flex items-start justify-between text-sm bg-white">
                          <div className="flex-1 pr-4">
                            <p className="text-gray-900 font-medium">{m.patientName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{m.channel?.toUpperCase()} • {m.sentAt ? new Date(m.sentAt).toLocaleString('pt-BR') : ''}</p>
                            {m.body && (
                              <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                                <p className="text-gray-700 whitespace-pre-wrap">{m.body}</p>
                              </div>
                            )}
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 flex-shrink-0 mt-0.5">Enviada</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowCampaignModal(true)} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700">
                  <Plus className="w-4 h-4" /> Nova Campanha
                </button>
              </div>
              {campaigns.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma campanha criada</p>
                  <p className="text-sm text-gray-400 mt-1">Clique em "Nova Campanha" para criar uma campanha que será salva no banco de dados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className="border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <span className={`text-xs px-2 py-0.5 ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                              {c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Rascunho'}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-pink-50 text-pink-700">{c.channel.toUpperCase()}</span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">{c.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {c.totalRecipients} destinatários • {c.sent} enviados •{' '}
                            Criada em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => handleToggleCampaign(c.id, c.status)}
                            className={`px-3 py-1.5 text-xs ${c.status === 'active' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                            {c.status === 'active' ? 'Pausar' : 'Ativar'}
                          </button>
                          <button onClick={() => { deleteCampaign(c.id); toastSuccess('Campanha removida'); }}
                            className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Nova Campanha</h3>
              <button onClick={() => setShowCampaignModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Nome da campanha *</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:border-pink-500"
                  placeholder="Ex: Retorno anual"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Tipo</label>
                <select
                  value={newCampaign.type}
                  onChange={e => setNewCampaign(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none"
                >
                  <option value="birthday">Aniversário</option>
                  <option value="followup">Retorno/Follow-up</option>
                  <option value="custom">Personalizada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Mensagem * (use [NOME] para personalizar)</label>
                <textarea
                  rows={3}
                  value={newCampaign.message}
                  onChange={e => setNewCampaign(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none resize-none focus:border-pink-500"
                  placeholder="Olá [NOME], gostaríamos de convidá-lo para..."
                />
              </div>
              <p className="text-xs text-gray-400">A campanha será salva como rascunho. Ative-a quando estiver pronto para envio.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowCampaignModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreateCampaign} className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700">Criar e Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}