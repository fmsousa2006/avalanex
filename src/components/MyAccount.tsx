import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Bell, Shield, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';

interface MyAccountProps {
  isOpen: boolean;
  onClose: () => void;
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

const MyAccount: React.FC<MyAccountProps> = ({ isOpen, onClose }) => {
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

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

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

      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
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

      alert('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notifications:', error);
      alert('Failed to save notification preferences');
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

      alert('All data deleted successfully!');
      setShowDeleteDataModal(false);
      await fetchUserData();
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Failed to delete data');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">My Account</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-gray-700 p-4 space-y-2 overflow-y-auto">
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

            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
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
    </>
  );
};

export default MyAccount;
