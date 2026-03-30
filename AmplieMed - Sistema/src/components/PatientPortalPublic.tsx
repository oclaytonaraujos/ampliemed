import { useState, useEffect } from 'react';
import {
  Calendar, FileText, CreditCard, Video, User, Shield, Phone,
  MapPin, Clock, Mail, Eye, EyeOff, LogOut, Loader2, AlertCircle,
  CheckCircle2, Download, Lock, Smartphone, Heart, Instagram, Building2,
} from 'lucide-react';
import logoAmplieMed from '../assets/775bd1b6594b305b8d42a07d24da813913fe5060.png';
import { getSupabase } from '../utils/supabaseClient';
import { useAvatarUrl } from '../hooks/useFileUrl';

// ── Types ──────────────────────────────────────────────────────────────────────

function formatPhone(phone: string | undefined): string {
  if (!phone) return '';
  const p = phone.replace(/\\D/g, '');
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`;
  return phone;
}

function formatCNPJ(cnpj: string | undefined): string {
  if (!cnpj) return '';
  const c = cnpj.replace(/\\D/g, '');
  if (c.length === 14) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
  return cnpj;
}

interface ClinicInfo {
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  workingHours: { start: string; end: string };
  logoPath?: string;
  cnpj?: string;
  instagram?: string;
}

interface PatientRecord {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string;
  insurance: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  specialty: string;
  type: string;
  status: string;
  room?: string;
  telemedLink?: string;
}

interface MedicalRecord {
  id: string;
  date: string;
  type: string;
  doctorName: string;
  cid10?: string;
  chiefComplaint?: string;
  signed: boolean;
}

interface Payment {
  id: string;
  date: string;
  type: string;
  amount: number;
  method: string;
  status: string;
}

type AuthMode = 'login' | 'register';
type Tab = 'appointments' | 'records' | 'payments' | 'profile';

const INPUT_CLASS =
  'w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 transition-all placeholder:text-gray-400';

// ── Main Component ─────────────────────────────────────────────────────────────

export function PatientPortalPublic() {
  const supabase = getSupabase();

  // Auth
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Auth form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Clinic & patient data
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({
    clinicName: '',
    address: '',
    phone: '',
    email: '',
    workingHours: { start: '08:00', end: '18:00' },
  });
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('appointments');

  const { url: logoUrl } = useAvatarUrl(clinicInfo.logoPath);

  // ── Init ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadClinicInfo();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) loadPatientData(session.user.email);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) loadPatientData(session.user.email);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Data loaders ──────────────────────────────────────────────────────────────

  async function loadClinicInfo() {
    try {
      const { data } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'clinic_settings')
        .maybeSingle();
      if (data?.value) setClinicInfo(prev => ({ ...prev, ...data.value }));
    } catch {
      // use defaults
    }
  }

  async function loadPatientData(userEmail: string) {
    setDataLoading(true);
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      setPatientRecord(patient ?? null);

      if (patient) {
        const [{ data: apts }, { data: records }, { data: pmts }] = await Promise.all([
          supabase
            .from('appointments')
            .select('*')
            .or(`patient_name.eq.${patient.name},patient_c_p_f.eq.${patient.cpf}`)
            .not('status', 'in', '("cancelado","realizado")')
            .order('date', { ascending: true }),
          supabase
            .from('medical_records')
            .select('*')
            .or(`patient_id.eq.${patient.id},patient_name.eq.${patient.name}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('financial_payments')
            .select('*')
            .eq('patient', patient.name)
            .order('date', { ascending: false }),
        ]);

        setAppointments(apts ?? []);
        setMedicalRecords(records ?? []);
        setPayments(pmts ?? []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do paciente:', err);
    } finally {
      setDataLoading(false);
    }
  }

  // ── Auth handlers ─────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) { setAuthError('Preencha e-mail e senha.'); return; }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError('E-mail ou senha incorretos. Verifique os dados e tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (!name || !email || !password || !confirmPassword) {
      setAuthError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password !== confirmPassword) { setAuthError('As senhas não coincidem.'); return; }
    if (password.length < 6) { setAuthError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, phone, role: 'patient' } },
      });
      if (error) setAuthError(error.message);
      else setAuthSuccess('Cadastro realizado! Verifique seu e-mail para confirmar a conta e fazer o login.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setPatientRecord(null);
    setAppointments([]);
    setMedicalRecords([]);
    setPayments([]);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setAuthSuccess('');
    setAuthError('');
  }

  // ── Derived values ─────────────────────────────────────────────────────────────

  const isAuthenticated = !!session;
  const patientName =
    patientRecord?.name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    '';
  const initials = patientName
    ? patientName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const telemedicineCount = appointments.filter(a => a.type === 'telemedicina').length;

  const scrollToAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Navbar ────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {logoUrl ? (
            <img src={logoUrl} alt={clinicInfo.clinicName || 'Clínica'} className="h-8 object-contain" />
          ) : (
            <img src={logoAmplieMed} alt="AmplieMed" className="h-8 object-contain" />
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
                <span className="text-sm text-gray-700 hidden sm:block truncate max-w-[140px]">
                  {patientName.split(' ')[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sair</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollToAuth('login')}
                className="px-4 py-2 text-sm text-pink-600 font-medium hover:text-pink-700 transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => scrollToAuth('register')}
                className="px-4 py-2 text-sm bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-medium"
              >
                Cadastrar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <main className="flex-1">

        {!isAuthenticated ? (
          /* ────────────── LANDING PAGE ────────────── */
          <>
            {/* Hero */}
            <section className="bg-gradient-to-br from-pink-600 via-pink-500 to-pink-700 text-white py-16 sm:py-24 px-4">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left: headline */}
                <div>
                  {clinicInfo.clinicName && (
                    <p className="text-pink-200 text-sm font-medium uppercase tracking-widest mb-3">
                      {clinicInfo.clinicName}
                    </p>
                  )}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                    Portal do Paciente
                  </h1>
                  <p className="text-pink-100 text-lg sm:text-xl leading-relaxed mb-8">
                    Acesse suas consultas, prontuários e pagamentos — de qualquer lugar, a qualquer hora.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => scrollToAuth('register')}
                      className="px-7 py-3.5 bg-white text-pink-600 font-semibold rounded-2xl hover:bg-pink-50 transition-colors shadow-lg text-base"
                    >
                      Criar Conta Gratuita
                    </button>
                    <button
                      onClick={() => scrollToAuth('login')}
                      className="px-7 py-3.5 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 transition-colors border border-white/25 text-base"
                    >
                      Já tenho conta
                    </button>
                  </div>
                </div>

                {/* Right: Auth card — desktop only */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 hidden lg:block">
                  <AuthCard
                    mode={authMode} setMode={setAuthMode}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                    name={name} setName={setName}
                    phone={phone} setPhone={setPhone}
                    showPassword={showPassword} setShowPassword={setShowPassword}
                    showPasswordConfirm={showPasswordConfirm} setShowPasswordConfirm={setShowPasswordConfirm}
                    loading={authLoading} error={authError} setError={setAuthError}
                    success={authSuccess}
                    onLogin={handleLogin} onRegister={handleRegister}
                  />
                </div>
              </div>
            </section>

            {/* Features */}
            <section className="py-16 px-4 bg-gray-50">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
                  Tudo que você precisa em um só lugar
                </h2>
                <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
                  Gerencie sua saúde com facilidade e segurança, diretamente do seu celular ou computador.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    {
                      icon: Calendar,
                      bg: 'bg-pink-100',
                      color: 'text-pink-600',
                      title: 'Consultas',
                      desc: 'Agende e acompanhe suas consultas presenciais e por telemedicina.',
                    },
                    {
                      icon: FileText,
                      bg: 'bg-green-100',
                      color: 'text-green-600',
                      title: 'Prontuários',
                      desc: 'Acesse seu histórico médico completo com privacidade e segurança.',
                    },
                    {
                      icon: CreditCard,
                      bg: 'bg-orange-100',
                      color: 'text-orange-500',
                      title: 'Pagamentos',
                      desc: 'Visualize e efetue pagamentos de consultas de forma rápida.',
                    },
                    {
                      icon: Video,
                      bg: 'bg-purple-100',
                      color: 'text-purple-600',
                      title: 'Telemedicina',
                      desc: 'Consulte-se com seu médico sem sair de casa, pelo celular ou computador.',
                    },
                  ].map(({ icon: Icon, bg, color, title, desc }) => (
                    <div
                      key={title}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Auth section — mobile only (desktop sees the hero card) */}
            <section id="auth-section" className="py-16 px-4 bg-white lg:hidden">
              <div className="max-w-md mx-auto">
                <AuthCard
                  mode={authMode} setMode={setAuthMode}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                  name={name} setName={setName}
                  phone={phone} setPhone={setPhone}
                  showPassword={showPassword} setShowPassword={setShowPassword}
                  showPasswordConfirm={showPasswordConfirm} setShowPasswordConfirm={setShowPasswordConfirm}
                  loading={authLoading} error={authError} setError={setAuthError}
                  success={authSuccess}
                  onLogin={handleLogin} onRegister={handleRegister}
                />
              </div>
            </section>

            {/* Clinic Info */}
            {(clinicInfo.address || clinicInfo.phone || clinicInfo.email) && (
              <section className="py-16 px-4 bg-gray-50 border-t border-gray-100">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
                    Informações da Clínica
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {clinicInfo.address && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Endereço</h4>
                          <p className="text-sm text-gray-500 leading-relaxed">{clinicInfo.address}</p>
                        </div>
                      </div>
                    )}
                    {clinicInfo.phone && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Telefone / WhatsApp</h4>
                          <p className="text-sm text-gray-500">{formatPhone(clinicInfo.phone)}</p>
                        </div>
                      </div>
                    )}
                    {clinicInfo.email && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">E-mail</h4>
                          <p className="text-sm text-gray-500">{clinicInfo.email}</p>
                        </div>
                      </div>
                    )}
                    {clinicInfo.workingHours && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Horário de Atendimento</h4>
                          <p className="text-sm text-gray-500">
                            Seg–Sex: {clinicInfo.workingHours.start} às {clinicInfo.workingHours.end}
                          </p>
                        </div>
                      </div>
                    )}
                    {clinicInfo.cnpj && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">CNPJ</h4>
                          <p className="text-sm text-gray-500">{formatCNPJ(clinicInfo.cnpj)}</p>
                        </div>
                      </div>
                    )}
                    {clinicInfo.instagram && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Instagram className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Instagram</h4>
                          <p className="text-sm text-gray-500">
                            <a 
                              href={`https://instagram.com/${clinicInfo.instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-600 hover:underline"
                            >
                              {clinicInfo.instagram}
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Trust bar */}
            <section className="py-10 px-4 bg-white border-t border-gray-100">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
                  {[
                    { icon: Shield, label: 'Protegido por LGPD' },
                    { icon: Lock, label: 'Dados Criptografados' },
                    { icon: Smartphone, label: 'Acesso Mobile' },
                    { icon: Heart, label: 'Cuidado com você' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-gray-400">
                      <Icon className="w-4 h-4 text-pink-500" />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ────────────── PATIENT DASHBOARD ────────────── */
          <div className="bg-gray-50 min-h-full">
            {/* Dashboard hero */}
            <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white px-4 py-10 sm:py-12">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    Bem-vindo{patientName ? `, ${patientName.split(' ')[0]}` : ''}!
                  </h1>
                  <p className="text-pink-100 text-sm sm:text-base">
                    Gerencie sua saúde em um só lugar
                  </p>
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg sm:text-xl font-bold text-white">{initials}</span>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 -mt-5 pb-10">
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { value: appointments.length, label: 'Consultas', icon: Calendar, color: 'bg-pink-600' },
                  { value: medicalRecords.length, label: 'Prontuários', icon: FileText, color: 'bg-green-600' },
                  { value: pendingPayments, label: 'Pgto. Pendente', icon: CreditCard, color: 'bg-orange-500' },
                  { value: telemedicineCount, label: 'Telemedicina', icon: Video, color: 'bg-purple-600' },
                ].map(({ value, label, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-2xl font-bold text-gray-900">{value}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* No patient record alert */}
              {!patientRecord && !dataLoading && (
                <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Cadastro de paciente não encontrado</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Nenhum paciente vinculado ao e-mail{' '}
                      <strong>{session?.user?.email}</strong>. Entre em contato com a clínica para vincular seu cadastro.
                    </p>
                  </div>
                </div>
              )}

              {dataLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
                </div>
              ) : (
                /* Tabs panel */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Tab bar */}
                  <div className="border-b border-gray-100 overflow-x-auto">
                    <div className="flex min-w-max">
                      {(
                        [
                          { id: 'appointments', label: 'Consultas', icon: Calendar },
                          { id: 'records', label: 'Prontuários', icon: FileText },
                          { id: 'payments', label: 'Pagamentos', icon: CreditCard },
                          { id: 'profile', label: 'Meu Perfil', icon: User },
                        ] as const
                      ).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setActiveTab(id)}
                          className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                            activeTab === id
                              ? 'border-pink-600 text-pink-600 bg-pink-50/40'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">

                    {/* ── Appointments ── */}
                    {activeTab === 'appointments' && (
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-semibold text-gray-900">Próximas Consultas</h3>
                          <button className="px-4 py-2 bg-pink-600 text-white text-sm rounded-xl hover:bg-pink-700 transition-colors font-medium">
                            Agendar Nova
                          </button>
                        </div>
                        {appointments.length === 0 ? (
                          <EmptyState
                            icon={Calendar}
                            message="Nenhuma consulta agendada"
                            sub={
                              patientRecord
                                ? 'Agende sua próxima consulta clicando no botão acima'
                                : 'Seu cadastro precisa ser vinculado para exibir consultas'
                            }
                          />
                        ) : (
                          <div className="space-y-3">
                            {appointments.map(apt => (
                              <div
                                key={apt.id}
                                className="border border-gray-100 rounded-xl p-4 hover:border-pink-200 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="font-medium text-gray-900 text-sm">{apt.doctorName}</span>
                                      <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${
                                          apt.status === 'confirmado'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}
                                      >
                                        {apt.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">{apt.specialty}</p>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {apt.date} às {apt.time}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        {apt.type === 'telemedicina' ? (
                                          <><Video className="w-3.5 h-3.5" />Telemedicina</>
                                        ) : (
                                          <><Clock className="w-3.5 h-3.5" />{apt.room || 'Presencial'}</>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 flex-shrink-0">
                                    {apt.type === 'telemedicina' && apt.telemedLink && (
                                      <a
                                        href={apt.telemedLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                                      >
                                        <Video className="w-3 h-3" />
                                        Entrar
                                      </a>
                                    )}
                                    <button className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Records ── */}
                    {activeTab === 'records' && (
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-semibold text-gray-900">Histórico Médico</h3>
                          <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Shield className="w-3.5 h-3.5" />
                            Protegido por LGPD
                          </span>
                        </div>
                        {medicalRecords.length === 0 ? (
                          <EmptyState
                            icon={FileText}
                            message="Nenhum prontuário disponível"
                            sub="Seus registros médicos aparecerão aqui após as consultas"
                          />
                        ) : (
                          <div className="space-y-3">
                            {medicalRecords.map(record => (
                              <div key={record.id} className="border border-gray-100 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="font-medium text-gray-900 text-sm">{record.type}</span>
                                      {record.signed && (
                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                          Assinado
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      <strong>Data:</strong> {record.date}&ensp;·&ensp;
                                      <strong>Prof.:</strong> {record.doctorName}
                                    </p>
                                    {record.cid10 && record.cid10 !== '-' && (
                                      <p className="text-xs text-gray-400 mt-1">CID-10: {record.cid10}</p>
                                    )}
                                  </div>
                                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
                                    <Download className="w-3.5 h-3.5" />
                                    PDF
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Payments ── */}
                    {activeTab === 'payments' && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-5">Histórico de Pagamentos</h3>
                        {payments.length === 0 ? (
                          <EmptyState
                            icon={CreditCard}
                            message="Nenhum pagamento registrado"
                            sub="Seu histórico de pagamentos aparecerá aqui"
                          />
                        ) : (
                          <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
                            <table className="w-full min-w-[580px]">
                              <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/60">
                                  {['Data', 'Descrição', 'Valor', 'Método', 'Status', 'Ações'].map(h => (
                                    <th
                                      key={h}
                                      className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide ${
                                        h === 'Ações' ? 'text-right' : 'text-left'
                                      }`}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {payments.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-700">{p.date}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{p.type}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      R$ {p.amount.toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{p.method}</td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${
                                          p.status === 'received'
                                            ? 'bg-green-100 text-green-700'
                                            : p.status === 'overdue'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}
                                      >
                                        {p.status === 'received'
                                          ? 'Recebido'
                                          : p.status === 'overdue'
                                          ? 'Vencido'
                                          : 'Pendente'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                          p.status === 'pending'
                                            ? 'bg-pink-600 text-white hover:bg-pink-700'
                                            : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                      >
                                        {p.status === 'pending' ? 'Pagar' : 'Recibo'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Profile ── */}
                    {activeTab === 'profile' && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-5">Meus Dados</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          {[
                            { label: 'Nome Completo', value: patientRecord?.name ?? '' },
                            { label: 'CPF', value: patientRecord?.cpf ?? '' },
                            { label: 'E-mail', value: patientRecord?.email ?? session?.user?.email ?? '' },
                            { label: 'Telefone', value: patientRecord?.phone ?? '' },
                            { label: 'Data de Nascimento', value: patientRecord?.birthDate ?? '' },
                            { label: 'Convênio', value: patientRecord?.insurance ?? 'Particular' },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                              <input
                                type="text"
                                defaultValue={value}
                                disabled
                                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl text-gray-700 cursor-not-allowed"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="p-4 bg-pink-50 border border-pink-100 rounded-xl flex items-start gap-3">
                          <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              Privacidade e Proteção de Dados
                            </p>
                            <p className="text-xs text-gray-500 mb-2">
                              Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD). Você tem o direito
                              de acessar, corrigir e solicitar a exclusão de suas informações.
                            </p>
                            <button className="text-xs text-pink-600 hover:text-pink-700 font-medium transition-colors">
                              Gerenciar Consentimentos LGPD →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <img
                src={logoAmplieMed}
                alt="AmplieMed"
                className="h-7 object-contain brightness-0 invert mb-3 opacity-80"
              />
              {clinicInfo.clinicName && (
                <p className="text-sm font-medium text-gray-300 mb-1">{clinicInfo.clinicName}</p>
              )}
              <p className="text-sm text-gray-500 leading-relaxed">
                Portal do paciente — acesse seus dados de saúde com segurança.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h5 className="text-white text-sm font-semibold mb-4">Contato</h5>
              <div className="space-y-2.5">
                {clinicInfo.phone && (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                    {clinicInfo.phone}
                  </p>
                )}
                {clinicInfo.email && (
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                    {clinicInfo.email}
                  </p>
                )}
                {clinicInfo.address && (
                  <p className="text-sm flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" />
                    {clinicInfo.address}
                  </p>
                )}
                {clinicInfo.workingHours && (
                  <p className="text-sm flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                    Seg–Sex: {clinicInfo.workingHours.start} às {clinicInfo.workingHours.end}
                  </p>
                )}
              </div>
            </div>

            {/* Privacy */}
            <div>
              <h5 className="text-white text-sm font-semibold mb-4">Segurança & Privacidade</h5>
              <p className="text-sm leading-relaxed text-gray-500">
                Seus dados são protegidos pela{' '}
                <span className="text-gray-300 font-medium">LGPD</span> e trafegam com criptografia
                de ponta a ponta. Suas informações nunca são compartilhadas sem sua autorização.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <p>
              © {new Date().getFullYear()} {clinicInfo.clinicName || 'AmplieMed'}. Todos os direitos reservados.
            </p>
            <p>
              Desenvolvido por{' '}
              <span className="text-pink-500 font-medium">Amplie Marketing</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  message,
  sub,
}: {
  icon: React.ElementType;
  message: string;
  sub: string;
}) {
  return (
    <div className="text-center py-14">
      <Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 font-medium text-sm">{message}</p>
      <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">{sub}</p>
    </div>
  );
}

interface AuthCardProps {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  showPasswordConfirm: boolean; setShowPasswordConfirm: (v: boolean) => void;
  loading: boolean;
  error: string; setError: (v: string) => void;
  success: string;
  onLogin: (e: React.FormEvent) => void;
  onRegister: (e: React.FormEvent) => void;
}

function AuthCard({
  mode, setMode,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  name, setName,
  phone, setPhone,
  showPassword, setShowPassword,
  showPasswordConfirm, setShowPasswordConfirm,
  loading, error, setError, success,
  onLogin, onRegister,
}: AuthCardProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta de paciente'}
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        {mode === 'login'
          ? 'Acesse seu portal de saúde'
          : 'Cadastre-se para acessar seus dados de saúde'}
      </p>

      {success ? (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      ) : (
        <form onSubmit={mode === 'login' ? onLogin : onRegister} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome Completo *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Seu nome completo"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">E-mail *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                className={`${INPUT_CLASS} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Senha *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className={`${INPUT_CLASS} pl-10 pr-10`}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirmar Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  placeholder="••••••••"
                  className={`${INPUT_CLASS} pl-10 pr-10`}
                />
                <button
                  type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-pink-600 text-white font-semibold rounded-xl hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
      )}

      <div className="mt-5 text-center">
        <p className="text-sm text-gray-400">
          {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-pink-600 font-semibold hover:text-pink-700 transition-colors"
          >
            {mode === 'login' ? 'Cadastrar-se' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
