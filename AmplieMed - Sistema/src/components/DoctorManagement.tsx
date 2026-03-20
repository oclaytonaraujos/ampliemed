import { useState } from 'react';
import {
  Plus, Search, Edit, Trash2, UserPlus, Calendar, DollarSign,
  TrendingUp, Award, CheckCircle, Stethoscope,
  Phone, Mail, Shield, X, Download, Eye
} from 'lucide-react';
import type { UserRole } from '../App';
import type { Professional } from './AppContext';
import { useApp } from './AppContext';
import { toastSuccess, toastError, toastWarning } from '../utils/toastService';
import { exportToCSV } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface DoctorManagementProps {
  userRole: UserRole;
}

const SPECIALTIES = [
  'Cardiologia', 'Pediatria', 'Ortopedia', 'Ginecologia', 'Dermatologia',
  'Clínica Médica', 'Neurologia', 'Psiquiatria', 'Endocrinologia', 'Urologia',
  'Oftalmologia', 'Otorrinolaringologia', 'Oncologia', 'Reumatologia', 'Geriatria',
];

const EMPTY_FORM: Omit<Professional, 'id' | 'createdAt'> = {
  name: '', crm: '', crmUf: '', specialty: '', email: '', phone: '', cpf: '',
  digitalCertificate: 'none', certificateExpiry: '', status: 'active', clinics: [],
  role: 'doctor', paymentModel: 'percentage', revenuePercentage: 30,
  goalMonthlyConsultations: 0, goalMonthlyRevenue: 0,
};

export function DoctorManagement({ userRole }: DoctorManagementProps) {
  const { professionals, addProfessional, updateProfessional, deleteProfessional, appointments, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('doctors');

  const [view, setView] = useState<'list' | 'add' | 'edit' | 'details'>('list');
  const [selectedDoctor, setSelectedDoctor] = useState<Professional | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [form, setForm] = useState<Omit<Professional, 'id' | 'createdAt'>>(EMPTY_FORM);

  // Source: professionals with role=doctor (or no role set, treated as professional/doctor)
  const doctors = professionals.filter(p => p.role === 'doctor' || (!p.role && p.crm));

  let filteredDoctors = doctors;
  if (filterStatus !== 'all') filteredDoctors = filteredDoctors.filter(d => d.status === filterStatus);
  if (filterSpecialty) filteredDoctors = filteredDoctors.filter(d => d.specialty === filterSpecialty);
  if (searchTerm) {
    const t = searchTerm.toLowerCase();
    filteredDoctors = filteredDoctors.filter(d =>
      d.name.toLowerCase().includes(t) ||
      d.crm.includes(t) ||
      d.email.toLowerCase().includes(t) ||
      d.specialty.toLowerCase().includes(t)
    );
  }

  // Monthly stats from appointments
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getMonthlyConsultations = (doctorName: string) =>
    appointments.filter(a => a.doctorName === doctorName && a.date?.startsWith(monthStr)).length;

  const getMonthlyRevenue = (doctorName: string) =>
    appointments
      .filter(a => a.doctorName === doctorName && a.date?.startsWith(monthStr) && a.paymentStatus === 'pago')
      .reduce((sum, a) => sum + (a.paidAmount || a.consultationValue || 0), 0);

  const handleViewDetails = (doctor: Professional) => { setSelectedDoctor(doctor); setView('details'); };
  const handleEdit = (doctor: Professional) => { setSelectedDoctor(doctor); setForm({ ...doctor }); setView('edit'); };

  const handleDeactivate = (doctor: Professional) => {
    if (!canDelete) { toastError('Sem permissão para esta ação'); return; }
    updateProfessional(doctor.id, { status: doctor.status === 'active' ? 'inactive' : 'active' });
    const action = doctor.status === 'active' ? 'desativado' : 'reativado';
    toastSuccess(`Médico ${action}: ${doctor.name}`);
    addNotification({ type: 'security', title: `Médico ${action}`, message: `${doctor.name} foi ${action} do sistema`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Médicos', description: `Médico ${action}: ${doctor.name} (CRM ${doctor.crm}/${doctor.crmUf})`, status: 'success' });
  };

  const handleDelete = (doctor: Professional) => {
    if (!canDelete) { toastError('Sem permissão para esta ação'); return; }
    deleteProfessional(doctor.id);
    toastSuccess(`Médico removido: ${doctor.name}`);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Médicos', description: `Médico excluído: ${doctor.name} (CRM ${doctor.crm}/${doctor.crmUf})`, status: 'success' });
    setView('list');
  };

  const handleSave = () => {
    if (!form.name || !form.crm) { toastWarning('Nome e CRM são obrigatórios'); return; }
    if (view === 'edit' && selectedDoctor) {
      updateProfessional(selectedDoctor.id, { ...form });
      toastSuccess('Médico atualizado com sucesso!');
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Médicos', description: `Médico editado: ${form.name}`, status: 'success' });
    } else {
      addProfessional({ ...form, role: 'doctor' });
      toastSuccess('Médico cadastrado com sucesso!');
      addNotification({ type: 'info', title: 'Novo médico cadastrado', message: `${form.name} (CRM ${form.crm}/${form.crmUf}) adicionado ao sistema`, urgent: false });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Médicos', description: `Novo médico: ${form.name} (CRM ${form.crm}/${form.crmUf})`, status: 'success' });
    }
    setForm(EMPTY_FORM);
    setView('list');
  };

  const handleExportCSV = () => {
    const data = filteredDoctors.map(d => ({
      nome: d.name,
      crm: `${d.crm}/${d.crmUf}`,
      especialidade: d.specialty,
      email: d.email,
      telefone: d.phone,
      status: d.status === 'active' ? 'Ativo' : 'Inativo',
      certificado_digital: d.digitalCertificate,
      consultas_mes: getMonthlyConsultations(d.name),
      receita_mes: `R$ ${getMonthlyRevenue(d.name).toFixed(2)}`,
    }));
    exportToCSV(data, 'medicos', [
      { key: 'nome', label: 'Nome' },
      { key: 'crm', label: 'CRM' },
      { key: 'especialidade', label: 'Especialidade' },
      { key: 'email', label: 'E-mail' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'status', label: 'Status' },
      { key: 'certificado_digital', label: 'Certificado Digital' },
      { key: 'consultas_mes', label: 'Consultas/Mês' },
      { key: 'receita_mes', label: 'Receita/Mês' },
    ]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Médicos', description: `${filteredDoctors.length} médicos exportados`, status: 'success' });
    toastSuccess('Médicos exportados!');
  };

  const totalConsultationsMonth = doctors.reduce((sum, d) => sum + getMonthlyConsultations(d.name), 0);
  const totalRevenueMonth = doctors.reduce((sum, d) => sum + getMonthlyRevenue(d.name), 0);
  const activeDoctors = doctors.filter(d => d.status === 'active').length;

  const getPaymentModelLabel = (model?: string) => ({
    fixed: 'Salário Fixo', percentage: 'Percentual', procedure: 'Por Procedimento', mixed: 'Misto',
  }[model || ''] || 'Não configurado');

  const renderCard = (doctor: Professional) => {
    const consultations = getMonthlyConsultations(doctor.name);
    const revenue = getMonthlyRevenue(doctor.name);
    const goalC = doctor.goalMonthlyConsultations || 0;
    const goalR = doctor.goalMonthlyRevenue || 0;
    const pctC = goalC > 0 ? Math.min(Math.round((consultations / goalC) * 100), 100) : 0;
    const pctR = goalR > 0 ? Math.min(Math.round((revenue / goalR) * 100), 100) : 0;

    return (
      <div key={doctor.id} className="border border-gray-300 bg-white p-4 hover:border-blue-600 transition-colors">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900">{doctor.name}</h3>
                <p className="text-sm text-gray-600">
                  CRM {doctor.crm}/{doctor.crmUf} • {doctor.specialty}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs border flex-shrink-0 ${
                doctor.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}>
                {doctor.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{doctor.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{doctor.email || '—'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Shield className="w-3 h-3 flex-shrink-0" />
                <span>Cert. {doctor.digitalCertificate}</span>
              </div>
            </div>

            {/* Desempenho do mês */}
            <div className="bg-gray-50 border border-gray-200 p-3 mb-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Desempenho — {now.toLocaleDateString('pt-BR', { month: 'long' })}</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Consultas</p>
                  <p className="font-bold text-gray-900">{consultations}{goalC > 0 ? `/${goalC}` : ''}</p>
                  {goalC > 0 && (
                    <div className="w-full bg-gray-200 h-1 mt-1">
                      <div className="bg-blue-600 h-1" style={{ width: `${pctC}%` }} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Receita</p>
                  <p className="font-bold text-gray-900">R$ {(revenue / 1000).toFixed(1)}k</p>
                  {goalR > 0 && (
                    <div className="w-full bg-gray-200 h-1 mt-1">
                      <div className="bg-green-600 h-1" style={{ width: `${pctR}%` }} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Satisfação</p>
                  <p className={`font-bold ${doctor.avgSatisfaction ? 'text-gray-900' : 'text-gray-400'}`}>
                    {doctor.avgSatisfaction ? `${doctor.avgSatisfaction.toFixed(1)}⭐` : 'N/D'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleViewDetails(doctor)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <Eye className="w-3 h-3" /> Detalhes
              </button>
              {(userRole === 'admin' || canUpdate) && (
                <button onClick={() => handleEdit(doctor)}
                  className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                  <Edit className="w-3 h-3" /> Editar
                </button>
              )}
              {(userRole === 'admin' || canDelete) && (
                <button onClick={() => handleDeactivate(doctor)}
                  className={`flex items-center gap-1 px-3 py-1 text-xs border transition-colors ${
                    doctor.status === 'active'
                      ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                      : 'border-green-300 text-green-600 hover:bg-green-50'
                  }`}>
                  {doctor.status === 'active' ? <><Trash2 className="w-3 h-3" /> Desativar</> : <><CheckCircle className="w-3 h-3" /> Reativar</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Médicos</h2>
          <p className="text-sm text-gray-600 mt-1">{filteredDoctors.length} médico(s) encontrado(s)</p>
        </div>
        <div className="flex items-center gap-3">
          {canExport && (
            <button onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          {(userRole === 'admin' || canCreate) && (
            <button onClick={() => { setForm(EMPTY_FORM); setView('add'); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Novo Médico
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar médico..." className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" />
        </div>
        <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
          className="px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
          <option value="">Todas as especialidades</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Stethoscope className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">{activeDoctors}</span>
          </div>
          <p className="text-sm text-blue-700 font-medium">Médicos Ativos</p>
        </div>
        <div className="bg-green-50 border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-green-900">{totalConsultationsMonth}</span>
          </div>
          <p className="text-sm text-green-700 font-medium">Consultas Este Mês</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-900">
              R$ {(totalRevenueMonth / 1000).toFixed(0)}k
            </span>
          </div>
          <p className="text-sm text-yellow-700 font-medium">Receita Total (Mês)</p>
        </div>
      </div>

      {/* Doctors List */}
      <div className="space-y-4">
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border border-gray-200">
            <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhum médico encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {doctors.length === 0
                ? 'Cadastre médicos clicando em "Novo Médico"'
                : 'Ajuste os filtros para ver mais resultados'}
            </p>
          </div>
        ) : (
          filteredDoctors.map(renderCard)
        )}
      </div>
    </div>
  );

  const renderDetails = () => {
    if (!selectedDoctor) return null;
    const consultations = getMonthlyConsultations(selectedDoctor.name);
    const revenue = getMonthlyRevenue(selectedDoctor.name);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedDoctor.name}</h2>
              <p className="text-sm text-gray-600">CRM {selectedDoctor.crm}/{selectedDoctor.crmUf} • {selectedDoctor.specialty}</p>
            </div>
          </div>
          {(userRole === 'admin' || canUpdate) && (
            <button onClick={() => handleEdit(selectedDoctor)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">
              <Edit className="w-4 h-4" /> Editar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="border border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Informações Pessoais</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">CPF</p><p className="font-medium">{selectedDoctor.cpf || '—'}</p></div>
                <div><p className="text-gray-500">Telefone</p><p className="font-medium">{selectedDoctor.phone || '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-500">E-mail</p><p className="font-medium">{selectedDoctor.email || '—'}</p></div>
              </div>
            </div>

            <div className="border border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Informações Profissionais</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">CRM</p><p className="font-medium">{selectedDoctor.crm}/{selectedDoctor.crmUf}</p></div>
                <div><p className="text-gray-500">Especialidade</p><p className="font-medium">{selectedDoctor.specialty || '—'}</p></div>
                <div><p className="text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-0.5 text-xs mt-1 ${selectedDoctor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedDoctor.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div><p className="text-gray-500">Membro desde</p><p className="font-medium">{selectedDoctor.createdAt}</p></div>
              </div>
            </div>

            <div className="border border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Performance — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-blue-50 border border-blue-200 text-center">
                  <p className="text-2xl font-bold text-blue-900">{consultations}</p>
                  <p className="text-xs text-blue-600 mt-1">Consultas</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 text-center">
                  <p className="text-2xl font-bold text-green-900">R$ {(revenue / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-green-600 mt-1">Receita</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 text-center">
                  {selectedDoctor.avgSatisfaction ? (
                    <>
                      <p className="text-2xl font-bold text-yellow-900">
                        {selectedDoctor.avgSatisfaction.toFixed(1)}⭐
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">Satisfação</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-400 mt-1">Não disponível</p>
                      <p className="text-xs text-gray-400 mt-0.5">Satisfação</p>
                      <p className="text-xs text-gray-300 mt-1">(módulo de avaliação não ativo)</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Certificado Digital</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-gray-500">Tipo</p><p className="font-medium">{selectedDoctor.digitalCertificate}</p></div>
                {selectedDoctor.certificateExpiry && (
                  <div><p className="text-gray-500">Validade</p><p className="font-medium">{selectedDoctor.certificateExpiry}</p></div>
                )}
              </div>
            </div>

            <div className="border border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Modelo de Pagamento</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-gray-500">Modelo</p><p className="font-medium">{getPaymentModelLabel(selectedDoctor.paymentModel)}</p></div>
                {selectedDoctor.fixedSalary && (
                  <div><p className="text-gray-500">Salário Fixo</p><p className="font-medium">R$ {selectedDoctor.fixedSalary.toLocaleString('pt-BR')}</p></div>
                )}
                {selectedDoctor.revenuePercentage && (
                  <div><p className="text-gray-500">Percentual</p><p className="font-medium">{selectedDoctor.revenuePercentage}%</p></div>
                )}
              </div>
            </div>

            {(userRole === 'admin' || canDelete) && (
              <div className="border border-red-200 p-4">
                <p className="text-xs text-red-600 font-medium mb-3">Zona de Perigo</p>
                <button onClick={() => handleDelete(selectedDoctor)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 transition-colors text-sm">
                  <Trash2 className="w-4 h-4" /> Remover do Sistema
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {view === 'edit' ? 'Editar Médico' : 'Novo Médico'}
        </h2>
      </div>

      <div className="bg-white border border-gray-200 p-6 space-y-6">
        <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="(00) 00000-0000" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="medico@clinica.com" />
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3 pt-2">Dados Profissionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CRM *</label>
            <input type="text" value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="000000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UF do CRM</label>
            <input type="text" value={form.crmUf} onChange={e => setForm({ ...form, crmUf: e.target.value.toUpperCase().slice(0, 2) })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="SP" maxLength={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
            <select value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
              <option value="">Selecione</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certificado Digital</label>
            <select value={form.digitalCertificate} onChange={e => setForm({ ...form, digitalCertificate: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
              <option value="none">Nenhum</option>
              <option value="A1">A1</option>
              <option value="A3">A3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validade do Certificado</label>
            <input type="date" value={form.certificateExpiry} onChange={e => setForm({ ...form, certificateExpiry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3 pt-2">Modelo Financeiro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Pagamento</label>
            <select value={form.paymentModel || 'percentage'} onChange={e => setForm({ ...form, paymentModel: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
              <option value="fixed">Salário Fixo</option>
              <option value="percentage">Percentual da Receita</option>
              <option value="procedure">Por Procedimento</option>
              <option value="mixed">Misto</option>
            </select>
          </div>
          {(form.paymentModel === 'fixed' || form.paymentModel === 'mixed') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salário Fixo (R$)</label>
              <input type="number" value={form.fixedSalary || ''} onChange={e => setForm({ ...form, fixedSalary: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="0.00" />
            </div>
          )}
          {(form.paymentModel === 'percentage' || form.paymentModel === 'mixed') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentual (%)</label>
              <input type="number" value={form.revenuePercentage || ''} onChange={e => setForm({ ...form, revenuePercentage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600" placeholder="30" min={0} max={100} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={() => setView('list')}
          className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          {view === 'edit' ? 'Salvar Alterações' : 'Cadastrar Médico'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {view === 'list' && renderList()}
      {view === 'details' && renderDetails()}
      {(view === 'add' || view === 'edit') && renderForm()}
    </div>
  );
}
