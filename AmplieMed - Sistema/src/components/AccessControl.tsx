import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Search, Lock, User, X, Mail, Phone, Eye, EyeOff, Loader2, AlertCircle, Filter, Download, FileText } from 'lucide-react';
import type { UserRole } from '../App';
import type { SystemUser } from './AppContext';
import type { ProfileType } from '../utils/api';
import { useApp } from './AppContext';
import { toastSuccess, toastError, toastWarning } from '../utils/toastService';
import { ROLE_LABELS, ROLE_COLORS, PERMISSIONS, type PermissionAction, type ModuleKey } from '../utils/permissions';
import * as api from '../utils/api';
import { exportAuditLog, exportAuditLogPDF } from '../utils/exportService';

interface AccessControlProps { userRole: UserRole; }


const actionIcon = (a: string) => {
  switch (a) {
    case 'create': return <FileText className="w-3 h-3" />;
    case 'read':   return <Eye className="w-3 h-3" />;
    case 'update': return <Edit className="w-3 h-3" />;
    case 'delete': return <Trash2 className="w-3 h-3" />;
    case 'login':
    case 'logout': return <Lock className="w-3 h-3" />;
    case 'export': return <Download className="w-3 h-3" />;
    case 'sign':   return <Shield className="w-3 h-3" />;
    default:       return <FileText className="w-3 h-3" />;
  }
};

const actionColor = (a: string) => {
  switch (a) {
    case 'create': return 'bg-green-50 text-green-700 border-green-200';
    case 'read':   return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'update': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'delete': return 'bg-red-50 text-red-700 border-red-200';
    case 'login':  return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'logout': return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'export': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'sign':   return 'bg-teal-50 text-teal-700 border-teal-200';
    default:       return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const actionLabel = (a: string) => {
  const map: Record<string, string> = {
    create: 'Criação', read: 'Leitura', update: 'Atualização', delete: 'Exclusão',
    login: 'Login', logout: 'Logout', export: 'Exportação', sign: 'Assinatura',
  };
  return map[a] || a;
};

// Módulos exibidos na tabela de permissões (subconjunto legível)
const PERM_MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'patients',      label: 'Pacientes' },
  { key: 'appointments',  label: 'Agendamentos' },
  { key: 'records',       label: 'Prontuários' },
  { key: 'exams',         label: 'Exames' },
  { key: 'queue',         label: 'Fila de Espera' },
  { key: 'financial',     label: 'Financeiro' },
  { key: 'stock',         label: 'Estoque' },
  { key: 'communication', label: 'Comunicação' },
  { key: 'telemedicine',  label: 'Telemedicina' },
  { key: 'reports',       label: 'Relatórios' },
  { key: 'settings',      label: 'Configurações' },
  { key: 'access',        label: 'Usuários/Acesso' },
  { key: 'audit',         label: 'Auditoria' },
];
const PERM_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'create', label: 'Criar' },
  { key: 'read',   label: 'Ler' },
  { key: 'update', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
  { key: 'export', label: 'Exportar' },
];

export function AccessControl({ userRole }: AccessControlProps) {
  const { systemUsers, updateSystemUser, deleteSystemUser, currentUser, addAuditEntry, auditLog, rolePermissions, setRolePermissions, userPermissions, setUserPermissions, selectedClinicId, profileTypes, addProfileType, updateProfileType, removeProfileType } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit'>('users');

  // Users tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('doctor');
  const [formData, setFormData] = useState<Partial<SystemUser> & { password?: string; specialty?: string; crm?: string; crm_uf?: string }>({ role: 'doctor', status: 'active' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Permissions tab state
  const [permSubTab, setPermSubTab] = useState<'profiles' | 'user'>('profiles');
  const [savingPermRole, setSavingPermRole] = useState<string | null>(null); // role being saved
  const [savingPermUser, setSavingPermUser] = useState<string | null>(null); // userId being saved
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Load permissions from DB when tab opens
  useEffect(() => {
    if (activeTab !== 'permissions' || !selectedClinicId) return;
    api.loadRolePermissions(selectedClinicId).then(setRolePermissions).catch(() => {});
    api.loadUserPermissions(selectedClinicId).then(setUserPermissions).catch(() => {});
  }, [activeTab, selectedClinicId]);

  // Helper: get effective actions for role+module (DB override or static fallback)
  // Accepts both base roles ('doctor', 'admin', etc.) and profile type IDs (UUID)
  const getEffectiveActions = (role: string, module: ModuleKey): PermissionAction[] => {
    // 1. Check for a specific override for this exact role/id
    const override = rolePermissions.find(r => r.role === role && r.module === module);
    if (override) return override.actions as PermissionAction[];
    // 2. If it's a profile type ID, fall back to its baseRole permissions
    const pt = profileTypes.find(p => p.id === role);
    if (pt) {
      const baseOverride = rolePermissions.find(r => r.role === pt.baseRole && r.module === module);
      if (baseOverride) return baseOverride.actions as PermissionAction[];
      return PERMISSIONS[pt.baseRole as UserRole]?.[module] ?? [];
    }
    // 3. Base role static permissions
    return PERMISSIONS[role as UserRole]?.[module] ?? [];
  };

  // Helper: get display name for any role (base or profile type)
  const getRoleName = (role: string): string =>
    ROLE_LABELS[role as UserRole] || profileTypes.find(pt => pt.id === role)?.name || role;

  // Helper: retorna as ações salvas como override do usuário (undefined = sem override)
  const getUserOverride = (userId: string, module: ModuleKey): PermissionAction[] | undefined => {
    const override = userPermissions.find(u => u.userId === userId && u.module === module);
    return override ? (override.actions as PermissionAction[]) : undefined;
  };

  // Helper: ações efetivas para um usuário (override próprio > permissões do perfil)
  const getEffectiveUserActions = (userId: string, userRole: string, module: ModuleKey): PermissionAction[] => {
    const override = getUserOverride(userId, module);
    return override ?? getEffectiveActions(userRole, module);
  };

  // Toggle a role permission action
  const toggleRoleAction = (role: string, module: ModuleKey, action: PermissionAction) => {
    const current = getEffectiveActions(role, module);
    const updated = current.includes(action) ? current.filter(a => a !== action) : [...current, action];
    setRolePermissions(prev => {
      const filtered = prev.filter(r => !(r.role === role && r.module === module));
      return [...filtered, { role, module, actions: updated }];
    });
  };

  // Toggle de ação para um usuário num módulo.
  // Se não havia override, inicializa a partir das permissões do perfil (não do zero).
  const toggleUserAction = (userId: string, userRole: string, module: ModuleKey, action: PermissionAction) => {
    const current = getEffectiveUserActions(userId, userRole, module);
    const updated = current.includes(action) ? current.filter(a => a !== action) : [...current, action];
    setUserPermissions(prev => {
      const filtered = prev.filter(u => !(u.userId === userId && u.module === module));
      return [...filtered, { userId, module, actions: updated }];
    });
  };

  // Remove o override de um módulo: o usuário volta a seguir as permissões do perfil
  const resetUserModule = (userId: string, module: ModuleKey) => {
    setUserPermissions(prev => prev.filter(u => !(u.userId === userId && u.module === module)));
  };

  // Save role permissions to DB
  const saveRolePermissions = async (role: string) => {
    if (!selectedClinicId) return;
    setSavingPermRole(role);
    const roleName = getRoleName(role);
    try {
      const roleRows = rolePermissions.filter(r => r.role === role);
      await Promise.all(roleRows.map(r => api.saveRolePermission(selectedClinicId, r.role, r.module, r.actions)));
      toastSuccess('Permissões de ' + roleName + ' salvas!');
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Acesso', description: 'Permissões do perfil ' + roleName + ' atualizadas', status: 'success' });
    } catch (err: any) {
      toastError('Erro ao salvar permissões', { description: err.message });
    } finally {
      setSavingPermRole(null);
    }
  };

  // Salva permissões de usuário: substitui tudo atomicamente (delete + insert).
  // Módulos sem override no estado voltam a seguir o perfil automaticamente.
  const saveUserPermissions = async (userId: string, userName: string) => {
    if (!selectedClinicId) return;
    setSavingPermUser(userId);
    try {
      const userRows = userPermissions
        .filter(u => u.userId === userId)
        .map(u => ({ module: u.module, actions: u.actions }));
      await api.replaceUserPermissions(selectedClinicId, userId, userRows);
      toastSuccess(`Permissões de ${userName} salvas!`);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Acesso', description: `Permissões individuais de ${userName} atualizadas`, status: 'success' });
    } catch (err: any) {
      toastError('Erro ao salvar permissões', { description: err.message });
    } finally {
      setSavingPermUser(null);
    }
  };

  // Profile types tab state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<ProfileType>>({ baseRole: 'doctor', color: '#6366f1', status: 'active' });
  const [profileFormErrors, setProfileFormErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const PRESET_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

  const openNewProfile = () => {
    setEditingProfileId(null);
    setProfileForm({ baseRole: 'doctor', color: '#6366f1', status: 'active' });
    setProfileFormErrors({});
    setShowProfileModal(true);
  };

  const openEditProfile = (pt: ProfileType) => {
    setEditingProfileId(pt.id);
    setProfileForm({ ...pt });
    setProfileFormErrors({});
    setShowProfileModal(true);
  };

  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!profileForm.name?.trim()) errors.name = 'Nome é obrigatório';
    setProfileFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm() || !selectedClinicId) return;
    setSavingProfile(true);
    try {
      const saved = await api.saveProfileType(selectedClinicId, {
        id: editingProfileId || undefined,
        name: profileForm.name!,
        description: profileForm.description,
        baseRole: profileForm.baseRole || 'doctor',
        color: profileForm.color || '#6366f1',
        status: profileForm.status || 'active',
      });
      if (editingProfileId) {
        updateProfileType(editingProfileId, saved);
        toastSuccess('Tipo de perfil atualizado!', { description: saved.name });
        addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Acesso', description: `Tipo de perfil atualizado: ${saved.name}`, status: 'success' });
      } else {
        addProfileType(saved);
        toastSuccess('Tipo de perfil criado!', { description: saved.name });
        addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Acesso', description: `Tipo de perfil criado: ${saved.name}`, status: 'success' });
      }
      setShowProfileModal(false);
    } catch (err: any) {
      toastError('Erro ao salvar tipo de perfil', { description: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async (pt: ProfileType) => {
    if (pt.isDefault) { toastWarning('Tipos padrão do sistema não podem ser excluídos. Você pode desativá-los.'); return; }
    setDeletingProfileId(pt.id);
    try {
      await api.deleteProfileType(pt.id);
      removeProfileType(pt.id);
      toastSuccess(`"${pt.name}" removido`);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Acesso', description: `Tipo de perfil removido: ${pt.name}`, status: 'success' });
    } catch (err: any) {
      toastError('Erro ao remover tipo de perfil', { description: err.message });
    } finally {
      setDeletingProfileId(null);
    }
  };

  // Audit tab state
  const [auditSearch, setAuditSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const PER_PAGE = 25;

  const filtered = systemUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEntries = auditLog.filter(entry => {
    const ms = entry.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      entry.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
      entry.module.toLowerCase().includes(auditSearch.toLowerCase());
    const ma = filterAction === 'all' || entry.action === filterAction;
    const mm = filterModule === 'all' || entry.module === filterModule;
    const ms2 = statusFilter === 'all' || entry.status === statusFilter;
    return ms && ma && mm && ms2;
  });

  const totalPages = Math.ceil(filteredEntries.length / PER_PAGE);
  const pagedEntries = filteredEntries.slice((auditPage - 1) * PER_PAGE, auditPage * PER_PAGE);
  const uniqueModules = Array.from(new Set(auditLog.map(e => e.module)));

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
      const data = {
        name: formData.name || '',
        email: formData.email || '',
        role: formData.role || 'doctor',
        status: formData.status || 'active',
        lastLogin: formData.lastLogin || '-',
        phone: formData.phone,
      };
      updateSystemUser(editingId!, data);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Acesso', description: `Usuário atualizado: ${data.name} (${ROLE_LABELS[data.role as UserRole]})`, status: 'success' });
      toastSuccess('Usuário atualizado!', { description: data.name });
      setShowModal(false);
    } catch (err: any) {
      toastError('Erro ao atualizar usuário', { description: err.message || 'Erro desconhecido' });
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

  const handleExportCSV = () => {
    try { exportAuditLog(filteredEntries); toastSuccess('Log exportado (CSV)', { description: `${filteredEntries.length} registros` }); }
    catch { toastError('Erro ao exportar'); }
  };

  const handleExportPDF = () => {
    try { exportAuditLogPDF(filteredEntries); toastSuccess('Log exportado (PDF)', { description: `${filteredEntries.length} registros` }); }
    catch { toastError('Erro ao gerar PDF'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Controle de Acesso</h2>
          <p className="text-gray-600">Usuários, perfis, permissões e auditoria do sistema</p>
        </div>
        {activeTab === 'audit' && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm rounded-lg">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 text-sm rounded-lg">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 bg-white w-fit rounded-lg overflow-hidden">
        {([
          { id: 'users',       label: `Usuários (${systemUsers.length})` },
          { id: 'permissions', label: 'Perfis e Permissões' },
          { id: 'audit',       label: 'Log de Auditoria' },
        ] as const).map((tab, i, arr) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm transition-colors ${i < arr.length - 1 ? 'border-r border-gray-200' : ''} ${activeTab === tab.id ? 'bg-pink-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar usuários..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg" />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-200 p-16 text-center rounded-lg">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum usuário encontrado</p>
              <p className="text-sm text-gray-400 mt-1">Os usuários do sistema são gerenciados pelo administrador da conta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(u => (
                <div key={u.id} className="bg-white border border-gray-200 p-5 flex items-center justify-between gap-4 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center rounded-full">
                      <span className="text-sm font-bold text-pink-700">{u.name.slice(0, 2).toUpperCase()}</span>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      title={u.status === 'active' ? 'Desativar acesso' : 'Ativar acesso'}
                    >
                      {u.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar permissões"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover acesso do sistema"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Profiles + Permissions Tab ── */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          {/* Sub-abas */}
          <div className="border-b border-gray-200 flex gap-6">
            <button onClick={() => setPermSubTab('profiles')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${permSubTab === 'profiles' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Perfis
            </button>
            <button onClick={() => setPermSubTab('user')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${permSubTab === 'user' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Por Usuário
            </button>
          </div>

          {/* Perfis + Permissões padrão */}
          {permSubTab === 'profiles' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Selecione um perfil para configurar suas permissões padrão</p>
                <button onClick={openNewProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 text-white text-xs rounded-lg hover:bg-pink-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Novo Tipo
                </button>
              </div>

              {/* Profile selector chips */}
              <div className="flex flex-wrap gap-2">
                {/* Base roles */}
                {(['admin', 'doctor', 'receptionist', 'financial'] as UserRole[]).map(r => (
                  <button key={r} onClick={() => setSelectedRole(r)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      selectedRole === r
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}>
                    <Shield className="w-3.5 h-3.5 opacity-60" />
                    <span>{ROLE_LABELS[r]}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">base</span>
                  </button>
                ))}
                {/* Custom profile types */}
                {profileTypes.map(pt => (
                  <div key={pt.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer select-none ${
                      selectedRole === pt.id
                        ? 'border-2 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                    style={selectedRole === pt.id
                      ? { borderColor: pt.color, backgroundColor: pt.color + '18', color: pt.color }
                      : {}}
                    onClick={() => setSelectedRole(pt.id)}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pt.color }} />
                    <span>{pt.name}</span>
                    {pt.isDefault && <span className="text-xs px-1.5 py-0.5 rounded bg-black/10 text-current opacity-60">padrão</span>}
                    {pt.status === 'inactive' && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-500">inativo</span>}
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); openEditProfile(pt); }}
                        className="p-0.5 rounded hover:bg-black/10 transition-colors" title="Editar">
                        <Edit className="w-3 h-3" />
                      </button>
                      {!pt.isDefault && (
                        <button onClick={e => { e.stopPropagation(); handleDeleteProfile(pt); }}
                          disabled={deletingProfileId === pt.id}
                          className="p-0.5 rounded hover:bg-black/10 transition-colors disabled:opacity-40" title="Excluir">
                          {deletingProfileId === pt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Permission table for selected profile */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Permissões padrão — {getRoleName(selectedRole)}</h3>
                    {(() => {
                      const pt = profileTypes.find(p => p.id === selectedRole);
                      return pt ? (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Herda de: {ROLE_LABELS[pt.baseRole as UserRole] || pt.baseRole}
                          {' · '}Permissões individuais de usuário sobrescrevem estas
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Permissões individuais de usuário sobrescrevem estas</p>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => saveRolePermissions(selectedRole)}
                    disabled={savingPermRole === selectedRole}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 text-white text-xs rounded-lg hover:bg-pink-700 disabled:opacity-50"
                  >
                    {savingPermRole === selectedRole && <Loader2 className="w-3 h-3 animate-spin" />}
                    Salvar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Módulo</th>
                      {PERM_ACTIONS.map(a => (
                        <th key={a.key} className="px-3 py-3 text-center text-xs text-gray-600 uppercase">{a.label}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {PERM_MODULES.map(({ key, label }) => {
                        const effective = getEffectiveActions(selectedRole, key);
                        return (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-sm text-gray-800">{label}</td>
                            {PERM_ACTIONS.map(a => (
                              <td key={a.key} className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={effective.includes(a.key)}
                                  onChange={() => toggleRoleAction(selectedRole, key, a.key)}
                                  className="w-4 h-4 accent-pink-600"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Permissões por Usuário */}
          {permSubTab === 'user' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Permissões individuais que sobrescrevem as do perfil.
                Módulos sem personalização seguem automaticamente as permissões do perfil — inclusive quando o perfil for editado.
              </p>
              {systemUsers.map(u => {
                const userOverrideCount = userPermissions.filter(up => up.userId === u.id).length;
                return (
                  <div key={u.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{u.name}</p>
                            {userOverrideCount > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                {userOverrideCount} personalizado{userOverrideCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{ROLE_LABELS[u.role as UserRole] ?? u.role} • {u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveUserPermissions(u.id, u.name)}
                          disabled={savingPermUser === u.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 text-white text-xs rounded-lg hover:bg-pink-700 disabled:opacity-50"
                        >
                          {savingPermUser === u.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Salvar
                        </button>
                        <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                          {expandedUser === u.id ? 'Recolher' : 'Editar'}
                        </button>
                      </div>
                    </div>
                    {expandedUser === u.id && (
                      <div className="border-t border-gray-100 overflow-x-auto">
                        <table className="w-full">
                          <thead><tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-2 text-left text-xs text-gray-500 uppercase">Módulo</th>
                            {PERM_ACTIONS.map(a => (
                              <th key={a.key} className="px-3 py-2 text-center text-xs text-gray-500 uppercase">{a.label}</th>
                            ))}
                            <th className="px-3 py-2 text-center text-xs text-gray-500 uppercase w-8" title="Resetar para permissões do perfil" />
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {PERM_MODULES.map(({ key, label }) => {
                              const override = getUserOverride(u.id, key);
                              const hasOverride = override !== undefined;
                              const effective = hasOverride ? override! : getEffectiveActions(u.role, key);
                              return (
                                <tr key={key} className={hasOverride ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-gray-50'}>
                                  <td className="px-5 py-2 text-sm text-gray-800">
                                    <div className="flex items-center gap-2">
                                      {label}
                                      {hasOverride && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">personalizado</span>
                                      )}
                                    </div>
                                  </td>
                                  {PERM_ACTIONS.map(a => (
                                    <td key={a.key} className="px-3 py-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={effective.includes(a.key)}
                                        onChange={() => toggleUserAction(u.id, u.role, key, a.key)}
                                        className="w-4 h-4 accent-pink-600"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-center">
                                    {hasOverride && (
                                      <button
                                        onClick={() => resetUserModule(u.id, key)}
                                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Resetar para permissões do perfil"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {userOverrideCount > 0 && (
                          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50">
                            <button
                              onClick={() => setUserPermissions(prev => prev.filter(up => up.userId !== u.id))}
                              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                            >
                              Resetar todos os módulos para o perfil
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {systemUsers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Nenhum usuário cadastrado</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Tab ── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Search + filters toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por usuário, módulo ou descrição..." value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border rounded-lg transition-colors ${showFilters ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ação</label>
                <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setAuditPage(1); }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none rounded-lg">
                  <option value="all">Todas</option>
                  {['create', 'update', 'delete', 'read', 'login', 'logout', 'export', 'sign'].map(a => (
                    <option key={a} value={a}>{actionLabel(a)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Módulo</label>
                <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setAuditPage(1); }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none rounded-lg">
                  <option value="all">Todos</option>
                  {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setAuditPage(1); }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none rounded-lg">
                  <option value="all">Todos</option>
                  <option value="success">Sucesso</option>
                  <option value="failed">Falhou</option>
                </select>
              </div>
              <button onClick={() => { setFilterAction('all'); setFilterModule('all'); setStatusFilter('all'); setAuditSearch(''); }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-lg">
                <X className="w-3 h-3" /> Limpar
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total de Registros', value: auditLog.length, color: 'text-pink-600' },
              { label: 'Hoje', value: auditLog.filter(e => e.timestamp.includes(new Date().toLocaleDateString('pt-BR').split('/').slice(0, 2).join('/'))).length, color: 'text-green-600' },
              { label: 'Ações de Exclusão', value: auditLog.filter(e => e.action === 'delete').length, color: 'text-red-600' },
              { label: 'Filtrados', value: filteredEntries.length, color: 'text-gray-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 p-4 rounded-lg">
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* LGPD badge */}
          <div className="bg-pink-50 border border-pink-200 p-4 flex items-center gap-3 rounded-lg">
            <Shield className="w-5 h-5 text-pink-600 flex-shrink-0" />
            <p className="text-sm text-pink-800">
              <strong>Conformidade LGPD/CFM:</strong> Este log registra automaticamente todas as ações críticas do sistema — criação, edição, exclusão, login/logout e exportações. Dados de saúde devem ser retidos por mínimo de 20 anos (CFM 1638/2002).
            </p>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Ação</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Módulo</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedEntries.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhuma entrada de auditoria encontrada</p>
                      <p className="text-sm text-gray-400 mt-1">As ações do sistema serão registradas automaticamente aqui.</p>
                    </td></tr>
                  ) : pagedEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{entry.timestamp}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{entry.user}</p>
                        <p className="text-xs text-gray-400 capitalize">{entry.userRole}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded ${actionColor(entry.action)}`}>
                          {actionIcon(entry.action)}{actionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{entry.module}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{entry.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry.ipAddress}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${entry.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {entry.status === 'success' ? 'Sucesso' : 'Falhou'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-500">Mostrando {(auditPage - 1) * PER_PAGE + 1}–{Math.min(auditPage * PER_PAGE, filteredEntries.length)} de {filteredEntries.length}</p>
                <div className="flex gap-2">
                  <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="px-3 py-1.5 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg">Anterior</button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">{auditPage}/{totalPages}</span>
                  <button onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))} disabled={auditPage === totalPages} className="px-3 py-1.5 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg">Próxima</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-lg shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Editar Usuário</h3>
                <p className="text-sm text-gray-500 mt-0.5">Atualize as informações do usuário</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo *</label>
                <input type="text" value={formData.name || ''}
                  onChange={(e) => { setFormData(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })); }}
                  className={`w-full px-3 py-2.5 bg-gray-50 border ${formErrors.name ? 'border-red-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500`} />
                {formErrors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail *</label>
                <input type="email" value={formData.email || ''}
                  onChange={(e) => { setFormData(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({ ...p, email: '' })); }}
                  className={`w-full px-3 py-2.5 bg-gray-50 border ${formErrors.email ? 'border-red-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500`} />
                {formErrors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                <input type="text" value={formData.phone || ''}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil de acesso</label>
                <select value={formData.role || 'doctor'}
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  {(['admin', 'doctor', 'receptionist', 'financial'] as UserRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select value={formData.status || 'active'} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" disabled={saving}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !formData.name || !formData.email}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Criar/Editar Tipo de Perfil */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-lg shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{editingProfileId ? 'Editar Tipo de Perfil' : 'Novo Tipo de Perfil'}</h3>
                <p className="text-sm text-gray-500 mt-0.5">Defina um tipo de profissional para uso no sistema</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do tipo *</label>
                <input type="text" placeholder="Ex: Fisioterapeuta, Nutricionista..." value={profileForm.name || ''}
                  onChange={(e) => { setProfileForm(p => ({ ...p, name: e.target.value })); setProfileFormErrors(p => ({ ...p, name: '' })); }}
                  className={`w-full px-3 py-2.5 bg-gray-50 border ${profileFormErrors.name ? 'border-red-400' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500`} />
                {profileFormErrors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{profileFormErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                <textarea placeholder="Descreva o papel deste tipo de profissional..." value={profileForm.description || ''}
                  onChange={(e) => setProfileForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil base (herança de permissões)</label>
                <select value={profileForm.baseRole || 'doctor'}
                  onChange={(e) => setProfileForm(p => ({ ...p, baseRole: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  {(['admin', 'doctor', 'receptionist', 'financial'] as UserRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">As permissões iniciais serão herdadas do perfil base selecionado.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cor de identificação</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setProfileForm(p => ({ ...p, color: c }))}
                      className={`w-7 h-7 rounded-full transition-transform ${profileForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={profileForm.color || '#6366f1'}
                    onChange={(e) => setProfileForm(p => ({ ...p, color: e.target.value }))}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0" title="Escolher cor personalizada" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select value={profileForm.status || 'active'} onChange={(e) => setProfileForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button onClick={() => setShowProfileModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" disabled={savingProfile}>
                Cancelar
              </button>
              <button onClick={handleSaveProfile} disabled={savingProfile || !profileForm.name}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
                {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingProfile ? 'Salvando...' : editingProfileId ? 'Salvar Alterações' : 'Criar Tipo de Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
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
                <p className="text-sm text-gray-600">Tem certeza que deseja remover <strong>{u.name}</strong>?</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm">Cancelar</button>
                <button onClick={() => confirmDelete(u)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm">Sim, Remover</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
