import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, HelpCircle, Sparkles, LogOut, Shield, Crown, Bell, RefreshCw, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserMenuProps {
  onLogout: () => void;
  onAdminClick?: () => void;
  onSyncClick?: () => void;
  onMyAccountClick?: () => void;
  isSyncing?: boolean;
  canSync?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLogout, onAdminClick, onSyncClick, onMyAccountClick, isSyncing = false, canSync = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);

        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .maybeSingle();

        if (subscription?.subscription_tier) {
          setSubscriptionTier(subscription.subscription_tier);
          setIsAdmin(subscription.subscription_tier === 'admin');
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getInitials = (email: string) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
      >
        <User className="w-5 h-5 text-gray-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-4 bg-gray-750 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full text-white font-bold text-lg">
                {getInitials(userEmail)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userEmail || 'User'}</p>
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-xs font-semibold text-white rounded mt-1 capitalize ${
                  subscriptionTier === 'admin'
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : subscriptionTier === 'premium'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gray-700'
                }`}>
                  {subscriptionTier === 'premium' && <Crown className="w-3 h-3" />}
                  {subscriptionTier === 'admin' && <Shield className="w-3 h-3" />}
                  <span>{subscriptionTier}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onMyAccountClick?.();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <UserCircle className="w-4 h-4" />
              <span>My Account</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help & Support</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <Sparkles className="w-4 h-4" />
              <span>What's New</span>
            </button>
          </div>

          {isAdmin && (
            <div className="border-t border-gray-700 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onAdminClick?.();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
              >
                <Shield className="w-4 h-4" />
                <span>Administration</span>
              </button>
              <button
                onClick={() => {
                  if (!isSyncing && canSync) {
                    setIsOpen(false);
                    onSyncClick?.();
                  }
                }}
                disabled={isSyncing || !canSync}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center space-x-3 ${
                  isSyncing || !canSync
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
                title={!canSync ? 'Market closed or no portfolio selected' : 'Sync stock prices'}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Prices</span>
              </button>
            </div>
          )}

          <div className="border-t border-gray-700">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
