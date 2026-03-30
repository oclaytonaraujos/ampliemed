import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, Building2, Mail, Phone, MapPin } from 'lucide-react';
import type { ClinicSignupResult } from '../types';
import { toastSuccess, toastError } from '../utils/toastService';
import { useApp } from './AppContext';

interface ClinicSignupProps {
  /**
   * Called when clinic signup is successful
   */
  onSignupSuccess: (result: ClinicSignupResult) => void;
  /**
   * Called when user wants to go back to login
   */
  onBackToLogin: () => void;
}

type SignupStep = 'clinic-info' | 'credentials' | 'confirmation';

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 text-sm bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 transition-all placeholder:text-gray-300';

export function ClinicSignup({ onSignupSuccess, onBackToLogin }: ClinicSignupProps) {
  const { clinicSignup } = useApp();

  // ─── Navigation ────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<SignupStep>('clinic-info');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Form Data ─────────────────────────────────────────────────────────
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [cnpj, setCnpj] = useState('');

  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [complement, setComplement] = useState('');

  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptLgpd, setAcceptLgpd] = useState(false);

  // ─── Validators ────────────────────────────────────────────────────────
  const validateClinicInfo = (): boolean => {
    setError('');
    if (!clinicName.trim()) {
      setError('Informe o nome da clínica');
      return false;
    }
    if (!clinicEmail.includes('@')) {
      setError('Informe um e-mail válido');
      return false;
    }
    if (!clinicPhone.replace(/\D/g, '') || clinicPhone.replace(/\D/g, '').length < 10) {
      setError('Informe um telefone válido com DDD');
      return false;
    }
    if (cnpj && !/^\d{14}$/.test(cnpj.replace(/\D/g, ''))) {
      setError('CNPJ inválido (deve ter 14 dígitos)');
      return false;
    }
    return true;
  };

  const validateAddressAndCredentials = (): boolean => {
    setError('');
    
    // Address validation
    if (!street.trim() || !number.trim() || !city.trim()) {
      setError('Preencha rua, número e cidade');
      return false;
    }
    
    const zipDigits = zipCode.replace(/\D/g, '');
    if (zipDigits.length !== 8) {
      setError('CEP deve conter 8 dígitos');
      return false;
    }

    // Password validation
    if (adminPassword.length < 8) {
      setError('Senha deve ter no mínimo 8 caracteres');
      return false;
    }
    if (adminPassword !== adminConfirmPassword) {
      setError('As senhas não conferem');
      return false;
    }

    // Password strength: uppercase, lowercase, number
    const hasUpperCase = /[A-Z]/.test(adminPassword);
    const hasLowerCase = /[a-z]/.test(adminPassword);
    const hasNumber = /\d/.test(adminPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Senha deve ter maiúsculas, minúsculas e números');
      return false;
    }

    return true;
  };

  const validateConfirmation = (): boolean => {
    setError('');
    if (!acceptTerms) {
      setError('Aceite os termos de serviço');
      return false;
    }
    if (!acceptLgpd) {
      setError('Aceite a política de privacidade e LGPD');
      return false;
    }
    return true;
  };

  // ─── Step Navigation ───────────────────────────────────────────────────
  const handleNext = () => {
    switch (currentStep) {
      case 'clinic-info':
        if (validateClinicInfo()) {
          setCurrentStep('credentials');
        }
        break;
      case 'credentials':
        if (validateAddressAndCredentials()) {
          setCurrentStep('confirmation');
        }
        break;
      case 'confirmation':
        if (validateConfirmation()) {
          handleSubmit();
        }
        break;
    }
  };

  const handlePrev = () => {
    const steps: SignupStep[] = ['clinic-info', 'credentials', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      setError('');
    }
  };

  // ─── Form Submission ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await clinicSignup({
        clinicName: clinicName.trim(),
        cnpj: cnpj.replace(/\D/g, '') || undefined,
        email: clinicEmail.trim(),
        phone: clinicPhone.replace(/\D/g, ''),
        password: adminPassword,
        confirmPassword: adminConfirmPassword,
        address: {
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.replace(/\D/g, ''),
          complement: complement.trim() || undefined,
        },
        acceptTerms,
        lgpdConsent: acceptLgpd,
      });

      toastSuccess(`Bem-vindo! ${clinicName} foi criada com sucesso! 🎉`);

      // Call success callback
      setTimeout(() => {
        onSignupSuccess(response);
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already') || msg.includes('existe') || msg.includes('duplicate')) {
        setError('Esta clínica já está registrada. Verifique o CNPJ e e-mail.');
      } else if (msg.includes('conectar ao servidor') || msg.includes('indisponível')) {
        setError('❌ Servidor indisponível. Tente novamente mais tarde.');
      } else {
        setError(msg || 'Erro ao registrar clínica. Tente novamente.');
      }
      toastError(error || 'Falha no registro');
    } finally {
      setLoading(false);
    }
  };

  // ─── Formatters ───────────────────────────────────────────────────────
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const formatZipCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const getProgress = () => {
    const steps: SignupStep[] = ['clinic-info', 'credentials', 'confirmation'];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
            <Building2 className="w-5 h-5 text-pink-600" />
            Registrar Clínica
          </h2>
          <p className="text-[13px] text-gray-400 mt-1">
            Passo {['clinic-info', 'credentials', 'confirmation'].indexOf(currentStep) + 1} de 3
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-pink-600 transition-all duration-300"
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: Clinic Information                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 'clinic-info' && (
        <div className="space-y-3.5">
          <p className="text-xs text-gray-600 mb-4">
            Informe os dados da sua clínica. Estes dados podem ser editados depois.
          </p>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-900">
              Nome da Clínica <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className={`${INPUT_CLASS} pl-9`}
                placeholder="Ex: Clínica Médica São Paulo"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-900">
              CNPJ <span className="text-gray-400 text-[11px]">(opcional)</span>
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
              className={INPUT_CLASS}
              placeholder="00.000.000/0000-00"
              disabled={loading}
              maxLength={18}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-900">
              E-mail da Clínica <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                className={`${INPUT_CLASS} pl-9`}
                placeholder="contato@clinica.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Será usado para receber notificações importantes
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-900">
              Telefone <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="tel"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(formatPhone(e.target.value))}
                className={`${INPUT_CLASS} pl-9`}
                placeholder="(11) 98765-4321"
                disabled={loading}
                autoComplete="tel"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: Credentials & Address                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 'credentials' && (
        <div className="space-y-4">
          {/* Address Section */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-900 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Endereço da Clínica
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Necessário para compliance e documentação.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Rua <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Ex: Rua das Flores"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Número <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="123"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Apto 42"
                  disabled={loading}
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Bairro <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Ex: Centro"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Cidade <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="São Paulo"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Estado <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  className={INPUT_CLASS}
                  placeholder="SP"
                  disabled={loading}
                  maxLength={2}
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                  CEP <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                  className={INPUT_CLASS}
                  placeholder="01234-567"
                  disabled={loading}
                  maxLength={9}
                />
              </div>
            </div>
          </div>

          {/* Credentials Section */}
          <div className="pt-4 border-t border-gray-200 space-y-3.5">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-900 font-semibold">
                Sua Senha de Acesso
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Esta será a senha do administrador da clínica para acessar o sistema.
              </p>

              <div>
                <label className="text-xs text-gray-700 mb-1.5 block">Senha <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="new-password"
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
                <p className="text-[11px] text-gray-400 mt-1">
                  Mínimo 8 caracteres com maiúsculas, minúsculas e números
                </p>
              </div>

              <div className="mt-3">
                <label className="text-xs text-gray-700 mb-1.5 block">Confirmar Senha <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: Confirmation                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 'confirmation' && (
        <div className="space-y-4">
          <div className="bg-pink-50 border border-pink-100 rounded-lg p-4 text-xs space-y-2">
            <strong className="text-pink-900">Resumo do seu registro:</strong>
            <div className="text-pink-800 space-y-1 ml-2">
              <p>✓ Clínica: <strong>{clinicName}</strong></p>
              <p>✓ CNPJ: <strong>{cnpj || 'Não informado'}</strong></p>
              <p>✓ E-mail: <strong>{clinicEmail}</strong></p>
              <p>✓ Telefone: <strong>{clinicPhone}</strong></p>
              <p>✓ Endereço: <strong>{street}, {number} - {neighborhood}, {city}/{state}</strong></p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 mt-0.5 border border-gray-200 rounded focus:ring-2 focus:ring-pink-500"
              />
              <span className="text-xs text-gray-700">
                Aceito os <a href="#" className="text-pink-600 hover:underline font-medium">termos de serviço</a> e <a href="#" className="text-pink-600 hover:underline font-medium">política de privacidade</a> <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={acceptLgpd}
                onChange={(e) => setAcceptLgpd(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 mt-0.5 border border-gray-200 rounded focus:ring-2 focus:ring-pink-500"
              />
              <span className="text-xs text-gray-700">
                Entendo minhas responsabilidades com a <a href="#" className="text-pink-600 hover:underline font-medium">Lei LGPD</a> e proteção de dados de pacientes <span className="text-red-400">*</span>
              </span>
            </label>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg p-3 mt-4">
            <p className="text-[11px] text-green-800">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-600" />
              Após registrar sua clínica, você poderá convidar profissionais (médicos, recepcionistas, etc) a se juntar.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-2">
        {currentStep === 'clinic-info' ? (
          <>
            <button
              onClick={onBackToLogin}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Voltar ao Login
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium py-2.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Próximo...
                </>
              ) : (
                'Próximo'
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handlePrev}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Voltar
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className={`flex-1 text-white text-sm font-medium py-2.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                currentStep === 'confirmation' ? 'bg-green-600 hover:bg-green-700' : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {currentStep === 'confirmation' ? 'Registrando...' : 'Próximo...'}
                </>
              ) : currentStep === 'confirmation' ? (
                'Registrar Clínica'
              ) : (
                'Próximo'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
