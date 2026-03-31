import { useState, useEffect, useRef } from 'react';
import type { UserRole } from '../App';
import { useApp } from './AppContext';
import { CheckCircle, User, Lock, Bell, Settings, Shield, Mail, Phone, Database, Trash2, AlertTriangle, Download, Upload, X, Building2 } from 'lucide-react';
import { medicalToast, toastError } from '../utils/toastService';
import { BackupRestore } from './BackupRestore';
import { useNavigate, useSearchParams } from 'react-router';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { FileUpload } from './FileUpload';
import { useAvatarUrl } from '../hooks/useFileUrl';
import * as api from '../utils/api';
import { Camera } from 'lucide-react';
import { getSupabase } from '../utils/supabaseClient';

interface SettingsModuleProps {
  userRole: UserRole;
}

export function SettingsModule({ userRole }: SettingsModuleProps) {
  const [searchParams] = useSearchParams();
  const validTabs = ['profile', 'clinic', 'security', 'notifications', 'system', 'privacy'];
  const initialTab = validTabs.includes(searchParams.get('tab') ?? '') ? searchParams.get('tab')! : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'clinic', label: 'Clínica', icon: Building2 },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'notifications', label: 'Notificações', icon: Bell },

    { id: 'system', label: 'Sistema', icon: Settings },
    { id: 'privacy', label: 'Privacidade', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">Meu Perfil</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie as configurações do sistema e preferências</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Categorias</h3>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-pink-50 text-pink-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'clinic' && <ClinicSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}

            {activeTab === 'system' && <SystemSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { currentUser, updateCurrentUser } = useApp();
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    crm: currentUser?.crm || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    specialty: currentUser?.specialty || 'Clínica Geral',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [userId, setUserId] = useState<string>('default');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { url: avatarUrl } = useAvatarUrl(currentUser?.avatarPath);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) setUserId(data.session.user.id);
    });
  }, []);

  // Sync form when currentUser loads asynchronously from DB
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      name: currentUser?.name || prev.name,
      crm: currentUser?.crm || prev.crm,
      email: currentUser?.email || prev.email,
      phone: currentUser?.phone || prev.phone,
      specialty: currentUser?.specialty || prev.specialty,
    }));
  }, [currentUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `avatar_${Date.now()}.${ext}`;
      const { path } = await api.uploadFile(fileName, file, `avatars/${userId}`, 'avatars');
      updateCurrentUser({ avatarPath: path });
      await api.updateProfile({ avatar_path: path });
    } catch (err: any) {
      toastError(err.message || 'Erro ao enviar avatar');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    updateCurrentUser({ name: form.name, crm: form.crm, email: form.email, phone: form.phone, specialty: form.specialty });
    medicalToast.settingsSaved();
  };

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Informações do Perfil</h3>
      <div className="space-y-6">
        <div className="flex items-center gap-5 pb-6 border-b border-gray-200">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 bg-pink-100 flex items-center justify-center overflow-hidden rounded-full">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-pink-600">{currentUser?.initials || '?'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full"
              title="Alterar foto"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
            <p className="text-xs text-gray-500">{currentUser?.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              {avatarUploading ? 'Enviando...' : 'Clique na foto para alterar'}
            </p>
            {currentUser?.avatarPath && (
              <button
                type="button"
                onClick={() => { updateCurrentUser({ avatarPath: undefined }); api.updateProfile({ avatar_path: null }); }}
                className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remover foto
              </button>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Dados Pessoais</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nome Completo', key: 'name', type: 'text' },
              { label: 'CRM/CRO', key: 'crm', type: 'text' },
              { label: 'E-mail', key: 'email', type: 'email' },
              { label: 'Telefone', key: 'phone', type: 'tel' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-700 mb-2">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600" />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">Especialidade</label>
              <select value={form.specialty} onChange={(e) => setForm(p => ({ ...p, specialty: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600">
                {['Clínica Geral', 'Cardiologia', 'Dermatologia', 'Ortopedia', 'Pediatria', 'Ginecologia', 'Neurologia', 'Psiquiatria', 'Endocrinologia', 'Oncologia'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
}

function ClinicSettings() {
  const { currentUser, clinicSettings, updateClinicSettings } = useApp();
  const [form, setForm] = useState({
    clinicName: clinicSettings.clinicName || '',
    clinicCNPJ: clinicSettings.cnpj || '',
    clinicPhone: clinicSettings.phone || '',
    clinicAddress: clinicSettings.address || '',
    clinicInstagram: clinicSettings.instagram || '',
    clinicPortalUrl: clinicSettings.patientPortalUrl || '',
  });
  const [userId, setUserId] = useState<string>('default');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { url: logoUrl } = useAvatarUrl(clinicSettings.logoPath);

  useEffect(() => {
    setForm(prev => ({
      clinicName: clinicSettings.clinicName || prev.clinicName,
      clinicCNPJ: clinicSettings.cnpj || prev.clinicCNPJ,
      clinicPhone: clinicSettings.phone || prev.clinicPhone,
      clinicAddress: clinicSettings.address || prev.clinicAddress,
      clinicInstagram: clinicSettings.instagram || prev.clinicInstagram,
      clinicPortalUrl: clinicSettings.patientPortalUrl || prev.clinicPortalUrl,
    }));
  }, [clinicSettings]);

  useState(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) setUserId(data.session.user.id);
    });
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `logo_${Date.now()}.${ext}`;
      const { path } = await api.uploadFile(fileName, file, `logos/${userId}`, 'avatars');
      updateClinicSettings({ logoPath: path });
      medicalToast.settingsSaved();
    } catch (err: any) {
      toastError(err.message || 'Erro ao enviar logo');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    updateClinicSettings({
      clinicName: form.clinicName,
      cnpj: form.clinicCNPJ,
      phone: form.clinicPhone,
      address: form.clinicAddress,
      instagram: form.clinicInstagram,
      patientPortalUrl: form.clinicPortalUrl,
    });
    medicalToast.settingsSaved();
  };

  const clinicInitials = form.clinicName
    ? form.clinicName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'C';

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Dados da Clínica</h3>
      <div className="space-y-6">

        {/* Logo avatar */}
        <div className="flex items-center gap-5 pb-6 border-b border-gray-200">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 bg-pink-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo da clínica" className="w-full h-full object-contain" />
              ) : (
                <span className="text-3xl font-semibold text-pink-600">{clinicInitials}</span>
              )}
            </div>
            {/* Overlay de edição */}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              title="Alterar logo"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{form.clinicName || 'Nome da Clínica'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {logoUploading ? 'Enviando...' : 'Clique na imagem para alterar a logo'}
            </p>
            {logoUrl && (
              <button
                type="button"
                onClick={() => updateClinicSettings({ logoPath: undefined })}
                className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remover logo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Nome da Clínica', key: 'clinicName', type: 'text' },
            { label: 'CNPJ', key: 'clinicCNPJ', type: 'text' },
            { label: 'Telefone da Clínica', key: 'clinicPhone', type: 'tel' },
            { label: 'Endereço', key: 'clinicAddress', type: 'text' },
            { label: 'Instagram (ex: @suaclinica)', key: 'clinicInstagram', type: 'text' },
            { label: 'Link do Portal do Paciente', key: 'clinicPortalUrl', type: 'url' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm text-gray-700 mb-2">{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { clinicSettings, updateClinicSettings } = useApp();
  const orgao = clinicSettings.orgaoAutenticador;
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'ICP-Brasil' | 'outro'>('ICP-Brasil');
  const [identificacao, setIdentificacao] = useState('');

  // ── Password Change State ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // ── Password Strength ──
  function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Fraca', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Razoável', color: 'bg-orange-400' };
    if (score <= 3) return { level: 3, label: 'Boa', color: 'bg-yellow-400' };
    if (score <= 4) return { level: 4, label: 'Forte', color: 'bg-green-400' };
    return { level: 5, label: 'Muito forte', color: 'bg-green-600' };
  }

  const strength = getPasswordStrength(newPassword);

  // ── Handle Password Change (Supabase standard) ──
  async function handlePasswordChange() {
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    setPasswordChanging(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        // Map Supabase error messages to Portuguese
        if (error.message?.includes('same_password')) {
          setPasswordError('A nova senha deve ser diferente da senha atual.');
        } else if (error.message?.includes('weak_password')) {
          setPasswordError('A senha é muito fraca. Use pelo menos 8 caracteres com letras, números e símbolos.');
        } else {
          setPasswordError(error.message || 'Erro ao alterar senha.');
        }
        return;
      }
      setPasswordSuccess('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      medicalToast.settingsSaved();
    } catch (err: any) {
      setPasswordError(err.message || 'Erro inesperado ao alterar senha.');
    } finally {
      setPasswordChanging(false);
    }
  }


  // ── Órgão Autenticador handlers ──
  function handleSaveOrgao() {
    if (!nome.trim()) return;
    updateClinicSettings({ orgaoAutenticador: { nome: nome.trim(), tipo, identificacao: identificacao.trim() || undefined } });
    setShowForm(false);
    medicalToast.settingsSaved();
  }

  function handleRemoveOrgao() {
    updateClinicSettings({ orgaoAutenticador: undefined });
    setShowForm(false);
  }

  function handleOpenEdit() {
    setNome(orgao?.nome ?? '');
    setTipo(orgao?.tipo ?? 'ICP-Brasil');
    setIdentificacao(orgao?.identificacao ?? '');
    setShowForm(true);
  }

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Segurança e Acesso</h3>

      <div className="space-y-6">
        {/* ===================== PASSWORD CHANGE ===================== */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Alterar Senha</h4>
          <p className="text-xs text-gray-500 mb-4">
            Use a API do Supabase Auth para atualizar sua senha de forma segura.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Nova Senha</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2 pr-10 border border-gray-200 focus:outline-none focus:border-pink-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${strength.level <= 2 ? 'text-red-500' : strength.level <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                    Força: {strength.label}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
                  placeholder="Repita a nova senha"
                  className={`w-full px-4 py-2 pr-10 border focus:outline-none focus:border-pink-600 ${
                    confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>

            {/* Feedback messages */}
            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-sm text-green-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {passwordSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handlePasswordChange}
                disabled={passwordChanging || !newPassword || !confirmPassword}
                className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {passwordChanging && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                )}
                {passwordChanging ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>


        {/* ===================== ÓRGÃO AUTENTICADOR ===================== */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-900">Órgão Autenticador de Documentos</h4>
            <span className="text-xs text-gray-400">Opcional</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Se cadastrado, os documentos médicos serão autenticados por este órgão. Caso contrário, a autenticação é a assinatura do médico.
          </p>

          {!showForm && (
            orgao ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">{orgao.nome}</p>
                    <p className="text-xs text-green-700">
                      Tipo: {orgao.tipo === 'ICP-Brasil' ? 'ICP-Brasil' : 'Outro'}
                      {orgao.identificacao ? ` · ID: ${orgao.identificacao}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleOpenEdit} className="px-3 py-1.5 border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
                    Editar
                  </button>
                  <button onClick={handleRemoveOrgao} className="px-3 py-1.5 border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-900">Nenhum órgão autenticador cadastrado</p>
                    <p className="text-xs text-gray-500">Documentos serão autenticados pela assinatura do médico</p>
                  </div>
                </div>
                <button onClick={handleOpenEdit} className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
                  Cadastrar
                </button>
              </div>
            )
          )}

          {showForm && (
            <div className="p-4 border border-gray-200 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nome do Órgão</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: ICP-Brasil, Cartório 1º Ofício..."
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-pink-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'ICP-Brasil' | 'outro')}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-pink-600 bg-white"
                >
                  <option value="ICP-Brasil">ICP-Brasil</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Identificação / Número do Certificado (opcional)</label>
                <input
                  type="text"
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value)}
                  placeholder="Ex: A1-12345..."
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-pink-600"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveOrgao} disabled={!nome.trim()} className="px-4 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors disabled:opacity-50">
                  Salvar
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const notifications = [
    { id: 'appointments', label: 'Novos Agendamentos', description: 'Receber notificação de novas consultas' },
    { id: 'reminders', label: 'Lembretes de Consulta', description: 'Alertas antes das consultas agendadas' },
    { id: 'results', label: 'Resultados de Exames', description: 'Quando resultados de exames estiverem prontos' },
    { id: 'billing', label: 'Financeiro', description: 'Pagamentos e cobranças' },
    { id: 'system', label: 'Atualizações do Sistema', description: 'Novidades e manutenções' },
  ];

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Preferências de Notificação</h3>
      
      <div className="space-y-6">
        {/* Notification Channels */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Canais de Notificação</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-pink-600" />
              <Mail className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">E-mail</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-pink-600" />
              <Phone className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">SMS</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-pink-600" />
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Notificações Push</span>
            </label>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Tipos de Notificação</h4>
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{notif.label}</p>
                  <p className="text-xs text-gray-500">{notif.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:bg-pink-600 transition-colors">
                    <div className="h-6 w-5 bg-white border border-gray-300 transition-transform peer-checked:translate-x-6"></div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
}


function SystemSettings() {
  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Configurações do Sistema</h3>
      
      <div className="space-y-6">
        {/* Database */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Banco de Dados</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-pink-600" />
                <div>
                  <p className="text-sm text-gray-900">Backup Automático</p>
                  <p className="text-xs text-gray-500">Último backup: Hoje, 03:00</p>
                </div>
              </div>
              <button className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
                Configurar
              </button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Integrações</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200">
              <div>
                <p className="text-sm text-gray-900">TUSS/CID-10</p>
                <p className="text-xs text-gray-500">Versão 2024.1</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs">Ativo</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200">
              <div>
                <p className="text-sm text-gray-900">TISS (Faturamento)</p>
                <p className="text-xs text-gray-500">Versão 4.03</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs">Ativo</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200">
              <div>
                <p className="text-sm text-gray-900">WhatsApp Business API (Global)</p>
                <p className="text-xs text-gray-500">Instância única para todas as clínicas — configurada via variáveis de ambiente do servidor</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs">Global</span>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Exportar Dados</h4>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Baixar Relatório Completo
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}


function PrivacySettings() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleteError('');
    
    // Validate email confirmation
    if (emailConfirmation !== currentUser?.email) {
      setDeleteError('O e-mail não corresponde ao da sua conta.');
      return;
    }

    setDeleting(true);
    
    try {
      const accessToken = localStorage.getItem('supabase_access_token');
      
      if (!accessToken) {
        setDeleteError('Sessão expirada. Faça login novamente.');
        setDeleting(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d4766610/auth/delete-account`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir conta');
      }

      console.log('✅ Conta excluída com sucesso');
      
      // Clear session and redirect to login
      logout();
      navigate('/login');
      
    } catch (err: any) {
      console.error('❌ Erro ao excluir conta:', err);
      setDeleteError(err.message || 'Erro ao excluir conta. Tente novamente.');
      setDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Privacidade e LGPD</h3>
      
      <div className="space-y-6">
        {/* Data Collection */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Coleta de Dados</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Logs de Auditoria</p>
                <p className="text-xs text-gray-500">Registro de acessos e modificações</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked disabled className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-pink-600 opacity-50">
                  <div className="h-6 w-5 bg-white border border-gray-300 peer-checked:translate-x-6"></div>
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-500 bg-pink-50 p-3 border border-pink-200">
              <Shield className="w-4 h-4 inline mr-2" />
              Logs de auditoria são obrigatórios por conformidade com LGPD
            </p>
          </div>
        </div>

        {/* Data Retention */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Retenção de Dados</h4>
          <select className="w-full md:w-64 px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600">
            <option>5 anos (Padrão CFM)</option>
            <option>10 anos</option>
            <option>20 anos (Prontuários permanentes)</option>
          </select>
        </div>

        {/* Consent Management */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Gestão de Consentimento</h4>
          <div className="p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-900">Termos Aceitos por Pacientes</p>
              <span className="text-sm font-medium text-gray-400">Sem dados</span>
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div className="bg-gray-300 h-2" style={{ width: '0%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Nenhum paciente cadastrado ainda</p>
          </div>
        </div>

        {/* DANGER ZONE - Delete Account */}
        <div className="border-2 border-red-200 bg-red-50/50 p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900 mb-1">Zona de Perigo</h4>
              <p className="text-xs text-red-700">As ações abaixo são permanentes e não podem ser desfeitas</p>
            </div>
          </div>
          
          <div className="bg-white border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Excluir Conta Permanentemente</p>
                <p className="text-xs text-gray-500 mt-1">
                  Esta ação irá excluir sua conta e todos os dados associados a ela de forma irreversível
                </p>
              </div>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Conta
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">
            Salvar Configurações
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full border-2 border-red-300 shadow-xl">
            {/* Header */}
            <div className="bg-red-600 p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Confirmar Exclusão de Conta</h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-900 font-medium mb-2">⚠️ ATENÇÃO: Esta ação é irreversível!</p>
                <p className="text-xs text-red-700">
                  Ao confirmar, os seguintes dados serão excluídos permanentemente:
                </p>
                <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Seu perfil e credenciais de acesso</li>
                  <li>Todos os pacientes cadastrados por você</li>
                  <li>Histórico de agendamentos e consultas</li>
                  <li>Prontuários e dados médicos</li>
                  <li>Configurações e preferências</li>
                </ul>
              </div>

              {deleteError && (
                <div className="bg-red-100 border border-red-300 p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-xs text-red-700">{deleteError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Para confirmar, digite seu e-mail: <span className="text-red-600">{currentUser?.email}</span>
                </label>
                <input
                  type="email"
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-red-500 text-sm"
                  disabled={deleting}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmailConfirmation('');
                  setDeleteError('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || emailConfirmation !== currentUser?.email}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir Permanentemente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}