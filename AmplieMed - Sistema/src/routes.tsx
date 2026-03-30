import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { ProfessionalInviteAccept } from './components/ProfessionalInviteAccept';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { PatientManagement } from './components/PatientManagement';
import { ProfessionalManagement } from './components/ProfessionalManagement';
import { ScheduleManagementWithPayment } from './components/ScheduleManagementWithPayment';
import { MedicalRecordsUnified } from './components/MedicalRecordsUnified';
import { FinancialModule } from './components/FinancialModule';
import { CommunicationModule } from './components/CommunicationModule';
import { TelemedicineModule } from './components/TelemedicineModule';
import { AccessControl } from './components/AccessControl';
import { PatientPortal } from './components/PatientPortal';
import { PatientPortalPublic } from './components/PatientPortalPublic';
import { StockManagement } from './components/StockManagement';
import { ExamsManagement } from './components/ExamsManagement';
import { ClinicalProtocols } from './components/ClinicalProtocols';
import { SettingsModule } from './components/SettingsModule';
import { InsuranceManagement } from './components/InsuranceManagement';
import { QueueManagement } from './components/QueueManagement';
import { ReportsModule } from './components/ReportsModule';
import { TemplatesModule } from './components/TemplatesModule';
import { MedicalCalculators } from './components/MedicalCalculators';
import { DoctorWorkspace } from './components/DoctorWorkspace';
import { useApp } from './components/AppContext';
import type { UserRole } from './App';

// ─── Module → Path mapping ───────────────────────────────────────────────────
// Exported so Header, Breadcrumbs, Layout, etc. can share the same mapping.

export const MODULE_PATHS: Record<string, string> = {
  home:               '/',
  dashboard:          '/dashboard',
  patients:           '/pacientes',
  professionals:      '/profissionais',
  schedule:           '/agenda',
  records:            '/prontuarios',
  financial:          '/financeiro',
  communication:      '/comunicacao',
  telemedicine:       '/telemedicina',
  access:             '/controle-acesso',
  portal:             '/portal-paciente',
  stock:              '/estoque',
  exams:              '/exames',
  protocols:          '/protocolos',
  settings:           '/configuracoes',
  insurance:          '/convenios',
  queue:              '/fila-espera',
  reports:            '/relatorios',
  templates:          '/templates',
  calculators:        '/calculadoras',
  consultorio:        '/consultorio',
  audit:              '/controle-acesso',
};

/** Reverse map — path → module id */
export const PATH_TO_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_PATHS).map(([mod, path]) => [path, mod])
);

/** Human-readable page names keyed by path */
export const PATH_NAMES: Record<string, string> = {
  '/':                              'Início',
  '/dashboard':                     'Dashboard',
  '/pacientes':                     'Pacientes',
  '/profissionais':                 'Profissionais',
  '/agenda':                        'Agenda',
  '/prontuarios':                   'Prontuários',
  '/financeiro':                    'Financeiro',
  '/comunicacao':                   'Comunicação',
  '/telemedicina':                  'Telemedicina',
  '/controle-acesso':               'Controle de Acesso',
  '/portal-paciente':               'Portal do Paciente',
  '/estoque':                       'Estoque',
  '/exames':                        'Exames',
  '/protocolos':                    'Protocolos Clínicos',
  '/configuracoes':                 'Meu Perfil',
  '/convenios':                     'Convênios',
  '/fila-espera':                   'Fila de Espera',
  '/relatorios':                    'Relatórios',
  '/templates':                     'Templates',
  '/calculadoras':                  'Calculadoras Médicas',
  '/consultorio':                   'Meu Consultório',
  '/auditoria':                     'Auditoria',
};

// ─── Shared hook ─────────────────────────────────────────────────────────────

function useUserRole(): UserRole {
  const { currentUser } = useApp();
  return currentUser?.role ?? 'admin';
}

// ─── Public pages ─────────────────────────────────────────────────────────────

function LoginPage() {
  const { login, signup, clinicSignup, isAuthenticated, isLoading } = useApp();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Verificando sessão...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    return await login(email, password);
  };

  const handleSignup = async (data: { email: string; password: string; name: string; role?: string; specialty?: string; crm?: string; phone?: string }): Promise<boolean> => {
    return await signup(data);
  };

  const handleClinicSignup = (result: any) => {
    console.log('Clinic signup success:', result);
    // Automatically login with the clinic admin credentials
    // Or redirect to a welcome screen
  };

  return <Login onLogin={handleLogin} onSignup={handleSignup} onClinicSignup={handleClinicSignup} />;
}

// ─── Protected page wrappers ─────────────────────────────────────────────────
// Each component is a thin wrapper so the module component itself doesn't
// need to change — userRole is read from AppContext right here.

function HomePage() {
  return <Home />;
}

function DashboardPage() {
  const role = useUserRole();
  return <Dashboard userRole={role} />;
}

function PatientsPage() {
  const role = useUserRole();
  return <PatientManagement userRole={role} />;
}

function ProfessionalsPage() {
  const role = useUserRole();
  return <ProfessionalManagement userRole={role} />;
}

function DoctorsPage() {
  return <Navigate to="/profissionais" replace />;
}

function SchedulePage() {
  const role = useUserRole();
  return <ScheduleManagementWithPayment userRole={role} />;
}

function RecordsPage() {
  const role = useUserRole();
  return <MedicalRecordsUnified userRole={role} />;
}

function FinancialPage() {
  const role = useUserRole();
  return <FinancialModule userRole={role} />;
}

function CommunicationPage() {
  const role = useUserRole();
  return <CommunicationModule userRole={role} />;
}

function TelemedicinePage() {
  const role = useUserRole();
  return <TelemedicineModule userRole={role} />;
}

function AccessPage() {
  const role = useUserRole();
  return <AccessControl userRole={role} />;
}

function PatientPortalPage() {
  return <PatientPortal />;
}

function StockPage() {
  const role = useUserRole();
  return <StockManagement userRole={role} />;
}

function ExamsPage() {
  const role = useUserRole();
  return <ExamsManagement userRole={role} />;
}

function ProtocolsPage() {
  const role = useUserRole();
  return <ClinicalProtocols userRole={role} />;
}

function SettingsPage() {
  const role = useUserRole();
  return <SettingsModule userRole={role} />;
}

function InsurancePage() {
  const role = useUserRole();
  return <InsuranceManagement userRole={role} />;
}

function QueuePage() {
  const role = useUserRole();
  return <QueueManagement userRole={role} />;
}

function ReportsPage() {
  const role = useUserRole();
  return <ReportsModule userRole={role} />;
}

function TemplatesPage() {
  const role = useUserRole();
  return <TemplatesModule userRole={role} />;
}

function CalculatorsPage() {
  const role = useUserRole();
  return <MedicalCalculators userRole={role} />;
}

function DoctorWorkspacePage() {
  const role = useUserRole();
  return <DoctorWorkspace userRole={role} />;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public ─────────────────────────────────────────────────────────────────
  {
    path: '/login',
    Component: LoginPage,
  },

  {
    path: '/accept-invite',
    Component: ProfessionalInviteAccept,
  },

  {
    path: '/paciente',
    Component: PatientPortalPublic,
  },

  // ── Protected shell (authenticated layout) ──────────────────────────────────
  {
    path: '/',
    Component: Layout,
    children: [
      // Home (sem breadcrumb, fullscreen)
      { index: true, Component: HomePage },

      // Dashboard
      { path: 'dashboard', Component: DashboardPage },

      // Cadastros
      { path: 'pacientes',                     Component: PatientsPage },
      { path: 'profissionais',                 Component: ProfessionalsPage },
      { path: 'profissionais/relatorio-financeiro', element: <Navigate to="/relatorios" replace /> },
      { path: 'medicos',                       element: <Navigate to="/profissionais" replace /> },
      { path: 'medicos/relatorio-financeiro',  element: <Navigate to="/relatorios" replace /> },
      { path: 'convenios',                     Component: InsurancePage },

      // Atendimento
      { path: 'agenda',                 Component: SchedulePage },
      { path: 'fila-espera',            Component: QueuePage },
      { path: 'prontuarios',            Component: RecordsPage },
      { path: 'exames',                 Component: ExamsPage },
      { path: 'protocolos',             Component: ProtocolsPage },
      { path: 'telemedicina',           Component: TelemedicinePage },

      // Gestão
      { path: 'estoque',    Component: StockPage },
      { path: 'financeiro', Component: FinancialPage },
      { path: 'relatorios', Component: ReportsPage },

      // Ferramentas
      { path: 'templates',    Component: TemplatesPage },
      { path: 'calculadoras', Component: CalculatorsPage },

      // Consultório médico
      { path: 'consultorio',  Component: DoctorWorkspacePage },

      // Comunicação
      { path: 'comunicacao',     Component: CommunicationPage },
      { path: 'portal-paciente', Component: PatientPortalPage },

      // Sistema
      { path: 'controle-acesso', Component: AccessPage },
      { path: 'auditoria',       element: <Navigate to="/controle-acesso" replace /> },

      // Configurações
      { path: 'configuracoes', Component: SettingsPage },

    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);