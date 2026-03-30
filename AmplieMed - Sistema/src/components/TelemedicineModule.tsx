import { useState } from 'react';
import { Video, PlayCircle, CheckCircle, Copy, Calendar, X, Link2, MessageSquare, ExternalLink, Pencil, ChevronDown } from 'lucide-react';
import type { UserRole } from '../App';
import type { TelemedicineSession } from './AppContext';
import { useApp } from './AppContext';
import { medicalToast } from '../utils/toastService';
import { sendEvolutionMessage } from '../utils/api';

interface TelemedicineModuleProps { userRole: UserRole; }

type ModalState =
  | { type: 'none' }
  | { type: 'start'; session: TelemedicineSession }
  | { type: 'reminder'; session: TelemedicineSession }
  | { type: 'editLink'; session: TelemedicineSession };

export function TelemedicineModule({ userRole }: TelemedicineModuleProps) {
  const {
    telemedicineSessions, setTelemedicineSessions,
    appointments, setAppointments,
    patients,
    addNotification, addAuditEntry, currentUser,
    addCommunicationMessage, selectedClinicId,
    clinicSettings,
  } = useApp();

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [linkInput, setLinkInput] = useState('');

  // Derive sessions from appointments with type=telemedicina
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
        link: a.telemedLink || '',
        status: a.status === 'realizado' ? 'completed' as const : a.status === 'cancelado' ? 'cancelled' as const : 'scheduled' as const,
        recordingConsent: false,
        appointmentId: a.id,
        notes: a.notes,
      }))
  ];

  // Persist a link update back to the source (appointment or telemedicineSession)
  const persistLink = (session: TelemedicineSession, newLink: string) => {
    if (session.appointmentId) {
      setAppointments(prev => prev.map(a =>
        a.id === session.appointmentId ? { ...a, telemedLink: newLink } : a
      ));
    } else {
      setTelemedicineSessions(prev => prev.map(s =>
        s.id === session.id ? { ...s, link: newLink } : s
      ));
    }
  };

  const updateStatus = (id: string, status: TelemedicineSession['status'], name: string) => {
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

  // ── Iniciar ──────────────────────────────────────────────────────────────────
  const openStartModal = (session: TelemedicineSession) => {
    setLinkInput(session.link || '');
    setModal({ type: 'start', session });
  };

  const confirmStart = () => {
    if (modal.type !== 'start') return;
    const { session } = modal;
    const finalLink = linkInput.trim() || session.link;

    if (linkInput.trim() && linkInput.trim() !== session.link) {
      persistLink(session, linkInput.trim());
    }

    // Update status for derived sessions
    if (session.appointmentId) {
      setAppointments(prev => prev.map(a =>
        a.id === session.appointmentId ? { ...a, status: 'confirmado' } : a
      ));
      // Also add to telemedicineSessions with in-progress status
      const exists = telemedicineSessions.some(s => s.appointmentId === session.appointmentId);
      if (!exists) {
        setTelemedicineSessions(prev => [...prev, { ...session, link: finalLink || session.link, status: 'in-progress' }]);
      } else {
        setTelemedicineSessions(prev => prev.map(s =>
          s.appointmentId === session.appointmentId ? { ...s, link: finalLink || session.link, status: 'in-progress' } : s
        ));
      }
    } else {
      updateStatus(session.id, 'in-progress', session.patientName);
    }

    addNotification({ type: 'appointment', title: 'Teleconsulta iniciada', message: `Sessão com ${session.patientName} em andamento`, urgent: false });
    medicalToast.teleconsultStarted(session.patientName);

    if (finalLink) {
      window.open(finalLink, '_blank', 'noopener,noreferrer');
    }

    setModal({ type: 'none' });
    setLinkInput('');
  };

  // ── Enviar Lembrete ──────────────────────────────────────────────────────────
  const openReminderModal = (session: TelemedicineSession) => {
    setLinkInput(session.link || '');
    setModal({ type: 'reminder', session });
  };

  const confirmReminder = () => {
    if (modal.type !== 'reminder') return;
    const { session } = modal;
    const finalLink = linkInput.trim() || session.link;

    if (!finalLink) return; // shouldn't happen — button is disabled

    if (linkInput.trim() && linkInput.trim() !== session.link) {
      persistLink(session, linkInput.trim());
    }

    const patient = patients.find(p => p.name === session.patientName);
    const phone = patient?.phone;

    if (!phone) {
      addNotification({ type: 'system', title: 'Sem telefone', message: `Paciente ${session.patientName} não tem telefone cadastrado.`, urgent: false });
      setModal({ type: 'none' });
      setLinkInput('');
      return;
    }

    if (!selectedClinicId) {
      addNotification({ type: 'system', title: 'Clínica não configurada', message: 'Configure a clínica antes de enviar mensagens.', urgent: false });
      setModal({ type: 'none' });
      setLinkInput('');
      return;
    }

    const text =
      `Olá ${session.patientName}! Lembramos sua teleconsulta com ${session.doctorName} em ${session.date}${session.time ? ` às ${session.time}` : ''}.\n\n` +
      `🎥 Acesse a videochamada pelo link abaixo no horário agendado:\n🔗 ${finalLink}\n\n` +
      `Responda SIM para confirmar ou NÃO para cancelar.`;

    const msg = addCommunicationMessage({
      type: 'reminder',
      patientName: session.patientName,
      channel: 'whatsapp',
      subject: `Lembrete teleconsulta — ${session.date}`,
      body: text,
      status: 'pending',
    });

    sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone, text }).catch(() => {});

    addNotification({ type: 'appointment', title: 'Lembrete enviado', message: `Lembrete enviado para ${session.patientName} via WhatsApp`, urgent: false });

    setModal({ type: 'none' });
    setLinkInput('');
  };

  // ── Editar Link ──────────────────────────────────────────────────────────────
  const openEditLinkModal = (session: TelemedicineSession) => {
    setLinkInput(session.link || '');
    setModal({ type: 'editLink', session });
  };

  const confirmEditLink = () => {
    if (modal.type !== 'editLink') return;
    const { session } = modal;
    const newLink = linkInput.trim();
    if (!newLink || newLink === session.link) {
      setModal({ type: 'none' });
      setLinkInput('');
      return;
    }

    persistLink(session, newLink);

    // Notify patient via WhatsApp if phone available
    const patient = patients.find(p => p.name === session.patientName);
    const phone = patient?.phone;
    if (phone && selectedClinicId) {
      const text =
        `Olá ${session.patientName}! O link da sua teleconsulta com ${session.doctorName} em ${session.date}${session.time ? ` às ${session.time}` : ''} foi atualizado.\n\n` +
        `🎥 Novo link da videochamada:\n🔗 ${newLink}\n\n` +
        `Qualquer dúvida, entre em contato conosco.`;

      const msg = addCommunicationMessage({
        type: 'reminder',
        patientName: session.patientName,
        channel: 'whatsapp',
        subject: `Link atualizado — teleconsulta ${session.date}`,
        body: text,
        status: 'pending',
      });
      sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone, text }).catch(() => {});
      addNotification({ type: 'appointment', title: 'Link atualizado', message: `Novo link enviado para ${session.patientName} via WhatsApp`, urgent: false });
    } else {
      addNotification({ type: 'appointment', title: 'Link atualizado', message: `Link da sessão de ${session.patientName} atualizado`, urgent: false });
    }

    setModal({ type: 'none' });
    setLinkInput('');
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const statusColor = (s: string) => ({
    scheduled: 'bg-pink-100 text-pink-700',
    'in-progress': 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-700');

  const statusLabel = (s: string) => ({
    scheduled: 'Agendada',
    'in-progress': 'Em Andamento',
    completed: 'Finalizada',
    cancelled: 'Cancelada',
  }[s] || s);

  const stats = {
    scheduled: teleSessions.filter(s => s.status === 'scheduled').length,
    inProgress: teleSessions.filter(s => s.status === 'in-progress').length,
    completed: teleSessions.filter(s => s.status === 'completed').length,
    total: teleSessions.length,
  };

  const activeModal = modal.type !== 'none' ? modal : null;
  const modalSession = activeModal?.session;
  const hasLink = !!(linkInput.trim() || modalSession?.link);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900 mb-2">Portal de Telemedicina</h2>
        <p className="text-gray-600">Acompanhe e gerencie as consultas online agendadas</p>
      </div>

      {/* Stats */}
      <div>
        <button
          onClick={() => setStatsExpanded(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? '' : '-rotate-90'}`} />
          <span>Resumo — Agendadas: <span className="text-pink-600 font-semibold">{stats.scheduled}</span> · Em Andamento: <span className="text-green-600 font-semibold">{stats.inProgress}</span> · Concluídas: <span className="text-gray-600 font-semibold">{stats.completed}</span> · Total: <span className="text-purple-600 font-semibold">{stats.total}</span></span>
        </button>
        {statsExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Agendadas', value: stats.scheduled, color: 'text-pink-600' },
              { label: 'Em Andamento', value: stats.inProgress, color: 'text-green-600' },
              { label: 'Concluídas', value: stats.completed, color: 'text-gray-600' },
              { label: 'Total', value: stats.total, color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sessions table */}
      <div className="bg-white border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">Sessões de Telemedicina</h3>
          <p className="text-xs text-gray-500">Geradas automaticamente a partir dos agendamentos de telemedicina da Agenda</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Paciente</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Médico</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Data/Hora</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Link</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teleSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma sessão de telemedicina agendada</p>
                    <p className="text-sm text-gray-400 mt-1">Para agendar, vá até a Agenda e selecione o tipo "Telemedicina".</p>
                  </td>
                </tr>
              ) : teleSessions.map(session => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm text-gray-900">{session.patientName}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-900">{session.doctorName}</p>
                    <p className="text-xs text-gray-500">{session.specialty}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {session.date}{session.time && ` às ${session.time}`}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      {session.link ? (
                        <>
                          <span className="text-xs font-mono text-pink-600 truncate max-w-[120px]">{session.link}</span>
                          <button onClick={() => copyLink(session.link)} className="p-1 hover:bg-gray-100 rounded flex-shrink-0" title="Copiar link">
                            {copiedLink === session.link
                              ? <CheckCircle className="w-3 h-3 text-green-600" />
                              : <Copy className="w-3 h-3 text-gray-400" />}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sem link</span>
                      )}
                      {session.status !== 'completed' && session.status !== 'cancelled' && (
                        <button onClick={() => openEditLinkModal(session)} className="p-1 hover:bg-gray-100 rounded flex-shrink-0" title="Editar link">
                          <Pencil className="w-3 h-3 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 ${statusColor(session.status)}`}>
                      {statusLabel(session.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* Enviar Lembrete — always visible for scheduled/in-progress */}
                      {(session.status === 'scheduled' || session.status === 'in-progress') && (
                        <button
                          onClick={() => openReminderModal(session)}
                          className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" /> Lembrete
                        </button>
                      )}
                      {/* Iniciar */}
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => openStartModal(session)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-1"
                        >
                          <PlayCircle className="w-3 h-3" /> Iniciar
                        </button>
                      )}
                      {/* Finalizar */}
                      {session.status === 'in-progress' && (
                        <button
                          onClick={() => updateStatus(session.id, 'completed', session.patientName)}
                          className="px-3 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Finalizar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Iniciar ─────────────────────────────────────────────────────── */}
      {modal.type === 'start' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900 font-medium">Iniciar Teleconsulta</h3>
              <button onClick={() => { setModal({ type: 'none' }); setLinkInput(''); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Confirma o início da consulta com <strong>{modal.session.patientName}</strong>
                {modal.session.time ? ` às ${modal.session.time}` : ''}?
              </p>
              {modal.session.link ? (
                <div className="p-3 bg-green-50 border border-green-200 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs font-mono text-green-700 truncate">{modal.session.link}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3">
                    Esta sessão não possui link de videochamada. Informe o link para prosseguir.
                  </p>
                  <label className="block text-sm text-gray-700">Link da videochamada</label>
                  <input
                    type="url"
                    value={linkInput}
                    onChange={e => setLinkInput(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setModal({ type: 'none' }); setLinkInput(''); }}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmStart}
                disabled={!modal.session.link && !linkInput.trim()}
                className="px-5 py-2.5 bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Iniciar e Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Link ───────────────────────────────────────────────── */}
      {modal.type === 'editLink' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900 font-medium">Atualizar Link da Videochamada</h3>
              <button onClick={() => { setModal({ type: 'none' }); setLinkInput(''); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Sessão de <strong>{modal.session.patientName}</strong> em {modal.session.date}{modal.session.time ? ` às ${modal.session.time}` : ''}.
              </p>
              <div className="space-y-2">
                <label className="block text-sm text-gray-700">Novo link da videochamada</label>
                <input
                  type="url"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 p-3">
                Ao salvar, uma mensagem WhatsApp será enviada automaticamente ao paciente com o novo link.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setModal({ type: 'none' }); setLinkInput(''); }}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmEditLink}
                disabled={!linkInput.trim() || linkInput.trim() === modal.session.link}
                className="px-5 py-2.5 bg-pink-600 text-white text-sm hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" /> Salvar e Notificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Enviar Lembrete ────────────────────────────────────────────── */}
      {modal.type === 'reminder' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900 font-medium">Enviar Lembrete</h3>
              <button onClick={() => { setModal({ type: 'none' }); setLinkInput(''); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Enviar lembrete via WhatsApp para <strong>{modal.session.patientName}</strong> com o link da videochamada.
              </p>

              {!modal.session.link && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3">
                  Esta sessão não possui link. Informe o link para incluir na mensagem.
                </p>
              )}

              <div className="space-y-2">
                <label className="block text-sm text-gray-700">Link da videochamada</label>
                <input
                  type="url"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Preview da mensagem */}
              {hasLink && (
                <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-pre-line">
                  {`Olá ${modal.session.patientName}! Lembramos sua teleconsulta com ${modal.session.doctorName} em ${modal.session.date}${modal.session.time ? ` às ${modal.session.time}` : ''}.\n\n🎥 Acesse a videochamada pelo link abaixo no horário agendado:\n🔗 ${linkInput.trim() || modal.session.link}\n\nResponda SIM para confirmar ou NÃO para cancelar.`}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setModal({ type: 'none' }); setLinkInput(''); }}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmReminder}
                disabled={!hasLink}
                className="px-5 py-2.5 bg-pink-600 text-white text-sm hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
