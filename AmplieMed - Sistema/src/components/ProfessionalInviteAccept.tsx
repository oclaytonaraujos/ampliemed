import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Stethoscope, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { acceptClinicInvite } from '../utils/api';

interface FormData {
  name: string;
  password: string;
  confirmPassword: string;
  crm?: string;
  specialty?: string;
  acceptTerms: boolean;
  lgpdConsent: boolean;
}

interface InviteInfo {
  email: string;
  role: string;
  clinicName: string;
}

export function ProfessionalInviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    acceptTerms: false,
    lgpdConsent: false,
  });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setError('Invalid invite link. Missing token or email.');
        setIsValidating(false);
        return;
      }

      try {
        // For now, we'll assume the token is valid if we got here
        // In production, you might want to validate it with a backend call
        // This is just a placeholder - the real validation happens when accepting
        setInviteInfo({
          email: email,
          role: 'doctor', // This would come from the invite info in production
          clinicName: 'Your Clinic', // This would come from the invite info in production
        });
        setIsValidating(false);
      } catch (err) {
        setError('Failed to validate invite. Please try again.');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, email]);

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }

    if (formData.name.length < 3) {
      return 'Name must be at least 3 characters';
    }

    if (!formData.password) {
      return 'Password is required';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }

    if (!/[A-Z]/.test(formData.password)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/[0-9]/.test(formData.password)) {
      return 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      return 'You must accept the terms of service';
    }

    if (!formData.lgpdConsent) {
      return 'LGPD consent is required';
    }

    return null;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type, value, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await acceptClinicInvite({
        token: token!,
        email: email!,
        password: formData.password,
        name: formData.name,
        crm: formData.crm,
        specialty: formData.specialty,
      });

      if (!response) throw new Error('Failed to accept invite');

      toast.success(`Welcome to ${response.clinic.name}! 🎉`);

      // Optional: Auto-login could happen here
      // For now, redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="flex justify-center mb-4">
            <Loader className="h-8 w-8 text-pink-500 animate-spin" />
          </div>
          <p className="text-center text-slate-600">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (!inviteInfo || !token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Invalid Invite</h1>
          <p className="text-center text-slate-600 mb-6">
            {error || 'This invite link is invalid or has expired.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-pink-600 text-white py-2 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full blur opacity-75"></div>
              <div className="relative bg-white p-3 rounded-full">
                <Stethoscope className="h-8 w-8 text-pink-600" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join the Team</h1>
          <p className="text-slate-300">Complete your professional profile</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Invite Info */}
          <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">
              <span className="font-semibold">Email:</span> {email}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Role:</span> Professional
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* CRM (optional) */}
            <div>
              <label htmlFor="crm" className="block text-sm font-medium text-slate-700 mb-1">
                CRM (Medical License) <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                id="crm"
                name="crm"
                value={formData.crm || ''}
                onChange={handleInputChange}
                placeholder="Your CRM number"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* Specialty (optional) */}
            <div>
              <label htmlFor="specialty" className="block text-sm font-medium text-slate-700 mb-1">
                Specialty <span className="text-slate-400">(optional)</span>
              </label>
              <select
                id="specialty"
                name="specialty"
                value={formData.specialty || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select a specialty</option>
                <option value="general">General Practice</option>
                <option value="cardiology">Cardiology</option>
                <option value="orthopedics">Orthopedics</option>
                <option value="pediatrics">Pediatrics</option>
                <option value="psychiatry">Psychiatry</option>
                <option value="dermatology">Dermatology</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min. 8 chars, uppercase, numbers"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Must contain uppercase letters and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                className="mt-1 w-4 h-4 border border-slate-300 rounded text-pink-600 focus:ring-2 focus:ring-pink-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-slate-700">
                I accept the <a href="#" className="text-pink-600 hover:text-pink-700 font-semibold">terms of service</a> *
              </label>
            </div>

            {/* LGPD Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="lgpdConsent"
                name="lgpdConsent"
                checked={formData.lgpdConsent}
                onChange={handleInputChange}
                className="mt-1 w-4 h-4 border border-slate-300 rounded text-pink-600 focus:ring-2 focus:ring-pink-500"
              />
              <label htmlFor="lgpdConsent" className="text-sm text-slate-700">
                I consent to LGPD data processing <a href="#" className="text-pink-600 hover:text-pink-700 font-semibold">privacy policy</a> *
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 text-white font-semibold py-2 rounded-lg hover:from-pink-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Complete Registration
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <a href="/login" className="text-pink-600 hover:text-pink-700 font-semibold">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
