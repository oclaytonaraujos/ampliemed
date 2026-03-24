import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, ArrowLeft, User, Mail, Phone } from 'lucide-react';
import logoAmplieMed from '../assets/775bd1b6594b305b8d42a07d24da813913fe5060.png';
import { toastInfo } from '../utils/toastService';
import { ClinicSignup } from './ClinicSignup';
import type { ClinicSignupResult } from '../types';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onSignup: (data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    specialty?: string;
    crm?: string;
    phone?: string;
  }) => Promise<boolean>;
  onClinicSignup?: (result: ClinicSignupResult) => void;
}

type Mode = 'login' | 'professional-signup' | 'clinic-signup';

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 text-sm bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300';

export function Login({ onLogin, onSignup, onClinicSignup }: LoginProps) {
  const [mode, setMode] = useState<Mode>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  // ── Login handler ───────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (!email.includes('@')) {
      setError('E-mail inválido');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  };

  // ── Signup handler ──────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!signupName.trim()) {
      setError('Informe seu nome completo');
      return;
    }
    if (!signupEmail || !signupEmail.includes('@')) {
      setError('Informe um e-mail válido');
      return;
    }
    if (signupPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    setLoading(true);
    try {
      const ok = await onSignup({
        email: signupEmail,
        password: signupPassword,
        name: signupName.trim(),
        role: 'doctor',
        specialty: undefined,
        crm: undefined,
        phone: signupPhone || undefined,
      });
      if (!ok) {
        setError('Não foi possível criar a conta. Tente novamente.');
        setLoading(false);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already') || msg.includes('existe') || msg.includes('duplicate')) {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else if (msg.includes('conectar ao servidor') || msg.includes('indisponível')) {
        setError('❌ Servidor indisponível. Verifique se o Edge Function está deployado no Supabase.');
      } else {
        setError(msg || 'Erro ao criar conta. Tente novamente.');
      }
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoAmplieMed} alt="AmplieMed" className="h-10 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.06)] border border-gray-100/80 p-7">
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* LOGIN FORM                                                    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-gray-900">Bem-vindo de volta</h1>
                <p className="text-[13px] text-gray-400 mt-0.5">Entre na sua conta</p>
              </div>

              {error && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    E-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="seu@email.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                    onClick={() => toastInfo('Recuperação de senha: entre em contato com o administrador do sistema')}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>

              {/* Switch to signup */}
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-center text-[13px] text-gray-500">
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('professional-signup')}
                    className="text-blue-600 font-medium hover:text-blue-700 transition-colors text-[13px]"
                  >
                    Cadastre-se
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('clinic-signup')}
                  className="w-full text-center text-sm font-medium px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Registrar Clínica
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SIGNUP FORM (Professional)                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {mode === 'professional-signup' && (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao login
                </button>
                <div className="text-center">
                  <h1 className="text-lg font-semibold text-gray-900">Criar conta profissional</h1>
                  <p className="text-[13px] text-gray-400 mt-0.5">Preencha seus dados para começar</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-2.5 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-600">{success}</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-3.5">
                {/* Name */}
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    Nome completo <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className={`${INPUT_CLASS} pl-9`}
                      placeholder="João Silva"
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="signup-email" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    E-mail <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className={`${INPUT_CLASS} pl-9`}
                      placeholder="seu@email.com"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="signup-phone" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      id="signup-phone"
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(formatPhone(e.target.value))}
                      className={`${INPUT_CLASS} pl-9`}
                      placeholder="(11) 99999-9999"
                      disabled={loading}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    Senha <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="Mínimo 6 caracteres"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      tabIndex={-1}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signupPassword.length > 0 && signupPassword.length < 6 && (
                    <p className="text-[11px] text-amber-500 mt-1">A senha precisa ter pelo menos 6 caracteres</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="signup-confirm-password" className="block text-xs font-medium mb-1.5 text-[#101828]">
                    Confirmar senha <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className={`${INPUT_CLASS} pr-10 ${
                        signupConfirmPassword.length > 0 && signupPassword !== signupConfirmPassword
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                          : signupConfirmPassword.length > 0 && signupPassword === signupConfirmPassword
                          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400'
                          : ''
                      }`}
                      placeholder="Repita a senha"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      tabIndex={-1}
                    >
                      {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signupConfirmPassword.length > 0 && signupPassword !== signupConfirmPassword && (
                    <p className="text-[11px] text-red-500 mt-1">As senhas não conferem</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </button>
              </form>

              {/* Switch to login */}
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-center text-[13px] text-gray-500">
                  Já tem uma clínica?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-blue-600 font-medium hover:text-blue-700 transition-colors text-[13px]"
                  >
                    Faça login
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('clinic-signup')}
                  className="w-full text-center text-sm font-medium px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Registrar uma Clínica
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CLINIC SIGNUP (Clinic-First Model)                            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {mode === 'clinic-signup' && (
            <ClinicSignup
              onSignupSuccess={(result) => {
                onClinicSignup?.(result);
              }}
              onBackToLogin={() => switchMode('login')}
            />
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-gray-300">
          &copy; 2026 Amplie Marketing
        </p>
      </div>
    </div>
  );
}