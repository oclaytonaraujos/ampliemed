import { useState } from 'react';
import {
  Calendar, FileText, Download, CreditCard, User, Clock, Video, Shield,
  X, CheckCircle, Phone, Mail, AlertTriangle, Printer,
} from 'lucide-react';
import { useApp } from './AppContext';
import { downloadPDF } from '../utils/documentGenerators';
import type { MedicalRecord, ScheduleAppointment } from './AppContext';

type FinancialPayment = ReturnType<typeof useApp>['financialPayments'][0];

export function PatientPortal() {
  const {
    currentUser, patients, appointments, setAppointments,
    medicalRecords, financialPayments, clinicSettings,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'payments' | 'profile'>('appointments');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLGPDModal, setShowLGPDModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<FinancialPayment | null>(null);
  const [payingPayment, setPayingPayment] = useState<FinancialPayment | null>(null);

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCancelAppointment = (aptId: string) => {
    setAppointments(prev =>
      prev.map(a => a.id === aptId ? { ...a, status: 'cancelado' as const } : a)
    );
    setCancelConfirmId(null);
  };

  const handleDownloadRecord = (record: MedicalRecord) => {
    const clinic = clinicSettings.clinicName || 'Clínica';
    const html = `
      <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Prontuário - ${record.type}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
        h1 { font-size: 20px; border-bottom: 2px solid #ec4899; padding-bottom: 8px; }
        h2 { font-size: 14px; color: #6b7280; margin-top: 24px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        p { margin: 4px 0; font-size: 13px; }
        .section { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; margin-top: 4px; white-space: pre-wrap; font-size: 13px; }
        .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 11px; padding: 2px 8px; border-radius: 3px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .clinic { font-size: 12px; color: #6b7280; text-align: right; }
      </style></head><body>
      <div class="header">
        <div><h1>Prontuário Médico</h1><p><strong>Paciente:</strong> ${record.patientName}</p></div>
        <div class="clinic"><strong>${clinic}</strong><br>${clinicSettings.address || ''}<br>${clinicSettings.phone || ''}</div>
      </div>
      <p><strong>Tipo:</strong> ${record.type} ${record.signed ? '<span class="badge">Assinado</span>' : ''}</p>
      <p><strong>Data:</strong> ${record.date || record.createdAt}</p>
      <p><strong>Médico:</strong> ${record.doctorName}</p>
      ${record.cid10 && record.cid10 !== '-' ? `<p><strong>CID-10:</strong> ${record.cid10}</p>` : ''}
      ${record.chiefComplaint ? `<h2>Queixa Principal</h2><div class="section">${record.chiefComplaint}</div>` : ''}
      ${record.anamnesis ? `<h2>Anamnese</h2><div class="section">${record.anamnesis}</div>` : ''}
      ${record.physicalExam ? `<h2>Exame Físico</h2><div class="section">${record.physicalExam}</div>` : ''}
      ${record.conductPlan ? `<h2>Conduta / Plano</h2><div class="section">${record.conductPlan}</div>` : ''}
      ${record.prescriptions ? `<h2>Prescrições</h2><div class="section">${record.prescriptions}</div>` : ''}
      <p style="margin-top:32px;font-size:11px;color:#9ca3af;">
        Documento gerado em ${new Date().toLocaleDateString('pt-BR')} — ${clinic}
      </p>
      </body></html>
    `;
    downloadPDF(html, `prontuario_${record.type}_${record.date || record.createdAt}.pdf`);
  };

  const handleViewReceipt = (payment: FinancialPayment) => {
    setReceiptPayment(payment);
  };

  const handleDownloadReceipt = (payment: FinancialPayment) => {
    const clinic = clinicSettings.clinicName || 'Clínica';
    const html = `
      <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Recibo</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 60px; color: #111; max-width: 600px; }
        h1 { font-size: 22px; border-bottom: 2px solid #ec4899; padding-bottom: 8px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .label { color: #6b7280; }
        .total { font-size: 20px; font-weight: bold; color: #ec4899; }
        .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; }
      </style></head><body>
      <h1>Recibo de Pagamento</h1>
      <p style="color:#6b7280;font-size:13px;">${clinic}${clinicSettings.cnpj ? ' · CNPJ: ' + clinicSettings.cnpj : ''}</p>
      <div style="margin-top:24px;">
        <div class="row"><span class="label">Paciente</span><span>${payment.patient}</span></div>
        <div class="row"><span class="label">Data</span><span>${payment.date}</span></div>
        <div class="row"><span class="label">Descrição</span><span>${payment.type}</span></div>
        <div class="row"><span class="label">Método</span><span>${payment.method}</span></div>
        <div class="row"><span class="label">Status</span><span>${payment.status === 'received' ? 'Recebido' : payment.status}</span></div>
        <div class="row" style="border-bottom:none;margin-top:8px;"><span class="label total">Total</span><span class="total">R$ ${payment.amount.toFixed(2).replace('.', ',')}</span></div>
      </div>
      <p class="footer">Recibo gerado em ${new Date().toLocaleDateString('pt-BR')} · ${clinic}</p>
      </body></html>
    `;
    downloadPDF(html, `recibo_${payment.date}.pdf`);
    setReceiptPayment(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-pink-600 text-white p-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white mb-2">
                Bem-vindo{patientData.name ? `, ${patientData.name.split(' ')[0]}` : ' ao Portal do Paciente'}
              </h1>
              <p className="text-pink-100">Acesse seu histórico médico, consultas e muito mais</p>
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
          {[
            { icon: Calendar, value: upcomingAppointments.length, label: 'Consultas Agendadas' },
            { icon: FileText, value: patientMedicalRecords.length, label: 'Prontuários' },
            { icon: CreditCard, value: patientPayments.filter(p => p.status === 'pending').length, label: 'Pagamento Pendente' },
            { icon: Video, value: upcomingAppointments.filter(a => a.type === 'telemedicina').length, label: 'Telemedicina' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
                </div>
                <p className="text-sm text-gray-600">{s.label}</p>
              </div>
            );
          })}
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
                        ? 'border-pink-600 text-pink-600'
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
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors text-sm"
                  >
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
                                <><Video className="w-4 h-4" /> Telemedicina</>
                              ) : (
                                <><Clock className="w-4 h-4" /> {apt.room || 'Presencial'}</>
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
                              <Video className="w-4 h-4" /> Entrar na Sala
                            </a>
                          )}
                          <button
                            onClick={() => setCancelConfirmId(apt.id)}
                            className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm"
                          >
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
                            <FileText className="w-5 h-5 text-pink-600" />
                            <h4 className="text-gray-900">{record.type}</h4>
                            {record.signed && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Assinado
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1"><strong>Data:</strong> {record.date}</p>
                          <p className="text-sm text-gray-600 mb-1"><strong>Profissional:</strong> {record.doctorName}</p>
                          {record.cid10 && record.cid10 !== '-' && (
                            <p className="text-sm text-gray-600"><strong>CID-10:</strong> {record.cid10}</p>
                          )}
                          {record.chiefComplaint && (
                            <p className="text-sm text-gray-500 mt-1">{record.chiefComplaint}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownloadRecord(record)}
                          className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" /> Baixar PDF
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
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              R$ {payment.amount.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{payment.method}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs ${
                                payment.status === 'received' ? 'bg-green-100 text-green-700' :
                                payment.status === 'overdue'  ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {payment.status === 'received' ? 'Recebido' : payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {payment.status === 'pending' || payment.status === 'overdue' ? (
                                <button
                                  onClick={() => setPayingPayment(payment)}
                                  className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors text-sm"
                                >
                                  Pagar Agora
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleViewReceipt(payment)}
                                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm flex items-center gap-1 ml-auto"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Ver Recibo
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
                  {[
                    { label: 'Nome Completo', value: patientData.name, type: 'text' },
                    { label: 'CPF', value: patientData.cpf, type: 'text' },
                    { label: 'E-mail', value: patientData.email, type: 'email' },
                    { label: 'Telefone', value: patientData.phone, type: 'text' },
                    { label: 'Data de Nascimento', value: patientData.birthDate, type: 'text' },
                    { label: 'Convênio', value: patientData.insurance || 'Particular', type: 'text' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm text-gray-700 mb-2">{f.label}</label>
                      <input
                        type={f.type}
                        defaultValue={f.value}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none text-gray-700"
                        disabled
                      />
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  Para atualizar seus dados, entre em contato com a recepção da clínica.
                </div>

                <div className="p-5 bg-pink-50 border border-pink-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-pink-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Privacidade e Proteção de Dados</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD). Você tem direito a acessar, corrigir e solicitar a exclusão de suas informações.
                      </p>
                      <button
                        onClick={() => setShowLGPDModal(true)}
                        className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                      >
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

      {/* ── Modal: Agendar Consulta ──────────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Agendar Consulta</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Para agendar uma nova consulta, entre em contato com a clínica pelos canais abaixo:
              </p>
              <div className="space-y-3">
                {clinicSettings.phone && (
                  <a href={`tel:${clinicSettings.phone}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 hover:bg-pink-50 hover:border-pink-200 transition-colors">
                    <Phone className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="text-xs text-gray-500">Telefone</p>
                      <p className="text-sm font-medium text-gray-900">{clinicSettings.phone}</p>
                    </div>
                  </a>
                )}
                {clinicSettings.email && (
                  <a href={`mailto:${clinicSettings.email}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 hover:bg-pink-50 hover:border-pink-200 transition-colors">
                    <Mail className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="text-xs text-gray-500">E-mail</p>
                      <p className="text-sm font-medium text-gray-900">{clinicSettings.email}</p>
                    </div>
                  </a>
                )}
                {!clinicSettings.phone && !clinicSettings.email && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Contato da clínica não configurado. Consulte a recepção.
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowScheduleModal(false)}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cancelar Consulta ─────────────────────────────────────────── */}
      {cancelConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-sm w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-medium mb-1">Cancelar Consulta</h3>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCancelConfirmId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm transition-colors">
                Manter Consulta
              </button>
              <button
                onClick={() => handleCancelAppointment(cancelConfirmId)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-sm transition-colors"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Pagar Agora ───────────────────────────────────────────────── */}
      {payingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Pagamento</h3>
              <button onClick={() => setPayingPayment(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-pink-50 border border-pink-200 p-4 text-center">
                <p className="text-xs text-pink-600 mb-1">Valor a pagar</p>
                <p className="text-3xl font-bold text-pink-700">
                  R$ {payingPayment.amount.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-pink-500 mt-1">{payingPayment.type}</p>
              </div>
              <p className="text-sm text-gray-600">
                Para efetuar o pagamento, entre em contato com a clínica:
              </p>
              <div className="space-y-2">
                {clinicSettings.phone && (
                  <a href={`tel:${clinicSettings.phone}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 hover:bg-green-50 hover:border-green-200 transition-colors">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-900">{clinicSettings.phone}</span>
                  </a>
                )}
                {clinicSettings.email && (
                  <a href={`mailto:${clinicSettings.email}?subject=Pagamento - ${payingPayment.type}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-900">{clinicSettings.email}</span>
                  </a>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setPayingPayment(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ver Recibo ────────────────────────────────────────────────── */}
      {receiptPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Recibo de Pagamento</h3>
              <button onClick={() => setReceiptPayment(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Paciente', value: receiptPayment.patient },
                { label: 'Data', value: receiptPayment.date },
                { label: 'Descrição', value: receiptPayment.type },
                { label: 'Método', value: receiptPayment.method },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="text-gray-900">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-lg font-bold">
                <span className="text-gray-700">Total</span>
                <span className="text-pink-600">R$ {receiptPayment.amount.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setReceiptPayment(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm transition-colors">
                Fechar
              </button>
              <button
                onClick={() => handleDownloadReceipt(receiptPayment)}
                className="px-4 py-2.5 bg-pink-600 text-white hover:bg-pink-700 text-sm transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: LGPD ─────────────────────────────────────────────────────── */}
      {showLGPDModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-pink-600" />
                <h3 className="text-gray-900">Privacidade e LGPD</h3>
              </div>
              <button onClick={() => setShowLGPDModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem os seguintes direitos sobre seus dados pessoais:
              </p>

              {[
                { title: 'Dados armazenados', desc: 'Nome, CPF, RG, data de nascimento, contato, endereço, informações de saúde, histórico de consultas e pagamentos.' },
                { title: 'Finalidade', desc: 'Seus dados são utilizados exclusivamente para prestação de serviços de saúde, gestão de prontuários e comunicação com você.' },
                { title: 'Direito de acesso', desc: 'Você pode solicitar a qualquer momento um relatório completo dos seus dados armazenados.' },
                { title: 'Direito de correção', desc: 'Você pode solicitar a correção de dados incompletos, inexatos ou desatualizados.' },
                { title: 'Direito de exclusão', desc: 'Você pode solicitar a exclusão dos seus dados, respeitadas as obrigações legais de guarda de prontuários médicos (mínimo 20 anos conforme CFM).' },
              ].map(item => (
                <div key={item.title} className="border-l-4 border-pink-300 pl-4">
                  <p className="text-sm font-medium text-gray-900 mb-1">{item.title}</p>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </div>
              ))}

              <div className="bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Para exercer seus direitos:</p>
                <div className="space-y-2">
                  {clinicSettings.email && (
                    <a href={`mailto:${clinicSettings.email}?subject=Solicitação LGPD`}
                      className="flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700">
                      <Mail className="w-4 h-4" /> {clinicSettings.email}
                    </a>
                  )}
                  {clinicSettings.phone && (
                    <a href={`tel:${clinicSettings.phone}`}
                      className="flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700">
                      <Phone className="w-4 h-4" /> {clinicSettings.phone}
                    </a>
                  )}
                  {!clinicSettings.email && !clinicSettings.phone && (
                    <p className="text-sm text-gray-500">Contate a recepção da clínica pessoalmente.</p>
                  )}
                </div>
              </div>

              {patientRecord && (
                <div className={`p-3 flex items-center gap-2 text-sm ${
                  patientRecord.lgpdConsent
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                }`}>
                  {patientRecord.lgpdConsent ? (
                    <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Você forneceu consentimento LGPD em {patientRecord.lgpdConsentDate || '—'}.</>
                  ) : (
                    <><AlertTriangle className="w-4 h-4 flex-shrink-0" /> Seu consentimento LGPD está pendente. Solicite regularização na recepção.</>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowLGPDModal(false)}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 text-sm transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
