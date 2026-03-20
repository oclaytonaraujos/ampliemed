import { useState } from 'react';
import { Calendar, FileText, Download, CreditCard, User, Clock, Video, Shield } from 'lucide-react';
import { useApp } from './AppContext';

export function PatientPortal() {
  const { currentUser, patients, appointments, medicalRecords, financialPayments } = useApp();
  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'payments' | 'profile'>('appointments');

  // Identify the patient record for the logged-in user by email match
  const patientRecord = patients.find(p => p.email === currentUser?.email) || null;

  // Filter data by this patient
  const upcomingAppointments = patientRecord
    ? appointments
        .filter(a =>
          (a.patientName === patientRecord.name || a.patientCPF === patientRecord.cpf) &&
          a.status !== 'cancelado' && a.status !== 'realizado'
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const patientMedicalRecords = patientRecord
    ? medicalRecords
        .filter(r => r.patientId === patientRecord.id || r.patientName === patientRecord.name)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  const patientPayments = patientRecord
    ? financialPayments
        .filter(p => p.patient === patientRecord.name)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const patientData = {
    name: patientRecord?.name || currentUser?.name || '',
    cpf: patientRecord?.cpf || '',
    email: patientRecord?.email || currentUser?.email || '',
    phone: patientRecord?.phone || currentUser?.phone || '',
    birthDate: patientRecord?.birthDate || '',
    insurance: patientRecord?.insurance || '',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-blue-600 text-white p-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white mb-2">
                Bem-vindo{patientData.name ? `, ${patientData.name.split(' ')[0]}` : ' ao Portal do Paciente'}
              </h1>
              <p className="text-blue-100">Acesse seu histórico médico, consultas e muito mais</p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              {patientData.name ? (
                <span className="text-2xl font-bold text-white">
                  {patientData.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </span>
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 -mt-8 mb-6">
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-semibold text-gray-900">{upcomingAppointments.length}</p>
            </div>
            <p className="text-sm text-gray-600">Consultas Agendadas</p>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-semibold text-gray-900">{patientMedicalRecords.length}</p>
            </div>
            <p className="text-sm text-gray-600">Prontuários</p>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {patientPayments.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <p className="text-sm text-gray-600">Pagamento Pendente</p>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-600 flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {upcomingAppointments.filter(a => a.type === 'telemedicina').length}
              </p>
            </div>
            <p className="text-sm text-gray-600">Telemedicina</p>
          </div>
        </div>

        {/* No patient record warning */}
        {!patientRecord && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 flex items-start gap-3">
            <User className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Cadastro de paciente não encontrado</p>
              <p className="text-xs text-yellow-700 mt-1">
                Nenhum paciente cadastrado com o e-mail <strong>{currentUser?.email}</strong>. Solicite ao administrador que vincule sua conta a um cadastro de paciente.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: 'appointments', label: 'Minhas Consultas', icon: Calendar },
                { id: 'records', label: 'Prontuários', icon: FileText },
                { id: 'payments', label: 'Pagamentos', icon: CreditCard },
                { id: 'profile', label: 'Meu Perfil', icon: User },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900">Próximas Consultas</h3>
                  <button className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Agendar Nova Consulta
                  </button>
                </div>

                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma consulta agendada</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {patientRecord ? 'Agende sua próxima consulta clicando no botão acima' : 'Seu cadastro de paciente precisa ser vinculado para exibir consultas'}
                    </p>
                  </div>
                ) : (
                  upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="border border-gray-200 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-gray-900">{apt.doctorName}</h4>
                            <span className={`px-2 py-0.5 text-xs ${
                              apt.status === 'confirmado'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {apt.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{apt.specialty}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {apt.date} às {apt.time}
                            </span>
                            <span className="flex items-center gap-2">
                              {apt.type === 'telemedicina' ? (
                                <>
                                  <Video className="w-4 h-4" />
                                  Telemedicina
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  {apt.room || 'Presencial'}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {apt.type === 'telemedicina' && apt.telemedLink && (
                            <a
                              href={apt.telemedLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
                            >
                              <Video className="w-4 h-4" />
                              Entrar na Sala
                            </a>
                          )}
                          <button className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Records Tab */}
            {activeTab === 'records' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900">Histórico Médico</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-4 h-4" />
                    <span>Protegido por LGPD</span>
                  </div>
                </div>

                {patientMedicalRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum prontuário disponível</p>
                    <p className="text-sm text-gray-400 mt-1">Seus registros médicos aparecerão aqui após as consultas</p>
                  </div>
                ) : (
                  patientMedicalRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h4 className="text-gray-900">{record.type}</h4>
                            {record.signed && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700">Assinado</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Data:</strong> {record.date}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Profissional:</strong> {record.doctorName}
                          </p>
                          {record.cid10 && record.cid10 !== '-' && (
                            <p className="text-sm text-gray-600">
                              <strong>CID-10:</strong> {record.cid10}
                            </p>
                          )}
                          {record.chiefComplaint && (
                            <p className="text-sm text-gray-500 mt-1">{record.chiefComplaint}</p>
                          )}
                        </div>
                        <button className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
                          <Download className="w-4 h-4" />
                          Baixar PDF
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 mb-6">Histórico de Pagamentos</h3>

                {patientPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum pagamento registrado</p>
                    <p className="text-sm text-gray-400 mt-1">Seu histórico de pagamentos aparecerá aqui</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase">Data</th>
                          <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase">Descrição</th>
                          <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase">Valor</th>
                          <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase">Método</th>
                          <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase">Status</th>
                          <th className="px-6 py-4 text-right text-xs text-gray-600 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {patientPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-900">{payment.date}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{payment.type}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              R$ {payment.amount.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{payment.method}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs ${
                                payment.status === 'received'
                                  ? 'bg-green-100 text-green-700'
                                  : payment.status === 'overdue'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {payment.status === 'received' ? 'Recebido' : payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {payment.status === 'pending' ? (
                                <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm">
                                  Pagar Agora
                                </button>
                              ) : (
                                <button className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
                                  Ver Recibo
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-gray-900 mb-6">Meus Dados</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Nome Completo</label>
                    <input type="text" defaultValue={patientData.name}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">CPF</label>
                    <input type="text" defaultValue={patientData.cpf}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">E-mail</label>
                    <input type="email" defaultValue={patientData.email}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Telefone</label>
                    <input type="text" defaultValue={patientData.phone}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Data de Nascimento</label>
                    <input type="text" defaultValue={patientData.birthDate}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none" disabled />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Convênio</label>
                    <input type="text" defaultValue={patientData.insurance || 'Particular'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none" disabled />
                  </div>
                </div>

                <div className="p-5 bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Privacidade e Proteção de Dados</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD). Você tem direito a acessar, corrigir e solicitar a exclusão de suas informações.
                      </p>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Gerenciar Consentimentos LGPD →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
