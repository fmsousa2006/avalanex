import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, CreditCard, Bell, Shield, AlertTriangle, Save, Loader2, Star, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';
import { Notification } from './Notification';
import Logo1 from './logos/Logo1';
import UserMenu from './UserMenu';

interface MyAccountProps {
  onBack: () => void;
  onOpenWatchlist: () => void;
  onLogout: () => void;
}

type TabType = 'profile' | 'subscription' | 'notifications' | 'security' | 'danger';

interface UserPreferences {
  display_name: string;
  preferred_currency: 'USD' | 'EUR';
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY';
  language: string;
  email_notifications: boolean;
}

interface UsageStats {
  portfolioCount: number;
  stockCount: number;
}

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const MyAccount: React.FC<MyAccountProps> = ({ onBack, onOpenWatchlist, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [preferences, setPreferences] = useState<UserPreferences>({
    display_name: '',
    preferred_currency: 'USD',
    date_format: 'MM/DD/YYYY',
    language: 'en-US',
    email_notifications: true,
  });
  const [usageStats, setUsageStats] = useState<UsageStats>({
    portfolioCount: 0,
    stockCount: 0,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR'>('USD');
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };

    if (isCurrencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCurrencyDropdownOpen]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      setUserEmail(user.email || '');

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscription) {
        setSubscriptionTier(subscription.subscription_tier);
      }

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefs) {
        setPreferences({
          display_name: prefs.display_name || '',
          preferred_currency: prefs.preferred_currency || 'USD',
          date_format: prefs.date_format || 'MM/DD/YYYY',
          language: prefs.language || 'en-US',
          email_notifications: prefs.email_notifications ?? true,
        });
      }

      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id);

      const portfolioCount = portfolios?.length || 0;

      const { data: holdings } = await supabase
        .from('holdings')
        .select('stock_id', { count: 'exact' })
        .in('portfolio_id', portfolios?.map(p => p.id) || []);

      const uniqueStocks = new Set(holdings?.map(h => h.stock_id) || []);

      setUsageStats({
        portfolioCount,
        stockCount: uniqueStocks.size,
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_preferences')
          .update(preferences)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert([{ ...preferences, user_id: user.id }]);
      }

      setNotification({ type: 'success', message: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setNotification({ type: 'error', message: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_preferences')
          .update({ email_notifications: preferences.email_notifications })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert([{ email_notifications: preferences.email_notifications, user_id: user.id }]);
      }

      setNotification({ type: 'success', message: 'Notification preferences saved!' });
    } catch (error) {
      console.error('Error saving notifications:', error);
      setNotification({ type: 'error', message: 'Failed to save notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeleteLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id);

      if (portfolios && portfolios.length > 0) {
        const portfolioIds = portfolios.map(p => p.id);

        await supabase.from('holdings').delete().in('portfolio_id', portfolioIds);
        await supabase.from('transactions').delete().in('portfolio_id', portfolioIds);
        await supabase.from('dividends').delete().in('portfolio_id', portfolioIds);
        await supabase.from('portfolios').delete().in('id', portfolioIds);
      }

      setNotification({ type: 'success', message: 'All data deleted successfully!' });
      setShowDeleteDataModal(false);
      await fetchUserData();
    } catch (error) {
      console.error('Error deleting data:', error);
      setNotification({ type: 'error', message: 'Failed to delete data' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const { data: { user }, data: { session } } = await supabase.auth.getSession();
      if (!user || !session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to delete account' });
      setDeleteLoading(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
        <input
          type="email"
          value={userEmail}
          disabled
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
        <input
          type="text"
          value={preferences.display_name}
          onChange={(e) => setPreferences({ ...preferences, display_name: e.target.value })}
          placeholder="Your name"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Currency</label>
        <select
          value={preferences.preferred_currency}
          onChange={(e) => setPreferences({ ...preferences, preferred_currency: e.target.value as 'USD' | 'EUR' })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Date Format</label>
        <select
          value={preferences.date_format}
          onChange={(e) => setPreferences({ ...preferences, date_format: e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
        <select
          value={preferences.language}
          onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="pt-PT">Portuguese</option>
        </select>
      </div>

      <button
        onClick={handleSavePreferences}
        disabled={saving}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
      </button>
    </div>
  );

  const renderSubscriptionTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-2">Current Plan</h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold text-white rounded capitalize ${
            subscriptionTier === 'admin'
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : subscriptionTier === 'premium'
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
              : 'bg-gray-600'
          }`}>
            {subscriptionTier}
          </span>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">Usage Statistics</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Portfolios</span>
            <span className="text-white font-semibold">{usageStats.portfolioCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Stocks Tracked</span>
            <span className="text-white font-semibold">{usageStats.stockCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-2">Upgrade Plan</h3>
        <p className="text-gray-400 mb-4">Premium features coming soon!</p>
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
        >
          Upgrade to Premium (Coming Soon)
        </button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.email_notifications}
            onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
            className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <div className="text-white font-medium">Email Notifications</div>
            <div className="text-sm text-gray-400">Receive email updates about your portfolio and dividends</div>
          </div>
        </label>
      </div>

      <button
        onClick={handleSaveNotifications}
        disabled={saving}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
      </button>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>

        {passwordError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-400 text-sm">
            {passwordSuccess}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            <span>{saving ? 'Changing...' : 'Change Password'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderDangerTab = () => (
    <div className="space-y-6">
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-gray-400 text-sm mb-4">
              These actions are irreversible. Please proceed with caution.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <h3 className="text-white font-semibold mb-2">Delete All Data</h3>
        <p className="text-gray-400 text-sm mb-4">
          Remove all portfolios, transactions, and holdings. Your account will remain active.
        </p>
        <button
          onClick={() => setShowDeleteDataModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Delete All Data
        </button>
      </div>

      <div className="bg-gray-700 rounded-lg p-6 border border-red-500">
        <h3 className="text-white font-semibold mb-2">Delete Account</h3>
        <p className="text-gray-400 text-sm mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteAccountModal(true)}
          className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div title="Avalanex">
              <Logo1 size={48} />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative" ref={isCurrencyDropdownOpen ? currencyDropdownRef : null}>
              <button
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-blue-400 font-semibold">{selectedCurrency}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {isCurrencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setSelectedCurrency('USD');
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3 ${
                      selectedCurrency === 'USD' ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="w-8 h-6 rounded overflow-hidden flex-shrink-0 border border-gray-600">
                      <svg viewBox="0 0 60 30" className="w-full h-full">
                        <rect width="60" height="30" fill="#B22234"/>
                        <path d="M0,3.5 h60 M0,7 h60 M0,10.5 h60 M0,14 h60 M0,17.5 h60 M0,21 h60 M0,24.5 h60" stroke="#fff" strokeWidth="2.3"/>
                        <rect width="24" height="15" fill="#3C3B6E"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">USD</div>
                      <div className="text-sm text-gray-400">US Dollar</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCurrency('EUR');
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3 ${
                      selectedCurrency === 'EUR' ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="w-8 h-6 rounded bg-blue-600 flex-shrink-0 flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {[...Array(12)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-0.5 h-0.5 bg-yellow-400 rounded-full"
                              style={{
                                transform: `rotate(${i * 30}deg) translateY(-7px)`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">EUR</div>
                      <div className="text-sm text-gray-400">Euro</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onOpenWatchlist}
              className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors group"
              title="Watchlist"
            >
              <Star className="w-5 h-5 text-gray-400 group-hover:text-yellow-400" />
            </button>

            <UserMenu
              onLogout={onLogout}
            />
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h1 className="text-3xl font-bold text-white">My Account</h1>
            </div>

            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-700 p-4 space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => setActiveTab('subscription')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'subscription'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Subscription</span>
                </button>

                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'security'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span>Security</span>
                </button>

                <button
                  onClick={() => setActiveTab('danger')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'danger'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Danger Zone</span>
                </button>
              </div>

              <div className="flex-1 p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'subscription' && renderSubscriptionTab()}
                    {activeTab === 'notifications' && renderNotificationsTab()}
                    {activeTab === 'security' && renderSecurityTab()}
                    {activeTab === 'danger' && renderDangerTab()}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ConfirmationModal
        isOpen={showDeleteDataModal}
        onClose={() => setShowDeleteDataModal(false)}
        onConfirm={handleDeleteAllData}
        title="Delete All Data"
        message="Are you sure you want to delete all your portfolios, transactions, and holdings? This action cannot be undone."
        confirmText="Delete All Data"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        loading={deleteLoading}
      />

      <ConfirmationModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? All your data will be lost and this action cannot be undone."
        confirmText="Delete Account"
        confirmButtonClass="bg-red-700 hover:bg-red-800"
        loading={deleteLoading}
      />

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default MyAccount;
