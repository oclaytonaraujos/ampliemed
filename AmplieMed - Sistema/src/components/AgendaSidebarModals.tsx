import { useState } from 'react';
import { X, Users, Clock, Calendar, Plus, Trash2, Settings, MessageSquare, Send } from 'lucide-react';
import { useApp } from './AppContext';

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitingListModal({ isOpen, onClose }: WaitingListModalProps) {
  const { appointments, patients } = useApp();
  
  // Filtrar agendamentos na lista de espera (status especial ou pacientes sem data confirmada)
  const waitingList = appointments.filter(apt => 
    apt.status === 'pendente' && !apt.confirmed
  );

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
                            {apt.patientName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{apt.patientName}</p>
                            <p className="text-xs text-gray-500">{patient?.phone || 'Sem telefone'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 ml-13">
                          <div>
                            <span className="font-medium">Especialidade:</span> {apt.specialty}
                          </div>
                          <div>
                            <span className="font-medium">Médico:</span> {apt.doctorName}
                          </div>
                          <div>
                            <span className="font-medium">Data solicitada:</span>{' '}
                            {new Date(apt.date).toLocaleDateString('pt-BR')}
                          </div>
                          <div>
                            <span className="font-medium">Horário preferido:</span> {apt.time}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 bg-pink-600 text-white text-xs hover:bg-pink-700 transition-colors"
                          title="Confirmar agendamento"
                        >
                          Confirmar
                        </button>
                        <button
                          className="p-1 hover:bg-red-50 text-red-600 transition-colors"
                          title="Remover da lista"
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
  const { currentUser } = useApp();
  const [newMessage, setNewMessage] = useState('');
  const [messages] = useState([
    {
      id: '1',
      author: 'Dr. João Silva',
      message: 'Favor confirmar o agendamento do paciente Pedro Santos para amanhã às 14h.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      author: 'Recepção',
      message: 'Lembrando que a sala 3 estará em manutenção na próxima segunda-feira.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  if (!isOpen) return null;

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Aqui você adicionaria a lógica para salvar a mensagem
    setNewMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
          {messages.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Nenhum recado ainda</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{msg.author}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{msg.message}</p>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite seu recado..."
              className="flex-1 px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
