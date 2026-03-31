import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, ArrowLeft, User, Mail, Phone } from 'lucide-react';
import logoAmplieMed from '../assets/775bd1b6594b305b8d42a07d24da813913fe5060.png';
import { ClinicSignup } from './ClinicSignup';
import type { ClinicSignupResult } from '../types';
import { getSupabase } from '../utils/supabaseClient';
import { DitheringShader } from "./ui/dithering-shader";

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
  'w-full px-3.5 py-2.5 text-sm bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 transition-all placeholder:text-gray-300';

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

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setShowForgotPassword(false);
    setForgotSent(false);
    setForgotEmail('');
  };

  // ── Forgot password handler ─────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes('@')) {
      setError('Digite um e-mail válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}`,
      });
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <DitheringShader
          shape="wave"
          type="8x8"
          colorBack="#ffffff"
          colorFront="#ff0088"
          pxSize={2}
          speed={0.6}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoAmplieMed} alt="AmplieMed" className="h-10 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-white/95 rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5),0_20px_40px_-10px_rgba(0,0,0,0.3)] border-2 border-white/50 backdrop-blur-md p-7 ring-1 ring-black/5">
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* LOGIN FORM                                                    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {mode === 'login' && !showForgotPassword && (
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
                    className="text-xs text-pink-500 hover:text-pink-600 transition-colors"
                    onClick={() => { setShowForgotPassword(true); setError(''); }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-pink-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-pink-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <p className="text-center text-sm text-gray-500">
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('clinic-signup')}
                    className="text-pink-600 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
                  >
                    Registre-se
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* FORGOT PASSWORD                                               */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {mode === 'login' && showForgotPassword && (
            <>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setForgotSent(false); setError(''); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
                </button>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-gray-900">Recuperar senha</h1>
                <p className="text-[13px] text-gray-400 mt-0.5">Enviaremos um link para o seu e-mail</p>
              </div>

              {error && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {forgotSent ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 className="w-10 h-10 text-pink-500" />
                  <p className="text-sm text-gray-700 text-center">
                    E-mail enviado! Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); }}
                    className="mt-2 text-xs text-pink-500 hover:text-pink-600 transition-colors"
                  >
                    Voltar para o login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="block text-xs font-medium mb-1.5 text-[#101828]">
                      E-mail
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="seu@email.com"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !forgotEmail}
                    className="w-full bg-pink-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-pink-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Enviar link de recuperação
                      </>
                    )}
                  </button>
                </form>
              )}
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
                  className="w-full bg-pink-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-pink-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
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
                    className="text-pink-600 font-medium hover:text-pink-700 transition-colors text-[13px]"
                  >
                    Faça login
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('clinic-signup')}
                  className="w-full text-center text-sm font-medium px-4 py-2 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors"
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