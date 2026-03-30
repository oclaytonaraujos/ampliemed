import {
  Users, Calendar, FileText, MessageSquare,
  LayoutDashboard, Menu, X, Bell, Settings, ChevronDown,
  Stethoscope, ClipboardList, Phone, LogOut, User,
  Calculator, Activity, Cloud, CloudOff, Loader2, Building2,
  Shield, KeyRound,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import type { UserRole } from '../App';
import { NotificationCenter } from './NotificationCenter';
import { useApp } from './AppContext';
import { MODULE_PATHS } from '../routes';
import logoAmplieMed from '../assets/775bd1b6594b305b8d42a07d24da813913fe5060.png';
import { useAvatarUrl } from '../hooks/useFileUrl';

interface HeaderProps {
  onOpenSearch?: () => void;
  onOpenRecent?: () => void;
  onOpenOnboarding?: () => void;
}

interface MenuCategory {
  id: string;
  label: string;
  icon: any;
  items: MenuItem[];
  roles: UserRole[];
}

interface MenuItem {
  id: string;
  label: string;
  roles: UserRole[];
}

export function Header({ onOpenSearch, onOpenRecent, onOpenOnboarding }: HeaderProps) {
  const { currentUser, logout, unreadNotificationCount, syncStatus, clinicSettings } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const userRole: UserRole = currentUser?.role || 'admin';
  const userName = currentUser?.name || 'Usuário';
  const userInitials = currentUser?.initials || 'U';

  const avatarColors = ['bg-pink-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];
  const avatarColor = avatarColors[userInitials.charCodeAt(0) % avatarColors.length];
  const { url: avatarUrl } = useAvatarUrl(currentUser?.avatarPath);
  const userEmail = currentUser?.email || '';
  const userCRM = currentUser?.crm || '';
  const clinicName = clinicSettings.clinicName || 'Minha Clínica';
  const clinicAddress = clinicSettings.address || '';

  // Current path → active module detection
  const currentPath = location.pathname;

  const menuCategories: MenuCategory[] = [
    {
      id: 'cadastros',
      label: 'Cadastros',
      icon: Users,
      roles: ['admin', 'receptionist'],
      items: [
        { id: 'patients', label: 'Pacientes', roles: ['admin', 'receptionist', 'doctor'] },
        { id: 'professionals', label: 'Profissionais', roles: ['admin'] },
        { id: 'insurance', label: 'Convênios', roles: ['admin', 'financial'] },
      ],
    },
    {
      id: 'atendimento',
      label: 'Atendimento',
      icon: Stethoscope,
      roles: ['admin', 'doctor', 'receptionist'],
      items: [
        { id: 'schedule', label: 'Agenda', roles: ['admin', 'receptionist', 'doctor'] },
        { id: 'queue', label: 'Fila de Espera', roles: ['admin', 'receptionist', 'doctor'] },
        { id: 'records', label: 'Prontuários', roles: ['admin', 'doctor'] },
        { id: 'exams', label: 'Exames', roles: ['admin', 'doctor'] },
        { id: 'protocols', label: 'Protocolos', roles: ['admin', 'doctor'] },
        { id: 'telemedicine', label: 'Telemedicina', roles: ['admin', 'doctor'] },
      ],
    },
    {
      id: 'gestao',
      label: 'Gestão',
      icon: ClipboardList,
      roles: ['admin', 'financial'],
      items: [
        { id: 'stock', label: 'Estoque', roles: ['admin', 'financial'] },
        { id: 'financial', label: 'Financeiro', roles: ['admin', 'financial'] },
        { id: 'reports', label: 'Relatórios', roles: ['admin', 'financial', 'doctor'] },
      ],
    },
    {
      id: 'ferramentas',
      label: 'Ferramentas',
      icon: Calculator,
      roles: ['admin', 'doctor'],
      items: [
        { id: 'templates', label: 'Templates', roles: ['admin', 'doctor'] },
        { id: 'calculators', label: 'Calculadoras Médicas', roles: ['admin', 'doctor'] },
      ],
    },
    {
      id: 'comunicacao',
      label: 'Comunicação',
      icon: Phone,
      roles: ['admin', 'receptionist'],
      items: [
        { id: 'communication', label: 'WhatsApp', roles: ['admin', 'receptionist'] },
        { id: 'portal', label: 'Portal Paciente', roles: ['admin'] },
      ],
    },
  ];

  const singleMenuItems = [
    { id: 'dashboard',  label: 'Dashboard',       icon: LayoutDashboard, roles: ['admin', 'doctor', 'receptionist', 'financial'] as UserRole[] },
    { id: 'consultorio', label: 'Meu Consultório', icon: Stethoscope,     roles: ['doctor'] as UserRole[] },
  ];

  const hasAccess = (roles: UserRole[]) => roles.includes(userRole);

  // Navigate to module by id
  const goToModule = (moduleId: string) => {
    const path = MODULE_PATHS[moduleId];
    if (path) navigate(path);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  // Is a module path currently active?
  const isModuleActive = (moduleId: string) => {
    const path = MODULE_PATHS[moduleId];
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Is any item in a category active?
  const isCategoryActive = (categoryId: string) => {
    const category = menuCategories.find(c => c.id === categoryId);
    return category?.items.some(item => isModuleActive(item.id)) ?? false;
  };

  const toggleDropdown = (categoryId: string) => {
    setOpenDropdown(openDropdown === categoryId ? null : categoryId);
  };

  const roleLabel = userRole === 'admin' ? 'Administrador'
    : userRole === 'doctor' ? 'Médico'
    : userRole === 'receptionist' ? 'Recepcionista'
    : 'Financeiro';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Top Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <img
                  src={logoAmplieMed}
                  alt="AmplieMed"
                  className="h-10 w-auto"
                  style={{ transform: 'scale(0.6)' }}
                />
              </button>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Sync Status Indicator */}
              <button className={`flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-gray-50 ${
                syncStatus === 'syncing' ? 'text-pink-600' :
                syncStatus === 'synced'  ? 'text-green-600' :
                syncStatus === 'error'   ? 'text-red-600' :
                'text-gray-400'
              }`} title={
                syncStatus === 'syncing' ? 'Salvando dados no Supabase...' :
                syncStatus === 'synced'  ? 'Dados salvos com sucesso' :
                syncStatus === 'error'   ? 'Erro ao salvar — verifique o console' :
                'Dados sincronizados'
              }>
                {syncStatus === 'syncing' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : syncStatus === 'error' ? (
                  <CloudOff className="w-5 h-5" />
                ) : (
                  <Cloud className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadNotificationCount > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* User Menu - Desktop */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all overflow-hidden ${avatarUrl ? '' : avatarColor + ' text-white'} ${userMenuOpen ? 'ring-2 ring-offset-2 ring-pink-400' : 'hover:opacity-90'}`}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt={userInitials} className="w-full h-full object-cover" />
                    : <span className="text-sm font-semibold">{userInitials}</span>
                  }
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="border-b border-gray-200">
                        <div className="p-4 flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${avatarUrl ? '' : avatarColor}`}>
                            {avatarUrl
                              ? <img src={avatarUrl} alt={userInitials} className="w-full h-full object-cover" />
                              : <span className="text-base font-semibold text-white">{userInitials}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{userName}</p>
                            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                            {userCRM && <p className="text-xs text-gray-400">{userCRM}</p>}
                          </div>
                        </div>
                        <div className="mx-4 mb-3 px-3 py-2 bg-pink-50 border border-pink-100 rounded-md flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-pink-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-pink-400">Clínica ativa</p>
                            <p className="text-sm font-semibold text-pink-700 truncate">{clinicName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">

                        <button
                          onClick={() => { navigate('/configuracoes'); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Meu Perfil
                        </button>

                        {userRole === 'admin' && (
                          <>
                            <div className="my-1 border-t border-gray-100" />
                            <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                              <Shield className="w-3 h-3" /> Sistema
                            </p>
                            <button
                              onClick={() => { goToModule('access'); setUserMenuOpen(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <KeyRound className="w-4 h-4" />
                              Controle de Acesso
                            </button>
                          </>
                        )}
                      </div>

                      <div className="border-t border-gray-200 p-2">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); navigate('/login'); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sair do Sistema
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 hover:bg-gray-50 transition-colors ml-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar - Desktop */}
      <div className="bg-white hidden lg:block">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-center gap-1">
            {/* Single items (Dashboard) */}
            {singleMenuItems.map((item) => {
              if (!hasAccess(item.roles)) return null;
              const Icon = item.icon;
              const isActive = isModuleActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => goToModule(item.id)}
                  className={`relative flex items-center gap-2 px-5 py-4 transition-all duration-200 whitespace-nowrap ${
                    isActive ? 'text-pink-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600" />}
                </button>
              );
            })}

            {/* Category Dropdowns */}
            {menuCategories.map((category) => {
              if (!hasAccess(category.roles)) return null;
              const Icon = category.icon;
              const isActive = isCategoryActive(category.id);
              const isOpen = openDropdown === category.id;
              return (
                <div key={category.id} className="relative">
                  <button
                    onClick={() => toggleDropdown(category.id)}
                    className={`relative flex items-center gap-2 px-5 py-4 transition-all duration-200 whitespace-nowrap ${
                      isActive ? 'text-pink-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                    <span className="text-sm">{category.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600" />}
                  </button>

                  {isOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute left-0 top-full min-w-[200px] bg-white border border-gray-200 shadow-lg z-50">
                        {category.items.map((item) => {
                          if (!hasAccess(item.roles)) return null;
                          const isItemActive = isModuleActive(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => goToModule(item.id)}
                              className={`w-full text-left px-5 py-3 text-sm transition-colors ${
                                isItemActive ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-gray-200 bg-white">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
            {/* User Info Mobile */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100 md:hidden">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden ${avatarUrl ? '' : avatarColor}`}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={userInitials} className="w-full h-full object-cover" />
                  : <span className="text-sm font-semibold text-white">{userInitials}</span>
                }
              </div>
              <div>
                <p className="text-sm text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{roleLabel}</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {singleMenuItems.map((item) => {
                if (!hasAccess(item.roles)) return null;
                const Icon = item.icon;
                const isActive = isModuleActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => goToModule(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${
                      isActive ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}

              {menuCategories.map((category) => {
                if (!hasAccess(category.roles)) return null;
                const Icon = category.icon;
                const isOpen = openDropdown === category.id;
                return (
                  <div key={category.id}>
                    <button
                      onClick={() => toggleDropdown(category.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                        <span className="text-sm">{category.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="bg-gray-50 py-1">
                        {category.items.map((item) => {
                          if (!hasAccess(item.roles)) return null;
                          const isItemActive = isModuleActive(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => goToModule(item.id)}
                              className={`w-full text-left px-12 py-2.5 text-sm transition-colors ${
                                isItemActive ? 'text-pink-600 bg-pink-50' : 'text-gray-700 hover:text-gray-900'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Mobile Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 sm:hidden">
              <button
                onClick={() => { setNotificationsOpen(true); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Notificações</span>
              </button>
              <button
                onClick={() => { navigate('/configuracoes'); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Configurações</span>
              </button>
            </div>

            {/* Logout Mobile */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { logout(); navigate('/login'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Center */}
      {notificationsOpen && (
        <NotificationCenter onClose={() => setNotificationsOpen(false)} />
      )}
    </header>
  );
}