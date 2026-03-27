import { useState, useEffect } from 'react';
import type { UserRole } from '../App';
import { useApp } from './AppContext';
import { CheckCircle, User, Lock, Bell, Palette, Settings, Shield, Mail, Phone, Globe, Database, Trash2, AlertTriangle, Download, Upload, X, MessageSquare, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { medicalToast } from '../utils/toastService';
import { BackupRestore } from './BackupRestore';
import { useNavigate, useSearchParams } from 'react-router';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { FileUpload } from './FileUpload';
import { useAvatarUrl } from '../hooks/useFileUrl';
import { getSupabase } from '../utils/supabaseClient';

interface SettingsModuleProps {
  userRole: UserRole;
}

export function SettingsModule({ userRole }: SettingsModuleProps) {
  const [searchParams] = useSearchParams();
  const validTabs = ['profile', 'security', 'notifications', 'appearance', 'system', 'whatsapp', 'privacy'];
  const initialTab = validTabs.includes(searchParams.get('tab') ?? '') ? searchParams.get('tab')! : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'system', label: 'Sistema', icon: Settings },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
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
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'system' && <SystemSettings />}
            {activeTab === 'whatsapp' && <WhatsAppSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { currentUser, updateCurrentUser, clinicSettings, updateClinicSettings } = useApp();
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    crm: currentUser?.crm || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    specialty: currentUser?.specialty || 'Clínica Geral',
    clinicName: clinicSettings.clinicName || '',
    clinicCNPJ: clinicSettings.cnpj || '',
    clinicPhone: clinicSettings.phone || '',
    clinicAddress: clinicSettings.address || '',
  });
  const [userId, setUserId] = useState<string>('default');

  // Resolve logo URL from PATH stored in clinic settings
  const { url: logoUrl } = useAvatarUrl(clinicSettings.logoPath);

  // Get current user ID for folder naming
  useState(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) setUserId(data.session.user.id);
    });
  });

  const handleSave = () => {
    updateCurrentUser({ name: form.name, crm: form.crm, email: form.email, phone: form.phone, specialty: form.specialty });
    updateClinicSettings({ clinicName: form.clinicName, cnpj: form.clinicCNPJ, phone: form.clinicPhone, address: form.clinicAddress });
    medicalToast.settingsSaved();
  };

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Informações do Perfil</h3>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-pink-100 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-pink-700">{currentUser?.initials || '?'}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
            <p className="text-xs text-gray-500">{currentUser?.email}</p>
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

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Dados da Clínica</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nome da Clínica', key: 'clinicName', type: 'text' },
              { label: 'CNPJ', key: 'clinicCNPJ', type: 'text' },
              { label: 'Telefone da Clínica', key: 'clinicPhone', type: 'tel' },
              { label: 'Endereço', key: 'clinicAddress', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-700 mb-2">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600" />
              </div>
            ))}
          </div>

          {/* Logo upload — armazena PATH no bucket 'avatars' (público) */}
          <div className="mt-4">
            <label className="block text-sm text-gray-700 mb-2">Logo da Clínica</label>
            <div className="flex items-start gap-4">
              {/* Current logo preview */}
              {logoUrl && (
                <div className="relative flex-shrink-0">
                  <img
                    src={logoUrl}
                    alt="Logo atual"
                    className="w-16 h-16 object-contain border border-gray-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => updateClinicSettings({ logoPath: undefined })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    title="Remover logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <FileUpload
                  bucketType="avatars"
                  folder={`logos/${userId}`}
                  label="Enviar logo"
                  description="PNG, JPG ou WebP · Máx. 2MB"
                  compact
                  entityType="patient"
                  entityId={userId}
                  uploadedBy={currentUser?.name || ''}
                  onUploadComplete={(file) => {
                    // Persiste apenas o PATH — nunca a URL
                    updateClinicSettings({ logoPath: file.storagePath });
                    medicalToast.settingsSaved();
                  }}
                />
                {clinicSettings.logoPath && (
                  <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                    Path: {clinicSettings.logoPath}
                  </p>
                )}
              </div>
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

function SecuritySettings() {
  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Segurança e Acesso</h3>
      
      <div className="space-y-6">
        {/* Password Change */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Alterar Senha</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Senha Atual</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Nova Senha</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Confirmar Nova Senha</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600"
              />
            </div>
          </div>
        </div>

        {/* Two Factor */}
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Autenticação de Dois Fatores</h4>
              <p className="text-sm text-gray-500 mt-1">Adicione uma camada extra de segurança</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:bg-pink-600 transition-colors">
                <div className="h-6 w-5 bg-white border border-gray-300 transition-transform peer-checked:translate-x-6"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Digital Certificate */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Certificado Digital ICP-Brasil</h4>
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-900">Nenhum certificado configurado</p>
                <p className="text-xs text-gray-500">Configure um certificado digital para assinaturas</p>
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
              Configurar
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">
            Salvar Alterações
          </button>
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

function AppearanceSettings() {
  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-6">Aparência e Exibição</h3>
      
      <div className="space-y-6">
        {/* Theme */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Tema do Sistema</h4>
          <div className="grid grid-cols-3 gap-4">
            <button className="p-4 border-2 border-pink-600 bg-pink-50 text-center transition-colors">
              <div className="w-full h-20 bg-white border border-gray-200 mb-2"></div>
              <p className="text-sm text-gray-900">Claro</p>
            </button>
            <button className="p-4 border border-gray-200 hover:border-gray-300 text-center transition-colors">
              <div className="w-full h-20 bg-gray-900 border border-gray-700 mb-2"></div>
              <p className="text-sm text-gray-700">Escuro</p>
            </button>
            <button className="p-4 border border-gray-200 hover:border-gray-300 text-center transition-colors">
              <div className="w-full h-20 bg-gradient-to-br from-white to-gray-100 border border-gray-200 mb-2"></div>
              <p className="text-sm text-gray-700">Auto</p>
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="pb-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Idioma do Sistema</h4>
          <select className="w-full md:w-64 px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600">
            <option>Português (Brasil)</option>
            <option>English (US)</option>
            <option>Español</option>
          </select>
        </div>

        {/* Timezone */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Fuso Horário</h4>
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-600" />
            <select className="flex-1 md:flex-initial md:w-80 px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600">
              <option>America/São_Paulo (GMT-3)</option>
              <option>America/New_York (GMT-5)</option>
              <option>Europe/London (GMT+0)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors">
            Salvar Alterações
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
                <p className="text-sm text-gray-900">WhatsApp Business API</p>
                <p className="text-xs text-gray-500">Chatbot automático</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs">Ativo</span>
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

function WhatsAppSettings() {
  const { selectedClinicId } = useApp();
  const [instanceId, setInstanceId] = useState('');
  const [savedInstanceId, setSavedInstanceId] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string>('disconnected');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedClinicId) {
      setLoading(false);
      return;
    }
    getSupabase()
      .from('clinics')
      .select('evolution_instance_id, evolution_instance_status')
      .eq('id', selectedClinicId)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError('Não foi possível carregar a configuração WhatsApp.');
        } else {
          setSavedInstanceId(data?.evolution_instance_id ?? null);
          setInstanceId(data?.evolution_instance_id ?? '');
          setInstanceStatus(data?.evolution_instance_status ?? 'disconnected');
        }
        setLoading(false);
      });
  }, [selectedClinicId]);

  const handleSave = async () => {
    if (!selectedClinicId) return;
    setError('');
    setSaving(true);
    const { error: updateErr } = await getSupabase()
      .from('clinics')
      .update({ evolution_instance_id: instanceId.trim() || null })
      .eq('id', selectedClinicId);
    setSaving(false);
    if (updateErr) {
      setError('Erro ao salvar: ' + updateErr.message);
    } else {
      setSavedInstanceId(instanceId.trim() || null);
      medicalToast.settingsSaved();
    }
  };

  const isConnected = instanceStatus === 'connected';
  const isConfigured = !!savedInstanceId;

  return (
    <div className="p-6">
      <h3 className="text-gray-900 mb-1">Integração WhatsApp</h3>
      <p className="text-sm text-gray-500 mb-6">Configure a instância Evolution API para envio de mensagens aos pacientes</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando configuração...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status banner */}
          <div className={`flex items-center gap-3 p-4 border ${isConnected ? 'bg-green-50 border-green-200' : isConfigured ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
            {isConnected
              ? <Wifi className="w-5 h-5 text-green-600 flex-shrink-0" />
              : <WifiOff className="w-5 h-5 text-gray-400 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-medium ${isConnected ? 'text-green-800' : 'text-gray-700'}`}>
                {isConnected ? 'Instância conectada' : isConfigured ? 'Instância configurada — aguardando conexão' : 'WhatsApp não configurado'}
              </p>
              {savedInstanceId && (
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{savedInstanceId}</p>
              )}
            </div>
            {isConfigured && (
              <span className={`ml-auto text-xs px-2 py-1 font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isConnected ? 'CONECTADO' : instanceStatus.toUpperCase()}
              </span>
            )}
          </div>

          {/* Instance name field */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Configuração da Instância</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Nome da Instância Evolution API
                </label>
                <input
                  type="text"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  placeholder="ex: ampliemed"
                  className="w-full md:w-96 px-4 py-2 border border-gray-200 focus:outline-none focus:border-pink-600 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nome exato da instância criada no painel Evolution API. Deixe em branco para desativar o WhatsApp nesta clínica.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Deploy instructions */}
          <div className="bg-pink-50 border border-pink-200 p-4">
            <p className="text-xs font-medium text-pink-900 mb-2">Pré-requisitos para funcionamento</p>
            <ol className="text-xs text-pink-800 space-y-1 list-decimal list-inside">
              <li>Preencher <span className="font-mono">EVOLUTION_API_URL</span>, <span className="font-mono">EVOLUTION_API_KEY</span>, <span className="font-mono">EVOLUTION_INSTANCE_NAME</span> e <span className="font-mono">EVOLUTION_WEBHOOK_SECRET</span> no <span className="font-mono">.env</span></li>
              <li>Executar <span className="font-mono">supabase secrets set --env-file .env</span></li>
              <li>Executar <span className="font-mono">supabase functions deploy evolution_send_message</span> e <span className="font-mono">evolution_webhook</span></li>
              <li>Aplicar a migration <span className="font-mono">20260327_evolution_api.sql</span> no banco de dados</li>
              <li>Definir o nome da instância acima e salvar</li>
            </ol>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving || instanceId === (savedInstanceId ?? '')}
              className="px-6 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      )}
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