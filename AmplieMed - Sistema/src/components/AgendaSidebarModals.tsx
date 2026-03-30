import { useState, useEffect, useRef } from 'react';
import { X, Users, Clock, Calendar, Plus, Trash2, Settings, MessageSquare, Send, Loader2, Trash } from 'lucide-react';
import { useApp } from './AppContext';
import { getSupabase } from '../utils/supabaseClient';

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

export function ScaleConfigModal({ isOpen, onClose }: ScaleConfigModalProps) {
  const { professionals } = useApp();
  const [selectedDoctor, setSelectedDoctor] = useState('');

  if (!isOpen) return null;

  const doctors = professionals.filter(p => p.role === 'doctor');

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

            {selectedDoctor && (
              <>
                {/* Grid de Horários */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Horários de Atendimento</h4>
                  <div className="border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700">Dia da Semana</th>
                          <th className="px-4 py-2 text-left text-gray-700">Horário Início</th>
                          <th className="px-4 py-2 text-left text-gray-700">Horário Fim</th>
                          <th className="px-4 py-2 text-left text-gray-700">Intervalo</th>
                          <th className="px-4 py-2 text-center text-gray-700">Ativo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day) => (
                          <tr key={day} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-gray-900">{day}</td>
                            <td className="px-4 py-2">
                              <input type="time" className="px-2 py-1 border border-gray-200 text-xs w-full" defaultValue="08:00" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="time" className="px-2 py-1 border border-gray-200 text-xs w-full" defaultValue="18:00" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="time" className="px-2 py-1 border border-gray-200 text-xs w-full" defaultValue="12:00" />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input type="checkbox" className="w-4 h-4" defaultChecked={day !== 'Domingo'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Configurações Adicionais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Duração Padrão (min)</label>
                    <input type="number" defaultValue="30" className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Intervalo entre Consultas (min)</label>
                    <input type="number" defaultValue="0" className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  </div>
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
          {selectedDoctor && (
            <button className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors">
              Salvar Escala
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const { currentUser, selectedClinicId } = useApp();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<{
    id: string;
    author_name: string;
    author_role: string;
    author_id: string;
    message: string;
    created_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get current auth user id
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  // Load messages + subscribe to realtime when modal opens
  useEffect(() => {
    if (!isOpen || !selectedClinicId) return;

    setLoading(true);
    const supabase = getSupabase();

    supabase
      .from('team_messages')
      .select('id, author_name, author_role, author_id, message, created_at')
      .eq('clinic_id', selectedClinicId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setMessages(data);
        setLoading(false);
      });

    const channel = supabase
      .channel(`team_messages:${selectedClinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `clinic_id=eq.${selectedClinicId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'team_messages',
          filter: `clinic_id=eq.${selectedClinicId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, selectedClinicId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !selectedClinicId || !currentUserId) return;

    setSending(true);
    setNewMessage('');

    const { error } = await getSupabase().from('team_messages').insert({
      clinic_id: selectedClinicId,
      author_id: currentUserId,
      author_name: currentUser?.name || 'Usuário',
      author_role: currentUser?.role || 'user',
      message: text,
    });

    if (error) {
      setNewMessage(text); // restore on error
      console.error('[TeamMessages] Erro ao enviar:', error.message);
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await getSupabase().from('team_messages').delete().eq('id', id);
  };

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return `há ${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl mx-4 shadow-lg flex flex-col h-[520px]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-pink-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recados da Equipe</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Nenhum recado ainda</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.author_id === currentUserId;
              return (
                <div key={msg.id} className="group border border-gray-200 p-4 bg-gray-50 relative">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{msg.author_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{timeAgo(msg.created_at)}</span>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                          title="Excluir recado"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{msg.message}</p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Digite seu recado..."
              className="flex-1 px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
