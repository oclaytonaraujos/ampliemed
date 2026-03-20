import { useState } from 'react';
import { Shield, Plus, Edit, Trash2, Search, CheckCircle, Lock, User, X, Mail, Phone, Eye, EyeOff, Loader2, Stethoscope, AlertCircle } from 'lucide-react';
import type { UserRole } from '../App';
import type { SystemUser } from './AppContext';
import { useApp } from './AppContext';
import { toastSuccess, toastError, toastWarning } from '../utils/toastService';
import { ROLE_LABELS, ROLE_COLORS } from '../utils/permissions';
import * as api from '../utils/api';

interface AccessControlProps { userRole: UserRole; }

const ROLE_PERMISSIONS: Record<UserRole, { module: string; create: boolean; read: boolean; update: boolean; delete: boolean }[]> = {
  admin: [
    { module: 'Pacientes', create: true, read: true, update: true, delete: true },
    { module: 'Agendamentos', create: true, read: true, update: true, delete: true },
    { module: 'Prontuários', create: true, read: true, update: true, delete: true },
    { module: 'Financeiro', create: true, read: true, update: true, delete: true },
    { module: 'Estoque', create: true, read: true, update: true, delete: true },
    { module: 'Usuários', create: true, read: true, update: true, delete: true },
    { module: 'Auditoria', create: false, read: true, update: false, delete: false },
    { module: 'Configurações', create: true, read: true, update: true, delete: true },
  ],
  doctor: [
    { module: 'Pacientes', create: true, read: true, update: true, delete: false },
    { module: 'Agendamentos', create: true, read: true, update: true, delete: false },
    { module: 'Prontuários', create: true, read: true, update: true, delete: false },
    { module: 'Financeiro', create: false, read: true, update: false, delete: false },
    { module: 'Estoque', create: false, read: true, update: false, delete: false },
    { module: 'Usuários', create: false, read: false, update: false, delete: false },
    { module: 'Auditoria', create: false, read: false, update: false, delete: false },
    { module: 'Configurações', create: false, read: true, update: false, delete: false },
  ],
  receptionist: [
    { module: 'Pacientes', create: true, read: true, update: true, delete: false },
    { module: 'Agendamentos', create: true, read: true, update: true, delete: false },
    { module: 'Prontuários', create: false, read: false, update: false, delete: false },
    { module: 'Financeiro', create: true, read: true, update: true, delete: false },
    { module: 'Estoque', create: false, read: true, update: false, delete: false },
    { module: 'Usuários', create: false, read: false, update: false, delete: false },
    { module: 'Auditoria', create: false, read: false, update: false, delete: false },
    { module: 'Configurações', create: false, read: false, update: false, delete: false },
  ],
  financial: [
    { module: 'Pacientes', create: false, read: true, update: true, delete: false },
    { module: 'Agendamentos', create: false, read: true, update: false, delete: false },
    { module: 'Prontuários', create: true, read: true, update: false, delete: false },
    { module: 'Financeiro', create: false, read: false, update: false, delete: false },
    { module: 'Estoque', create: false, read: true, update: true, delete: false },
    { module: 'Usuários', create: false, read: false, update: false, delete: false },
    { module: 'Auditoria', create: false, read: false, update: false, delete: false },
    { module: 'Configurações', create: false, read: false, update: false, delete: false },
  ],
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acesso completo a todos os módulos e configurações do sistema',
  doctor: 'Acesso a pacientes, agenda, prontuários e consultas',
  receptionist: 'Gestão de agenda, pacientes e recepção',
  financial: 'Acesso ao módulo financeiro e relatórios',
};

export function AccessControl({ userRole }: AccessControlProps) {
  const { systemUsers, addSystemUser, updateSystemUser, deleteSystemUser, currentUser, addNotification, addAuditEntry } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('doctor');
  const [formData, setFormData] = useState<Partial<SystemUser> & { password?: string; specialty?: string; crm?: string; crm_uf?: string }>({ role: 'doctor', status: 'active' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filtered = systemUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setFormData({ role: 'doctor', status: 'active', password: '' });
    setFormErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditingId(u.id);
    setFormData({ ...u });
    setFormErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Nome é obrigatório';
    if (!formData.email?.trim()) errors.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'E-mail inválido';

    if (!editingId) {
      if (!formData.password) errors.password = 'Senha é obrigatória';
      else if (formData.password.length < 6) errors.password = 'Mínimo 6 caracteres';
    }

    // Check duplicate email (only for new users or if email changed)
    if (formData.email) {
      const duplicate = systemUsers.find(u => u.email === formData.email && u.id !== editingId);
      if (duplicate) errors.email = 'Este e-mail já está em uso';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingId) {
        // Local update only (role, status, name, phone changes)
        const data = {
          name: formData.name || '',
          email: formData.email || '',
          role: formData.role || 'doctor',
          status: formData.status || 'active',
          lastLogin: formData.lastLogin || '-',
          phone: formData.phone
        };
        updateSystemUser(editingId, data);
        addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Acesso', description: `Usuário atualizado: ${data.name} (${ROLE_LABELS[data.role as UserRole]})`, status: 'success' });
        toastSuccess('Usuário atualizado!', { description: data.name });
      } else {
        // Create real Supabase auth user via API
        const result = await api.createUser({
          email: formData.email!,
          password: formData.password!,
          name: formData.name!,
          role: formData.role || 'doctor',
          phone: formData.phone || '',
          specialty: formData.specialty || '',
          crm: formData.crm || '',
          crm_uf: formData.crm_uf || '',
        });

        // Add to local systemUsers collection
        const userData = {
          name: formData.name || '',
          email: formData.email || '',
          role: (formData.role || 'doctor') as UserRole,
          status: 'active' as const,
          lastLogin: '-',
          phone: formData.phone,
        };
        addSystemUser(userData);

        addNotification({
          type: 'security',
          title: 'Novo usuário criado',
          message: `Usuário ${userData.name} criado com perfil ${ROLE_LABELS[userData.role]}`,
          urgent: false,
        });

        addAuditEntry({
          user: currentUser?.name || 'Sistema',
          userRole: currentUser?.role || 'admin',
          action: 'create',
          module: 'Acesso',
          description: `Usuário criado: ${userData.name} (${ROLE_LABELS[userData.role]}) — conta Supabase vinculada`,
          status: 'success',
        });

        toastSuccess('Usuário criado com sucesso!', {
          description: `${userData.name} — ${ROLE_LABELS[userData.role]}. O usuário já pode fazer login.`,
        });
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('[AccessControl] Erro ao criar usuário:', err);
      toastError(`Erro ao ${editingId ? 'atualizar' : 'criar'} usuário`, {
        description: err.message || 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (u: SystemUser) => {
    if (u.email === currentUser?.email) { toastWarning('Não é possível remover seu próprio usuário'); return; }
    setShowDeleteConfirm(u.id);
  };

  const confirmDelete = (u: SystemUser) => {
    deleteSystemUser(u.id);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Acesso', description: `Usuário removido: ${u.name}`, status: 'success' });
    toastSuccess(`${u.name} removido`);
    setShowDeleteConfirm(null);
  };

  const handleToggleStatus = (u: SystemUser) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    updateSystemUser(u.id, { status: newStatus });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Acesso', description: `Usuário ${u.name} ${newStatus === 'active' ? 'ativado' : 'desativado'}`, status: 'success' });
    toastSuccess(`${u.name} ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
  };

  const isDoctorRole = formData.role === 'doctor';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Controle de Acesso</h2>
          <p className="text-gray-600">Usuários, perfis e permissões granulares por módulo</p>
        </div>
        {activeTab === 'users' && (
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        )}
      </div>

      <div className="flex border border-gray-200 bg-white w-fit rounded-lg overflow-hidden">
        <button onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 text-sm border-r border-gray-200 transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
          Usuários ({systemUsers.length})
        </button>
        <button onClick={() => setActiveTab('permissions')}
          className={`px-5 py-2.5 text-sm transition-colors ${activeTab === 'permissions' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
          Permissões por Perfil
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar usuários..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg" />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-200 p-16 text-center rounded-lg">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum usuário cadastrado</p>
              <p className="text-sm text-gray-400 mt-1">Adicione usuários do sistema e defina seus perfis de acesso.</p>
              <button onClick={openAdd} className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm hover:bg-blue-700 rounded-lg inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar Primeiro Usuário
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(u => (
                <div key={u.id} className="bg-white border border-gray-200 p-5 flex items-center justify-between gap-4 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center rounded-full">
                      <span className="text-sm font-bold text-blue-700">{u.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">{u.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${ROLE_COLORS[u.role as UserRole] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {ROLE_LABELS[u.role as UserRole] || u.role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</span>
                        {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                        <span>Último acesso: {u.lastLogin}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleToggleStatus(u)}
                      className={`px-3 py-1.5 text-xs border rounded transition-colors ${u.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {u.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => openEdit(u)} className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                    {u.email !== currentUser?.email && (
                      <button onClick={() => handleDelete(u)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['admin', 'doctor', 'receptionist', 'financial'] as UserRole[]).map(r => (
              <button key={r} onClick={() => setSelectedRole(r)}
                className={`px-4 py-2 text-sm border rounded-lg transition-colors ${selectedRole === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Role description */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">{ROLE_DESCRIPTIONS[selectedRole]}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Permissões — {ROLE_LABELS[selectedRole]}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Módulo</th>
                  <th className="px-5 py-3 text-center text-xs text-gray-600 uppercase">Criar</th>
                  <th className="px-5 py-3 text-center text-xs text-gray-600 uppercase">Ler</th>
                  <th className="px-5 py-3 text-center text-xs text-gray-600 uppercase">Editar</th>
                  <th className="px-5 py-3 text-center text-xs text-gray-600 uppercase">Excluir</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {ROLE_PERMISSIONS[selectedRole]?.map(p => (
                    <tr key={p.module} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-800">{p.module}</td>
                      {(['create', 'read', 'update', 'delete'] as const).map(action => (
                        <td key={action} className="px-5 py-3 text-center">
                          {(p as any)[action]
                            ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            : <span className="block w-4 h-4 mx-auto border border-gray-200 rounded-full" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Novo / Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-lg shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editingId ? 'Atualize as informações do usuário' : 'Crie uma conta vinculada à empresa. O usuário poderá fazer login imediatamente.'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => { setFormData(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })); }}
                  placeholder="Ex: Dr. João Silva"
                  className={`w-full px-3 py-2.5 bg-gray-50 border ${formErrors.name ? 'border-red-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.name}</p>}
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => { setFormData(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({ ...p, email: '' })); }}
                  placeholder="usuario@clinica.com"
                  className={`w-full px-3 py-2.5 bg-gray-50 border ${formErrors.email ? 'border-red-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {formErrors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.email}</p>}
              </div>

              {/* Senha (only for new users) */}
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha inicial *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => { setFormData(p => ({ ...p, password: e.target.value })); setFormErrors(p => ({ ...p, password: '' })); }}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full px-3 py-2.5 pr-10 bg-gray-50 border ${formErrors.password ? 'border-red-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.password}</p>}
                  <p className="text-xs text-gray-400 mt-1">O usuário poderá alterar sua senha após o primeiro login</p>
                </div>
              )}

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Perfil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil de acesso *</label>
                <select
                  value={formData.role || 'doctor'}
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(['admin', 'doctor', 'receptionist', 'financial'] as UserRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[formData.role as UserRole || 'doctor']}</p>
              </div>

              {/* Doctor-specific fields */}
              {isDoctorRole && !editingId && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Dados do Médico</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Especialidade</label>
                    <input
                      type="text"
                      value={formData.specialty || ''}
                      onChange={(e) => setFormData(p => ({ ...p, specialty: e.target.value }))}
                      placeholder="Ex: Cardiologia"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CRM</label>
                      <input
                        type="text"
                        value={formData.crm || ''}
                        onChange={(e) => setFormData(p => ({ ...p, crm: e.target.value }))}
                        placeholder="123456"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">UF do CRM</label>
                      <select
                        value={formData.crm_uf || ''}
                        onChange={(e) => setFormData(p => ({ ...p, crm_uf: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Status (only for editing) */}
              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select value={formData.status || 'active'} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              )}

              {/* Info box for new users */}
              {!editingId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Uma conta será criada no Supabase Auth vinculada à empresa. O usuário poderá fazer login com o e-mail e senha definidos acima.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" disabled={saving}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !formData.name || !formData.email}
                className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Criando conta...' : editingId ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (() => {
        const u = systemUsers.find(su => su.id === showDeleteConfirm);
        if (!u) return null;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white max-w-sm w-full rounded-lg shadow-xl">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Remover Usuário</h3>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja remover <strong>{u.name}</strong>?
                  Esta ação remove o registro local. A conta Supabase Auth permanecerá ativa.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm">
                  Cancelar
                </button>
                <button onClick={() => confirmDelete(u)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm">
                  Sim, Remover
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
