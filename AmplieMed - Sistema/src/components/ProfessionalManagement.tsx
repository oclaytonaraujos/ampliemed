import { useState } from 'react';
import {
  Plus, Search, Edit, Trash2, Filter, X, CheckCircle, AlertCircle,
  Shield, Mail, Phone, User, Download, Eye, Stethoscope,
  TrendingUp, DollarSign, Award, Calendar, KeyRound, ChevronDown
} from 'lucide-react';
import type { UserRole } from '../App';
import type { Professional } from './AppContext';
import { useApp } from './AppContext';
import { validateCPF } from '../utils/validators';
import { toastSuccess, toastError, toastWarning } from '../utils/toastService';
import { exportProfessionalsExcel } from '../utils/exportService';
import { usePermission } from './PermissionGuard';
import { getSupabase } from '../utils/supabaseClient';

interface ProfessionalManagementProps { userRole: UserRole; }

const SPECIALTIES = [
  'Cardiologia', 'Pediatria', 'Ortopedia', 'Ginecologia', 'Dermatologia',
  'Clínica Médica', 'Neurologia', 'Psiquiatria', 'Endocrinologia', 'Urologia',
  'Oftalmologia', 'Otorrinolaringologia', 'Oncologia', 'Reumatologia', 'Geriatria',
  'Cirurgia Geral', 'Anestesiologia', 'Radiologia', 'Patologia', 'Medicina do Trabalho',
];

const ROLES_PROF: { value: string; label: string }[] = [
  { value: 'doctor', label: 'Médico(a)' },
  { value: 'nurse', label: 'Enfermeiro(a)' },
  { value: 'technician', label: 'Técnico(a)' },
  { value: 'therapist', label: 'Terapeuta' },
  { value: 'nutritionist', label: 'Nutricionista' },
  { value: 'psychologist', label: 'Psicólogo(a)' },
  { value: 'pharmacist', label: 'Farmacêutico(a)' },
  { value: 'other', label: 'Outro' },
];

const EMPTY_FORM: Omit<Professional, 'id' | 'createdAt'> & { password?: string; otherProfessionalType?: string } = {
  name: '', crm: '', crmUf: '', specialty: '', email: '', phone: '', cpf: '',
  digitalCertificate: 'none', certificateExpiry: '', status: 'active', clinics: [],
  role: 'doctor', paymentModel: 'percentage', revenuePercentage: 30,
  goalMonthlyConsultations: 0, goalMonthlyRevenue: 0,
  password: '',
  room: '',
  otherProfessionalType: '',
};

export function ProfessionalManagement({ userRole }: ProfessionalManagementProps) {
  const { professionals, addProfessional, updateProfessional, deleteProfessional, appointments, addNotification, addAuditEntry, currentUser, addSystemUser, systemUsers } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('professionals');

  const [view, setView] = useState<'list' | 'add' | 'edit' | 'details'>('list');
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState('');
  const [form, setForm] = useState<Omit<Professional, 'id' | 'createdAt'> & { password?: string; otherProfessionalType?: string }>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);

  // Filtering
  let filtered = [...professionals];
  if (filterStatus !== 'all') filtered = filtered.filter(p => p.status === filterStatus);
  if (filterSpecialty) filtered = filtered.filter(p => p.specialty === filterSpecialty);
  if (filterRole) filtered = filtered.filter(p => (p.role || 'doctor') === filterRole);
  if (searchTerm) {
    const t = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(t) ||
      (p.crm || '').toLowerCase().includes(t) ||
      (p.email || '').toLowerCase().includes(t) ||
      (p.specialty || '').toLowerCase().includes(t)
    );
  }

  // Stats
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getMonthlyConsultations = (name: string) =>
    appointments.filter(a => a.doctorName === name && a.date?.startsWith(monthStr)).length;

  const getMonthlyRevenue = (name: string) =>
    appointments
      .filter(a => a.doctorName === name && a.date?.startsWith(monthStr) && a.paymentStatus === 'pago')
      .reduce((sum, a) => sum + (a.paidAmount || a.consultationValue || 0), 0);

  const activeProfessionals = professionals.filter(p => p.status === 'active').length;
  const withCertificate = professionals.filter(p => p.digitalCertificate !== 'none').length;

  const isCertExpiring = (expiry: string) => {
    if (!expiry) return false;
    const diff = (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff > 0;
  };

  const certExpiringCount = professionals.filter(p => isCertExpiring(p.certificateExpiry)).length;
  const totalConsultationsMonth = professionals.reduce((sum, p) => sum + getMonthlyConsultations(p.name), 0);
  const totalRevenueMonth = professionals.reduce((sum, p) => sum + getMonthlyRevenue(p.name), 0);

  const getRoleLabel = (role?: string) => ROLES_PROF.find(r => r.value === role)?.label || 'Médico(a)';

  const getPaymentModelLabel = (model?: string) => ({
    fixed: 'Salário Fixo', percentage: 'Percentual', procedure: 'Por Procedimento', mixed: 'Misto',
  }[model || ''] || 'Não configurado');

  const certColor = (t: string) => t === 'A1' ? 'bg-green-100 text-green-700' : t === 'A3' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-500';

  // Actions
  const handleViewDetails = (prof: Professional) => { setSelectedProf(prof); setView('details'); };
  const handleEdit = (prof: Professional) => { setSelectedProf(prof); setForm({ ...prof }); setErrors({}); setIsCreatingUser(false); setView('edit'); };
  const handleAdd = () => { setForm(EMPTY_FORM); setErrors({}); setIsCreatingUser(true); setView('add'); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Nome obrigatório';
    if (!form.specialty?.trim()) e.specialty = 'Especialidade obrigatória';
    if (form.role === 'doctor' && !form.crm?.trim()) e.crm = 'CRM obrigatório para médicos';
    if (form.cpf && !validateCPF(form.cpf)) e.cpf = 'CPF inválido';

    if (isCreatingUser) {
        if (!form.password) e.password = 'Senha obrigatória';
        if (form.password && form.password.length < 6) e.password = 'A senha deve ter no mínimo 6 caracteres';
        if (!form.email) e.email = 'E-mail obrigatório';
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (view === 'edit' && selectedProf) {
      if (isCreatingUser) {
        const { data, error } = await getSupabase().auth.signUp({
          email: form.email,
          password: form.password!,
        });
        if (error) {
          toastError('Erro ao criar usuário', { description: error.message });
          addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Profissionais', description: `Falha ao atribuir usuário: ${form.email}`, status: 'failure' });
          return;
        }
        if (data.user) {
          const { password, ...professionalData } = form;
          updateProfessional(selectedProf.id, { ...professionalData });
          const systemRole: import('../App').UserRole = 'doctor';
          addSystemUser({ name: form.name, email: form.email, role: systemRole, status: 'active', lastLogin: '-', phone: form.phone });
          toastSuccess('Usuário atribuído ao profissional!', { description: form.name });
          addNotification({ type: 'info', title: 'Acesso atribuído', message: `${form.name} agora possui acesso ao sistema.`, urgent: false });
          addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Profissionais', description: `Acesso de usuário atribuído a: ${form.name}`, status: 'success' });
          setView('list');
        }
      } else {
        updateProfessional(selectedProf.id, { ...form });
        toastSuccess('Profissional atualizado!', { description: form.name });
        addNotification({ type: 'info', title: 'Profissional atualizado', message: `Dados de ${form.name} atualizados`, urgent: false });
        addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Profissionais', description: `Profissional editado: ${form.name}`, status: 'success' });
        setView('list');
      }
    } else if (view === 'add') {
        if (isCreatingUser) {
            const { data, error } = await getSupabase().auth.signUp({
              email: form.email,
              password: form.password!,
            });
      
            if (error) {
              toastError('Erro ao criar usuário', { description: error.message });
              addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Profissionais', description: `Falha ao criar usuário: ${form.email}`, status: 'failure' });
              return;
            }
            if (data.user) {
              const { password, ...professionalData } = form;
              addProfessional({ ...professionalData, id: data.user.id });

              // Add to systemUsers so the professional appears in Access Control
              const systemRole: import('../App').UserRole = 'doctor';
              addSystemUser({
                name: form.name,
                email: form.email,
                role: systemRole,
                status: 'active',
                lastLogin: '-',
                phone: form.phone,
              });

              toastSuccess('Profissional e Usuário cadastrados!', { description: `${form.name} — ${form.specialty}` });
              addNotification({ type: 'info', title: 'Novo profissional', message: `${form.name} (${getRoleLabel(form.role)}) cadastrado com acesso ao sistema.`, urgent: false });
              addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Profissionais', description: `Profissional/usuário criado: ${form.name}`, status: 'success' });
              setView('list');
            }
        } else {
            const { password, ...professionalData } = form;
            const newId = crypto.randomUUID();
            addProfessional({ ...professionalData, id: newId });
            toastSuccess('Profissional cadastrado (sem acesso)!', { description: `${form.name} — ${form.specialty}` });
            addNotification({ type: 'info', title: 'Novo profissional (sem acesso)', message: `${form.name} (${getRoleLabel(form.role)}) cadastrado.`, urgent: false });
            addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Profissionais', description: `Profissional criado (sem acesso): ${form.name}`, status: 'success' });
            setView('list');
        }
    }
    setForm(EMPTY_FORM);
  };

  const handleToggleStatus = (prof: Professional) => {
    if (!canDelete) { toastError('Sem permissão'); return; }
    const newStatus = prof.status === 'active' ? 'inactive' : 'active';
    updateProfessional(prof.id, { status: newStatus });
    const label = newStatus === 'active' ? 'reativado' : 'desativado';
    toastSuccess(`${prof.name} ${label}`);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Profissionais', description: `Profissional ${label}: ${prof.name}`, status: 'success' });
  };

  const handleDelete = (prof: Professional) => {
    if (!canDelete) { toastError('Sem permissão'); return; }
    deleteProfessional(prof.id);
    toastSuccess(`${prof.name} removido`);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Profissionais', description: `Profissional removido: ${prof.name}`, status: 'success' });
    setView('list');
  };

  const handleExport = () => {
    try {
      exportProfessionalsExcel(filtered);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Profissionais', description: `${filtered.length} profissionais exportados`, status: 'success' });
      toastSuccess('Exportado com sucesso');
    } catch { toastError('Erro ao exportar'); }
  };

  // ── TABLE ROW ──────────────────────────────────────────────────────────────
  const renderCard = (prof: Professional) => {
    const isDoctor = prof.role === 'doctor' || (!prof.role && prof.crm);
    const hasUserAccess = prof.email && professionals.some(p => p.id === prof.id && p.email);

    return (
      <tr key={prof.id} className="hover:bg-gray-50 transition-colors group">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${isDoctor ? 'bg-pink-100 border-pink-200' : 'bg-purple-100 border-purple-200'} border flex items-center justify-center flex-shrink-0`}>
              {isDoctor ? <Stethoscope className="w-5 h-5 text-pink-600" /> : <User className="w-5 h-5 text-purple-600" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                {prof.name} {hasUserAccess && <KeyRound className="w-3 h-3 text-gray-400" title="Possui acesso ao sistema"/>}
              </p>
              <p className="text-xs text-gray-500">
                {prof.crm ? `CRM ${prof.crm}/${prof.crmUf} • ` : ''}{prof.specialty}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {prof.phone || '—'}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {prof.email || '—'}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span className={certColor(prof.digitalCertificate) + ' px-1 rounded text-xs'}>
                {prof.digitalCertificate === 'none' ? 'Sem cert.' : `Cert. ${prof.digitalCertificate}`}
              </span>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2 justify-end">
            <span className={`px-2 py-0.5 text-xs ${isDoctor ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
              {getRoleLabel(prof.role)}
            </span>
            <span className={`px-2 py-0.5 text-xs border ${
              prof.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              {prof.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <button onClick={() => handleViewDetails(prof)}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-pink-600 text-white hover:bg-pink-700 transition-colors">
              <Eye className="w-3 h-3" /> Detalhes
            </button>
            {canUpdate && (
              <button onClick={() => handleEdit(prof)}
                className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit className="w-3 h-3" /> Editar
              </button>
            )}
            {canDelete && (
              <button onClick={() => handleToggleStatus(prof)}
                className={`flex items-center gap-1 px-3 py-1 text-xs border transition-colors ${
                  prof.status === 'active'
                    ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}>
                {prof.status === 'active' ? 'Desativar' : <><CheckCircle className="w-3 h-3" /> Reativar</>}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const renderList = () => (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Gestão de Profissionais</h2>
          <p className="text-gray-600">Cadastro, performance e certificação digital dos profissionais da clínica</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch w-max">
            <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar profissional..."
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none focus:ring-0 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 text-sm transition-colors ${showFilters ? 'bg-pink-50' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">Filtros</span>
            </button>
            {canExport && (
              <button
                onClick={handleExport}
                title="Exportar Excel"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm transition-colors"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
          {canCreate && (
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Novo Profissional
            </button>
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
          <span>
            Resumo — Ativos: <span className="text-blue-600 font-semibold">{activeProfessionals}</span>
            {' · '}Com Certificado: <span className="text-green-600 font-semibold">{withCertificate}</span>
            {' · '}Cert. Vencendo: <span className="text-orange-600 font-semibold">{certExpiringCount}</span>
            {' · '}Consultas/Mês: <span className="text-indigo-600 font-semibold">{totalConsultationsMonth}</span>
            {' · '}Receita/Mês: <span className="text-emerald-600 font-semibold">R$ {(totalRevenueMonth / 1000).toFixed(0)}k</span>
          </span>
        </button>
        {statsExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
            {[
              { label: 'Ativos', value: activeProfessionals, color: 'text-blue-600' },
              { label: 'Com Certificado', value: withCertificate, color: 'text-green-600' },
              { label: 'Cert. Vencendo', value: certExpiringCount, color: 'text-orange-600' },
              { label: 'Consultas/Mês', value: totalConsultationsMonth, color: 'text-indigo-600' },
              { label: 'Receita/Mês', value: `R$ ${(totalRevenueMonth / 1000).toFixed(0)}k`, color: 'text-emerald-600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500">
                <option value="">Todos</option>
                {ROLES_PROF.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Especialidade</label>
              <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500">
                <option value="">Todas</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500">
                <option value="all">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={() => { setFilterRole(''); setFilterSpecialty(''); setFilterStatus('all'); }}
              className="text-xs text-pink-600 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Professionals Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Profissional
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Certificado
                </th>
                <th className="px-6 py-4 text-right text-xs text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="flex flex-col items-center"><User className="w-12 h-12 text-gray-300 mb-3" /><p className="text-gray-500 mb-1">Nenhum profissional encontrado</p><p className="text-sm text-gray-400">{professionals.length === 0
                    ? 'Cadastre profissionais clicando em "Novo Profissional"'
                    : 'Ajuste os filtros para ver mais resultados'}</p></div></td></tr>
              ) : (
                filtered.map(renderCard)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── DETAILS VIEW ──────────────────────────────────────────────────────────
  const renderDetails = () => {
    if (!selectedProf) return null;
    const consultations = getMonthlyConsultations(selectedProf.name);
    const revenue = getMonthlyRevenue(selectedProf.name);
    const isDoctor = selectedProf.role === 'doctor' || (!selectedProf.role && selectedProf.crm);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedProf.name}</h2>
              <p className="text-sm text-gray-600">
                {selectedProf.crm ? `CRM ${selectedProf.crm}/${selectedProf.crmUf} • ` : ''}
                {selectedProf.specialty} • {getRoleLabel(selectedProf.role)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <button onClick={() => handleEdit(selectedProf)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 rounded-lg text-sm">
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="border border-gray-200 p-6 rounded-lg bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Informações Pessoais</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">CPF</p><p className="font-medium">{selectedProf.cpf || '—'}</p></div>
                <div><p className="text-gray-500">Telefone</p><p className="font-medium">{selectedProf.phone || '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-500">E-mail</p><p className="font-medium">{selectedProf.email || '—'}</p></div>
              </div>
            </div>

            <div className="border border-gray-200 p-6 rounded-lg bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Informações Profissionais</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Tipo</p><p className="font-medium">{getRoleLabel(selectedProf.role)}</p></div>
                {selectedProf.crm && <div><p className="text-gray-500">CRM</p><p className="font-medium">{selectedProf.crm}/{selectedProf.crmUf}</p></div>}
                <div><p className="text-gray-500">Especialidade</p><p className="font-medium">{selectedProf.specialty || '—'}</p></div>
                <div><p className="text-gray-500">Sala</p><p className="font-medium">{selectedProf.room || '—'}</p></div>
                <div><p className="text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-0.5 text-xs mt-1 rounded ${selectedProf.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedProf.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div><p className="text-gray-500">Membro desde</p><p className="font-medium">{new Date(selectedProf.createdAt || Date.now()).toLocaleDateString()}</p></div>
              </div>
            </div>

            <div className="border border-gray-200 p-6 rounded-lg bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Performance — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-pink-50 border border-pink-200 text-center rounded-lg">
                  <p className="text-2xl font-bold text-pink-900">{consultations}</p>
                  <p className="text-xs text-pink-600 mt-1">Consultas</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 text-center rounded-lg">
                  <p className="text-2xl font-bold text-green-900">R$ {(revenue / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-green-600 mt-1">Receita</p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 text-center rounded-lg">
                  {selectedProf.avgSatisfaction ? (
                    <>
                      <p className="text-2xl font-bold text-yellow-900">{selectedProf.avgSatisfaction.toFixed(1)}⭐</p>
                      <p className="text-xs text-yellow-600 mt-1">Satisfação</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-400 mt-1">N/D</p>
                      <p className="text-xs text-gray-400 mt-0.5">Satisfação</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-200 p-6 rounded-lg bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Certificado Digital</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-gray-500">Tipo</p><p className="font-medium">{selectedProf.digitalCertificate === 'none' ? 'Sem certificado' : selectedProf.digitalCertificate}</p></div>
                {selectedProf.certificateExpiry && (
                  <div><p className="text-gray-500">Validade</p><p className="font-medium">{selectedProf.certificateExpiry}</p></div>
                )}
              </div>
            </div>

            <div className="border border-gray-200 p-6 rounded-lg bg-white">
              <h3 className="font-bold text-gray-900 mb-4">Modelo de Pagamento</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-gray-500">Modelo</p><p className="font-medium">{getPaymentModelLabel(selectedProf.paymentModel)}</p></div>
                {selectedProf.fixedSalary && (
                  <div><p className="text-gray-500">Salário Fixo</p><p className="font-medium">R$ {selectedProf.fixedSalary.toLocaleString('pt-BR')}</p></div>
                )}
                {selectedProf.revenuePercentage && (
                  <div><p className="text-gray-500">Percentual</p><p className="font-medium">{selectedProf.revenuePercentage}%</p></div>
                )}
              </div>
            </div>

            {canDelete && (
              <div className="border border-red-200 p-4 rounded-lg">
                <p className="text-xs text-red-600 font-medium mb-3">Zona de Perigo</p>
                <button onClick={() => handleDelete(selectedProf)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 transition-colors text-sm rounded-lg">
                  <Trash2 className="w-4 h-4" /> Remover do Sistema
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── FORM VIEW ─────────────────────────────────────────────────────────────
  const renderForm = () => {
    const isDoctor = form.role === 'doctor';

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {view === 'edit' ? 'Editar Profissional' : 'Novo Profissional'}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 p-6 space-y-6 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">Tipo de Profissional</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ROLES_PROF.map(r => (
                <button key={r.value} onClick={() => setForm({ ...form, role: r.value })}
                  className={`px-4 py-2.5 text-sm border rounded-lg transition-colors ${
                    form.role === r.value
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            {form.role === 'other' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Especifique o tipo</label>
                <input
                  type="text"
                  value={form.otherProfessionalType || ''}
                  onChange={e => setForm({ ...form, otherProfessionalType: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 border-gray-200"
                  placeholder="Ex: Fisioterapeuta"
                />
              </div>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3">Dados Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Nome completo" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.cpf ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="000.000.000-00" />
              {errors.cpf && <p className="text-xs text-red-600 mt-1">{errors.cpf}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="(00) 00000-0000" />
            </div>

          </div>

          <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3 pt-2">Dados Profissionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isDoctor && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CRM *</label>
                  <input type="text" value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.crm ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="000000" />
                  {errors.crm && <p className="text-xs text-red-600 mt-1">{errors.crm}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF do CRM</label>
                  <select value={form.crmUf} onChange={e => setForm({ ...form, crmUf: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                    <option value="">Selecione</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {!isDoctor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registro Profissional</label>
                <input type="text" value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="COREN, CRP, CRN..." />
              </div>
            )}
            <div className={isDoctor ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade *</label>
              {isDoctor ? (
                <select value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.specialty ? 'border-red-400' : 'border-gray-200'}`}>
                  <option value="">Selecione</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="text" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.specialty ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Área de atuação" />
              )}
              {errors.specialty && <p className="text-xs text-red-600 mt-1">{errors.specialety}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
              <input type="text" value={form.room || ''} onChange={e => setForm({ ...form, room: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Ex: Sala 10, Consultório 3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificado Digital</label>
              <select value={form.digitalCertificate} onChange={e => setForm({ ...form, digitalCertificate: e.target.value as any })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option value="none">Nenhum</option>
                <option value="A1">A1 (Software)</option>
                <option value="A3">A3 (Hardware/Token)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validade do Certificado</label>
              <input type="date" value={form.certificateExpiry} onChange={e => setForm({ ...form, certificateExpiry: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="0.00" />
              </div>
            )}
            {(form.paymentModel === 'percentage' || form.paymentModel === 'mixed') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Percentual (%)</label>
                <input type="number" value={form.revenuePercentage || ''} onChange={e => setForm({ ...form, revenuePercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="30" min={0} max={100} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Consultas/Mês</label>
              <input type="number" value={form.goalMonthlyConsultations || ''} onChange={e => setForm({ ...form, goalMonthlyConsultations: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Receita/Mês (R$)</label>
              <input type="number" value={form.goalMonthlyRevenue || ''} onChange={e => setForm({ ...form, goalMonthlyRevenue: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="0" min={0} />
            </div>
          </div>

          {(view === 'add' || view === 'edit') && (
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-3 pt-2">Acesso ao Sistema</h3>
          )}
          {(view === 'add' || view === 'edit') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                {view === 'edit' && systemUsers.some(u => u.email === form.email && form.email) ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle size={16} />
                    <span>Profissional já possui acesso ao sistema</span>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isCreatingUser} onChange={() => setIsCreatingUser(!isCreatingUser)} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                    <span className="text-sm font-medium text-gray-700">{view === 'add' ? 'Criar acesso de usuário' : 'Atribuir acesso de usuário'}</span>
                  </label>
                )}
              </div>

              {(isCreatingUser || view === 'edit') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isCreatingUser || (view === 'edit' && form.email) ? 'E-mail de Acesso *' : 'E-mail de Contato'}</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="profissional@clinica.com" />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
              )}

              {isCreatingUser && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Acesso *</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="Mínimo 6 caracteres" />
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setView('list')}
            className="px-6 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="px-6 py-2.5 bg-pink-600 text-white hover:bg-pink-700 rounded-lg transition-colors">
            {view === 'edit' ? 'Salvar Alterações' : 'Cadastrar Profissional'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {view === 'list' && renderList()}
      {view === 'details' && renderDetails()}
      {(view === 'add' || view === 'edit') && renderForm()}
    </div>
  );
}
