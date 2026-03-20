import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Edit, Trash2, User, MapPin, Phone, Mail, Calendar, CreditCard,
  Shield, CheckCircle, Clock, DollarSign, Activity, MessageSquare, Video,
  Printer, Send, FileText, Stethoscope, History, Paperclip, ChevronRight,
  Building, AlertCircle, FlaskConical, ClipboardList, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import type { Patient } from './AppContext';
import { useApp } from './AppContext';
import { FileUpload } from './FileUpload';

interface PatientDetailViewProps {
  patient: Patient;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  userRole: 'admin' | 'doctor' | 'receptionist' | 'financial';
}

type TabId = 'overview' | 'records' | 'exams' | 'appointments' | 'financial' | 'documents' | 'activity';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Visão Geral', icon: User },
  { id: 'records', label: 'Prontuários', icon: ClipboardList },
  { id: 'exams', label: 'Exames', icon: FlaskConical },
  { id: 'appointments', label: 'Consultas', icon: Calendar },
  { id: 'financial', label: 'Financeiro', icon: DollarSign },
  { id: 'documents', label: 'Documentos', icon: Paperclip },
  { id: 'activity', label: 'Atividades', icon: History },
];

export function PatientDetailView({ patient, onClose, onEdit, onDelete, userRole }: PatientDetailViewProps) {
  const {
    getAttachmentsByEntity, addFileAttachment, deleteFileAttachment,
    currentUser, appointments, financialPayments, auditLog,
    medicalRecords, exams
  } = useApp();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [recordDateFrom, setRecordDateFrom] = useState('');
  const [recordDateTo, setRecordDateTo] = useState('');
  const [examDateFrom, setExamDateFrom] = useState('');
  const [examDateTo, setExamDateTo] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
  const [examStatusFilter, setExamStatusFilter] = useState<string>('all');

  // ── Data filtering ────────────────────────────────────────────────────────
  const patientDocs = getAttachmentsByEntity('patient', patient.id);

  const appointmentHistory = appointments
    .filter(a => a.patientName === patient.name || a.patientCPF === patient.cpf)
    .sort((a, b) => b.date.localeCompare(a.date));

  const patientRecords = medicalRecords
    .filter(r => r.patientId === patient.id || r.patientName === patient.name)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filteredRecords = patientRecords.filter(r => {
    const dateRef = r.date || r.createdAt;
    if (recordDateFrom && dateRef < recordDateFrom) return false;
    if (recordDateTo && dateRef > recordDateTo) return false;
    if (recordTypeFilter !== 'all' && r.type !== recordTypeFilter) return false;
    return true;
  });

  const patientExams = exams
    .filter(e => e.patientId === patient.id || e.patientName === patient.name)
    .sort((a, b) => b.requestDate.localeCompare(a.requestDate));

  const filteredExams = patientExams.filter(e => {
    if (examDateFrom && e.requestDate < examDateFrom) return false;
    if (examDateTo && e.requestDate > examDateTo) return false;
    if (examStatusFilter !== 'all' && e.status !== examStatusFilter) return false;
    return true;
  });

  const financialHistory = financialPayments
    .filter(p => p.patient === patient.name)
    .sort((a, b) => b.date.localeCompare(a.date));

  const activityLog2 = auditLog
    .filter(e => e.description.includes(patient.name))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 30);

  const totalPaid = financialHistory
    .filter(p => p.status === 'received')
    .reduce((sum, p) => sum + p.amount, 0);

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tabCounts: Partial<Record<TabId, number>> = {
    records: filteredRecords.length,
    exams: filteredExams.length,
    appointments: appointmentHistory.length,
    financial: financialHistory.length,
    documents: patientDocs.length,
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusBadge = (status: string, map: Record<string, { label: string; cls: string }>) => {
    const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-0.5 text-xs rounded ${s.cls}`}>{s.label}</span>;
  };

  const recordTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Consulta': 'bg-blue-100 text-blue-700',
      'Telemedicina': 'bg-purple-100 text-purple-700',
      'Prescrição': 'bg-green-100 text-green-700',
      'Atestado': 'bg-yellow-100 text-yellow-700',
      'Retorno': 'bg-indigo-100 text-indigo-700',
      'Urgência': 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 text-xs rounded ${colors[type] || 'bg-gray-100 text-gray-700'}`}>{type}</span>;
  };

  const examStatusMap: Record<string, { label: string; cls: string }> = {
    solicitado: { label: 'Solicitado', cls: 'bg-yellow-100 text-yellow-700' },
    em_andamento: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700' },
    concluido: { label: 'Concluído', cls: 'bg-green-100 text-green-700' },
    atrasado: { label: 'Atrasado', cls: 'bg-red-100 text-red-700' },
  };

  const appointmentStatusMap: Record<string, { label: string; cls: string }> = {
    realizado: { label: 'Realizado', cls: 'bg-green-100 text-green-700' },
    confirmado: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-700' },
    cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
    pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
    agendado: { label: 'Agendado', cls: 'bg-yellow-100 text-yellow-700' },
  };

  // ── OVERVIEW TAB ──────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Dados Pessoais */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Dados Pessoais</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'CPF', value: patient.cpf },
              { label: 'RG', value: patient.rg },
              { label: 'Data de Nascimento', value: patient.birthDate },
              { label: 'Nome da Mãe', value: patient.motherName },
              { label: 'Estado Civil', value: patient.maritalStatus },
              { label: 'Profissão', value: patient.occupation },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                <p className="text-sm text-gray-900">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Contato</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Telefone Principal</p>
              <p className="text-sm text-gray-900">{patient.phone}</p>
            </div>
            {patient.phone2 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Telefone Secundário</p>
                <p className="text-sm text-gray-900">{patient.phone2}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">E-mail</p>
              <p className="text-sm text-gray-900">{patient.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Endereço</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">CEP</p>
              <p className="text-sm text-gray-900">{patient.address?.cep || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 mb-1">Endereço Completo</p>
              <p className="text-sm text-gray-900">
                {patient.address?.street ? (
                  <>
                    {patient.address.street}, {patient.address.number}
                    {patient.address.complement && ` - ${patient.address.complement}`}
                    {' - '}{patient.address.neighborhood} - {patient.address.city}/{patient.address.state}
                  </>
                ) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Convênio */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Convênio</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipo</p>
              <p className="text-sm text-gray-900">{patient.insurance || '—'}</p>
            </div>
            {patient.insuranceNumber && (
              <>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Número da Carteirinha</p>
                  <p className="text-sm text-gray-900">{patient.insuranceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Validade</p>
                  <p className="text-sm text-gray-900">{patient.insuranceValidity}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Informações Médicas */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Informações Médicas</h3>
          </div>
          <div className="space-y-4">
            {patient.allergies && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Alergias</p>
                <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">{patient.allergies}</p>
              </div>
            )}
            {patient.medications && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Medicamentos em Uso</p>
                <p className="text-sm text-gray-900 bg-blue-50 px-3 py-2 rounded border border-blue-200">{patient.medications}</p>
              </div>
            )}
            {patient.observations && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Observações</p>
                <p className="text-sm text-gray-900">{patient.observations}</p>
              </div>
            )}
            {!patient.allergies && !patient.medications && !patient.observations && (
              <p className="text-sm text-gray-500">Nenhuma informação médica registrada</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick summary cards linking to other tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { tab: 'records' as TabId, icon: ClipboardList, label: 'Prontuários', count: filteredRecords.length, color: 'indigo' },
          { tab: 'exams' as TabId, icon: FlaskConical, label: 'Exames', count: filteredExams.length, color: 'purple' },
          { tab: 'appointments' as TabId, icon: Calendar, label: 'Consultas', count: appointmentHistory.length, color: 'blue' },
          { tab: 'financial' as TabId, icon: DollarSign, label: 'Total Pago', count: `R$ ${totalPaid.toFixed(0)}`, color: 'green' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)}
              className={`bg-white border border-gray-200 p-4 rounded-lg hover:border-${item.color}-400 hover:shadow-sm transition-all text-left group`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 text-${item.color}-600`} />
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <p className={`text-xl font-bold text-${item.color}-700`}>{item.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── PRONTUÁRIOS TAB ───────────────────────────────────────────────────────
  const renderRecords = () => (
    <div className="space-y-4">
      {/* Filtros de período e tipo */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">De</label>
            <input type="date" value={recordDateFrom} onChange={e => setRecordDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Até</label>
            <input type="date" value={recordDateTo} onChange={e => setRecordDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Tipo</label>
            <select value={recordTypeFilter} onChange={e => setRecordTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="all">Todos</option>
              <option value="Consulta">Consulta</option>
              <option value="Telemedicina">Telemedicina</option>
              <option value="Prescrição">Prescrição</option>
              <option value="Atestado">Atestado</option>
              <option value="Retorno">Retorno</option>
              <option value="Urgência">Urgência</option>
            </select>
          </div>
          {(recordDateFrom || recordDateTo || recordTypeFilter !== 'all') && (
            <button onClick={() => { setRecordDateFrom(''); setRecordDateTo(''); setRecordTypeFilter('all'); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
              Limpar filtros
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500">
            {filteredRecords.length} de {patientRecords.length} prontuário(s)
          </div>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nenhum prontuário registrado</p>
          <p className="text-sm text-gray-400 mt-1">Os prontuários deste paciente aparecerão aqui após atendimentos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const isExpanded = expandedRecordId === record.id;
            return (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
                {/* Header row – always visible */}
                <button
                  onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {recordTypeBadge(record.type)}
                        {record.signed && (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Assinado
                          </span>
                        )}
                        {record.cid10 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">CID: {record.cid10}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {record.chiefComplaint || 'Sem queixa principal registrada'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {record.date || record.createdAt} • Dr(a). {record.doctorName}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-5 bg-gray-50 space-y-4">
                    {record.anamnesis && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Anamnese</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">{record.anamnesis}</p>
                      </div>
                    )}
                    {record.physicalExam && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Exame Físico</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">{record.physicalExam}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Queixa Principal</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">{record.chiefComplaint || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conduta / Plano</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">{record.conductPlan || '—'}</p>
                    </div>
                    {record.prescriptions && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Prescrições</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">{record.prescriptions}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                      <span>Criado em: {record.createdAt}</span>
                      {record.signedAt && <span>Assinado em: {record.signedAt}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── EXAMES TAB ────────────────────────────────────────────────────────────
  const renderExams = () => (
    <div className="space-y-4">
      {/* Filtros de período e status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">De</label>
            <input type="date" value={examDateFrom} onChange={e => setExamDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Até</label>
            <input type="date" value={examDateTo} onChange={e => setExamDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
            <select value={examStatusFilter} onChange={e => setExamStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="all">Todos</option>
              <option value="solicitado">Solicitado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
          {(examDateFrom || examDateTo || examStatusFilter !== 'all') && (
            <button onClick={() => { setExamDateFrom(''); setExamDateTo(''); setExamStatusFilter('all'); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
              Limpar filtros
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500">
            {filteredExams.length} de {patientExams.length} exame(s)
          </div>
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nenhum exame registrado</p>
          <p className="text-sm text-gray-400 mt-1">Os exames solicitados para este paciente aparecerão aqui</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Exame</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Solicitação</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Laboratório</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Solicitante</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Prioridade</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExams.map(exam => (
                  <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{exam.examType}</p>
                        {exam.tussCode && <p className="text-xs text-gray-500">TUSS: {exam.tussCode}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{exam.requestDate}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{exam.resultDate || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{exam.laboratory || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{exam.requestedBy}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 text-xs rounded ${exam.priority === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {exam.priority === 'urgente' ? 'Urgente' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {statusBadge(exam.status, examStatusMap)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredExams.some(e => e.notes) && (
            <div className="border-t border-gray-200 p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Observações dos Exames</p>
              {filteredExams.filter(e => e.notes).map(e => (
                <div key={e.id} className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="font-medium">{e.examType}:</span> {e.notes}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── CONSULTAS TAB ─────────────────────────────────────────────────────────
  const renderAppointments = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{appointmentHistory.length} consulta(s) encontrada(s)</p>

      {appointmentHistory.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nenhuma consulta registrada</p>
          <p className="text-sm text-gray-400 mt-1">As consultas agendadas para este paciente aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointmentHistory.map((apt) => (
            <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {apt.type === 'telemedicina' ? <Video className="w-5 h-5 text-blue-600" /> : <Stethoscope className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {apt.type === 'telemedicina' ? 'Telemedicina' : 'Consulta Presencial'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {apt.date} às {apt.time} • {apt.specialty}
                    </p>
                  </div>
                </div>
                {statusBadge(apt.status, appointmentStatusMap)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Médico</p>
                  <p className="text-gray-900">{apt.doctorName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Valor</p>
                  <p className="text-gray-900">
                    {apt.consultationValue ? `R$ ${apt.consultationValue.toFixed(2).replace('.', ',')}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Pagamento</p>
                  <p className={apt.paymentStatus === 'pago' ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                    {apt.paymentStatus === 'pago' ? 'Pago' :
                     apt.paymentStatus === 'pendente' ? 'Pendente' :
                     apt.paymentStatus === 'vencido' ? 'Vencido' : apt.paymentStatus || '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── FINANCEIRO TAB ────────────────────────────────────────────────────────
  const renderFinancial = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-xs text-green-600 mb-1">Total Pago</p>
          <p className="text-xl font-bold text-green-700">R$ {totalPaid.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-xs text-yellow-600 mb-1">Pendente</p>
          <p className="text-xl font-bold text-yellow-700">
            R$ {financialHistory.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0).toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-xs text-red-600 mb-1">Vencido</p>
          <p className="text-xl font-bold text-red-700">
            R$ {financialHistory.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0).toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {financialHistory.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nenhum pagamento registrado</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Descrição</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Valor</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Método</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {financialHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-900">{item.date}</td>
                    <td className="px-5 py-4 text-sm text-gray-900">{item.type}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      R$ {item.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{item.method}</td>
                    <td className="px-5 py-4">
                      {statusBadge(item.status, {
                        received: { label: 'Recebido', cls: 'bg-green-100 text-green-700' },
                        overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-700' },
                        pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ── DOCUMENTOS TAB ────────────────────────────────────────────────────────
  const renderDocuments = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <FileUpload
        bucketType="documents"
        folder={`patients/${patient.id}`}
        label="Anexar documento do paciente"
        description="PDF, Word, JPG, PNG — máx. 20 MB"
        multiple
        entityType="patient"
        entityId={patient.id}
        uploadedBy={currentUser?.name || ''}
        existingFiles={patientDocs}
        onUploadComplete={(file) => addFileAttachment(file)}
        onRemove={(id) => deleteFileAttachment(id)}
      />
    </div>
  );

  // ── ATIVIDADES TAB ────────────────────────────────────────────────────────
  const renderActivity = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {activityLog2.length === 0 ? (
        <div className="text-center py-10">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhuma atividade registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activityLog2.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-100 flex items-center justify-center flex-shrink-0 rounded">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                {index < activityLog2.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 ml-4 flex-shrink-0">{activity.timestamp}</p>
                </div>
                <p className="text-xs text-gray-600 mb-1">{activity.module}</p>
                <p className="text-xs text-gray-500">Por: {activity.user}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  const tabContent: Record<TabId, () => JSX.Element> = {
    overview: renderOverview,
    records: renderRecords,
    exams: renderExams,
    appointments: renderAppointments,
    financial: renderFinancial,
    documents: renderDocuments,
    activity: renderActivity,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para lista</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm">
            <Edit className="w-4 h-4" /> Editar
          </button>
          {userRole === 'admin' && (
            <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          )}
        </div>
      </div>

      {/* Patient header card */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {patient.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{patient.name}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{patient.age} anos</span>
                  <span>•</span>
                  <span>{patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro'}</span>
                  <span>•</span>
                  <span>{patient.occupation}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs rounded ${
                  patient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
                {patient.lgpdConsent ? (
                  <span className="px-3 py-1 text-xs bg-green-100 text-green-700 flex items-center gap-1 rounded">
                    <Shield className="w-3 h-3" /> LGPD
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs bg-red-100 text-red-700 flex items-center gap-1 rounded">
                    <AlertCircle className="w-3 h-3" /> LGPD Pendente
                  </span>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Consultas</p>
                  <p className="text-sm font-semibold text-gray-900">{patient.totalVisits}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <ClipboardList className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Prontuários</p>
                  <p className="text-sm font-semibold text-gray-900">{filteredRecords.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <FlaskConical className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Exames</p>
                  <p className="text-sm font-semibold text-gray-900">{filteredExams.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Última Visita</p>
                  <p className="text-sm font-semibold text-gray-900">{patient.lastVisit || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {tabContent[activeTab]()}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/agenda', { state: { preselectedPatient: { id: patient.id, name: patient.name, cpf: patient.cpf, phone: patient.phone, insurance: patient.insurance } } })}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium">
            <Calendar className="w-4 h-4" /> Agendar Consulta
          </button>
          <button
            onClick={() => navigate('/prontuarios', { state: { preselectedPatient: { id: patient.id, name: patient.name, cpf: patient.cpf }, action: 'new' } })}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium">
            <FileText className="w-4 h-4" /> Novo Prontuário
          </button>
          <button
            onClick={() => navigate('/comunicacao', { state: { preselectedPatient: { id: patient.id, name: patient.name, phone: patient.phone, email: patient.email } } })}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm">
            <MessageSquare className="w-4 h-4" /> Enviar Mensagem
          </button>
          <button
            onClick={() => navigate('/exames', { state: { preselectedPatient: { id: patient.id, name: patient.name } } })}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm">
            <FlaskConical className="w-4 h-4" /> Solicitar Exame
          </button>
        </div>
      </div>
    </div>
  );
}