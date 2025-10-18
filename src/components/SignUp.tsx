import React, { useState } from 'react';
import { Mail, Lock, User, Globe, Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AvalanexLogo from './AvalanexLogo';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface SignUpProps {
  onBackToLogin: () => void;
}

const countries = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
];

export function SignUp({ onBackToLogin }: SignUpProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    country: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const validatePassword = (password: string): PasswordRequirement[] => {
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains number', met: /\d/.test(password) },
      { label: 'Contains special character', met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
    ];
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; percentage: number } => {
    const requirements = validatePassword(password);
    const metCount = requirements.filter(r => r.met).length;
    const percentage = (metCount / requirements.length) * 100;

    if (metCount <= 2) return { strength: 'Weak', color: 'bg-red-500', percentage };
    if (metCount <= 3) return { strength: 'Fair', color: 'bg-orange-500', percentage };
    if (metCount <= 4) return { strength: 'Good', color: 'bg-yellow-500', percentage };
    return { strength: 'Strong', color: 'bg-emerald-500', percentage };
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const isFormValid = (): boolean => {
    const passwordRequirements = validatePassword(formData.password);
    const allPasswordReqsMet = passwordRequirements.every(req => req.met);

    return (
      validateEmail(formData.email) &&
      allPasswordReqsMet &&
      formData.password === formData.confirmPassword &&
      formData.fullName.trim().length >= 2 &&
      validateUsername(formData.username) &&
      formData.country !== ''
    );
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
            country: formData.country,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSignUpSuccess(true);
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'An error occurred during sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });

      if (resendError) throw resendError;

      setError('');
      alert('Confirmation email resent! Please check your inbox.');
    } catch (err: any) {
      console.error('Resend email error:', err);
      setError(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResendingEmail(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <AvalanexLogo className="w-16 h-16" />
            </div>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-6">
              <Mail className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-gray-400">
              We've sent a confirmation link to
            </p>
            <p className="text-white font-semibold mt-2 break-all">
              {formData.email}
            </p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Next Steps
            </h3>
            <ol className="text-gray-300 text-sm space-y-2 ml-7 list-decimal">
              <li>Open the confirmation email</li>
              <li>Click the activation link</li>
              <li>Log in with your credentials</li>
            </ol>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm">
              <strong>Tip:</strong> Can't find the email? Check your spam or junk folder.
            </p>
          </div>

          <button
            onClick={handleResendEmail}
            disabled={resendingEmail}
            className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
          </button>

          <button
            onClick={onBackToLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>

          {error && (
            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  const passwordRequirements = validatePassword(formData.password);
  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <div className="flex justify-center mb-8">
          <AvalanexLogo className="w-16 h-16" />
        </div>

        <h2 className="text-3xl font-bold text-center text-white mb-2">Create Account</h2>
        <p className="text-gray-400 text-center mb-8">Join Avalanex and start tracking your portfolio</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-600"
                placeholder="John Doe"
                required
                minLength={2}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-600"
                placeholder="johndoe"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">3-20 characters, letters, numbers, and underscores only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-600"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Country *
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-600 appearance-none cursor-pointer"
                required
              >
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-700 text-white pl-10 pr-12 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-600"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Password Strength:</span>
                  <span className={`text-xs font-semibold ${
                    passwordStrength.strength === 'Weak' ? 'text-red-400' :
                    passwordStrength.strength === 'Fair' ? 'text-orange-400' :
                    passwordStrength.strength === 'Good' ? 'text-yellow-400' :
                    'text-emerald-400'
                  }`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {formData.password && (
              <div className="mt-3 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className={req.met ? 'text-emerald-400' : 'text-gray-400'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-gray-700 text-white pl-10 pr-12 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-600"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <X className="w-3 h-3" />
                Passwords do not match
              </p>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Passwords match
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid() || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onBackToLogin}
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Already have an account? Log in
          </button>
        </div>
      </div>
    </div>
  );
}
