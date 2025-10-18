import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, DollarSign, BarChart3, TrendingUp, CheckCircle } from 'lucide-react';
import AvalanexLogo from './AvalanexLogo';
import { logActivity } from '../utils/activityLogger';

interface LoginProps {
  onShowSignUp: () => void;
  confirmationMessage?: string;
  onClearMessage?: () => void;
}

const Login = ({ onShowSignUp, confirmationMessage, onClearMessage }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Set the page title when the Login component mounts
    document.title = 'Avalanex - Login';

    // Show confirmation message if provided
    if (confirmationMessage) {
      setMessage(confirmationMessage);
      if (onClearMessage) {
        setTimeout(() => {
          onClearMessage();
        }, 5000);
      }
    }

    // Optional: Reset title when component unmounts
    return () => {
      document.title = 'Avalanex';
    };
  }, [confirmationMessage, onClearMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        await logActivity('failed_login', { email, reason: error.message });
        throw error;
      }

      await logActivity('login', { email });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      await logActivity('password_reset_requested', { email });
      setMessage('Check your email for the password reset link');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send recovery email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent"></div>

        {/* Animated background elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          {/* Logo */}
          <div className="flex items-center space-x-4 mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <AvalanexLogo className="w-12 h-12" />
            </div>
            <span className="text-4xl font-bold text-white">Avalanex</span>
          </div>

          {/* Feature highlights */}
          <div className="space-y-8">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Track Your Portfolio.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Grow Your Wealth.
              </span>
            </h1>

            <p className="text-xl text-gray-300 leading-relaxed">
              Professional dividend tracking and portfolio management for smart investors.
            </p>

            <div className="space-y-6 pt-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Track Dividends</h3>
                  <p className="text-gray-400">Monitor upcoming payments and annual yields across your entire portfolio.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Real-time Analytics</h3>
                  <p className="text-gray-400">Get instant insights with live market data and performance metrics.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Growth Tracking</h3>
                  <p className="text-gray-400">Visualize your portfolio performance with detailed charts and trends.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <AvalanexLogo className="w-9 h-9" />
            </div>
            <span className="text-3xl font-bold text-white">Avalanex</span>
          </div>

          {/* Form Card */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isRecovery ? 'Reset Password' : 'Welcome Back'}
              </h2>
              <p className="text-gray-400">
                {isRecovery
                  ? 'Enter your email to receive a reset link'
                  : 'Sign in to access your portfolio'
                }
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{message}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={isRecovery ? handlePasswordRecovery : handleLogin}>
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Input */}
              {!isRecovery && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password Link */}
              {!isRecovery && !isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovery(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                )}
                <span>
                  {loading
                    ? (isRecovery ? 'Sending...' : 'Signing in...')
                    : (isRecovery ? 'Send Reset Link' : 'Sign In')
                  }
                </span>
              </button>

              {/* Toggle Sign Up/Login */}
              <div className="text-center pt-4">
                {isRecovery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovery(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Back to login
                  </button>
                ) : (
                  <div className="text-sm text-gray-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={onShowSignUp}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Create account
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Terms and conditions</a>
            <span className="mx-3">•</span>
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;