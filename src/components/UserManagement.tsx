import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  Shield,
  TrendingUp,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Crown,
  ArrowLeft,
  RefreshCw,
  UserPlus,
  Ban,
  Unlock,
  Trash2,
  Eye,
  Clock,
  Bell,
  FileText,
  LogOut,
  ListFilter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserManagementProps {
  onBack: () => void;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  tier: string;
  status: string;
  account_status: string;
  portfolio_count: number;
  total_portfolio_value?: number;
  total_dividend_income?: number;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    newUsersThisMonth: 0,
    avgPortfolioValue: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_all_users_with_details');

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: premiumUsers } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'premium')
        .eq('subscription_status', 'active');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentSignIns } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsersThisMonth } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: recentSignIns?.length || 0,
        premiumUsers: premiumUsers || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        avgPortfolioValue: 45230,
        totalRevenue: (premiumUsers || 0) * 9.99
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || user.tier === filterTier;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const formatFullTimestamp = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'premium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'trial':
        return 'text-blue-400';
      case 'cancelled':
        return 'text-orange-400';
      case 'expired':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleChangeSubscription = (user: User) => {
    setOpenDropdown(null);
    console.log('Change subscription for:', user.email);
  };

  const handleSuspendAccount = async (user: User) => {
    setOpenDropdown(null);
    console.log('Suspend account:', user.email);
  };

  const handleActivateAccount = async (user: User) => {
    setOpenDropdown(null);
    console.log('Activate account:', user.email);
  };

  const handleDeleteAccount = (user: User) => {
    setOpenDropdown(null);
    console.log('Delete account:', user.email);
  };

  const handleSendNotification = (user: User) => {
    setOpenDropdown(null);
    console.log('Send notification to:', user.email);
  };

  const handleAddNote = (user: User) => {
    setOpenDropdown(null);
    console.log('Add note for:', user.email);
  };

  const handleForceLogout = async (user: User) => {
    setOpenDropdown(null);
    console.log('Force logout:', user.email);
  };

  const handleViewActivityLogs = (user: User) => {
    setOpenDropdown(null);
    console.log('View activity logs for:', user.email);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-xl text-gray-400">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Admin</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center space-x-3">
                <Users className="w-10 h-10 text-blue-400" />
                <span>User Management</span>
              </h1>
              <p className="text-gray-400 text-lg">Manage user accounts, subscriptions, and access control</p>
            </div>
            <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/20">
              <UserPlus className="w-5 h-5" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalUsers}</div>
            <div className="text-sm text-gray-400">Registered Users</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-8 h-8 text-green-400" />
              <div className="text-xs text-gray-400">Active</div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.activeUsers}</div>
            <div className="text-sm text-gray-400">Last 30 days</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <Crown className="w-8 h-8 text-yellow-400" />
              <div className="text-xs text-gray-400">Premium</div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.premiumUsers}</div>
            <div className="text-sm text-gray-400">Subscribers</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <div className="text-xs text-gray-400">New</div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.newUsersThisMonth}</div>
            <div className="text-sm text-gray-400">This month</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 text-emerald-400" />
              <div className="text-xs text-gray-400">Avg Value</div>
            </div>
            <div className="text-3xl font-bold mb-1">${(stats.avgPortfolioValue / 1000).toFixed(0)}k</div>
            <div className="text-sm text-gray-400">Portfolio</div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 text-cyan-400" />
              <div className="text-xs text-gray-400">MRR</div>
            </div>
            <div className="text-3xl font-bold mb-1">${stats.totalRevenue.toFixed(0)}</div>
            <div className="text-sm text-gray-400">Monthly</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>

            <button
              onClick={fetchUsers}
              className="flex items-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Subscription Tier</label>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">User</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Tier</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Portfolios</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Last Active</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">Joined</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.email}</div>
                          <div className="text-xs text-gray-500">{user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${getTierBadgeColor(user.tier)}`}>
                        {user.tier === 'premium' && <Crown className="w-3 h-3" />}
                        <span className="capitalize">{user.tier}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {user.status === 'active' && <CheckCircle2 className={`w-4 h-4 ${getStatusColor(user.status)}`} />}
                        {user.status === 'trial' && <Clock className={`w-4 h-4 ${getStatusColor(user.status)}`} />}
                        {user.status === 'cancelled' && <AlertCircle className={`w-4 h-4 ${getStatusColor(user.status)}`} />}
                        {user.status === 'expired' && <XCircle className={`w-4 h-4 ${getStatusColor(user.status)}`} />}
                        <span className={`text-sm capitalize ${getStatusColor(user.status)}`}>{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{user.portfolio_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-sm text-gray-400 cursor-help"
                        title={formatFullTimestamp(user.last_sign_in_at)}
                      >
                        {formatDate(user.last_sign_in_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                        <div className="relative" ref={openDropdown === user.id ? dropdownRef : null}>
                          <button
                            onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400 hover:text-white" />
                          </button>

                          {openDropdown === user.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                              <button
                                onClick={() => handleChangeSubscription(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                              >
                                <Crown className="w-4 h-4 text-yellow-400" />
                                <span>Change Subscription</span>
                              </button>

                              {user.account_status === 'active' ? (
                                <button
                                  onClick={() => handleSuspendAccount(user)}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                                >
                                  <Ban className="w-4 h-4 text-orange-400" />
                                  <span>Suspend Account</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateAccount(user)}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                                >
                                  <Unlock className="w-4 h-4 text-green-400" />
                                  <span>Activate Account</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteAccount(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                                <span>Delete Account</span>
                              </button>

                              <div className="border-t border-gray-700 my-1"></div>

                              <button
                                onClick={() => handleSendNotification(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                              >
                                <Bell className="w-4 h-4 text-blue-400" />
                                <span>Send Notification</span>
                              </button>

                              <button
                                onClick={() => handleAddNote(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                              >
                                <FileText className="w-4 h-4 text-purple-400" />
                                <span>Add Note</span>
                              </button>

                              <div className="border-t border-gray-700 my-1"></div>

                              <button
                                onClick={() => handleForceLogout(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                              >
                                <LogOut className="w-4 h-4 text-orange-400" />
                                <span>Force Logout</span>
                              </button>

                              <button
                                onClick={() => handleViewActivityLogs(user)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-3"
                              >
                                <ListFilter className="w-4 h-4 text-cyan-400" />
                                <span>Activity Logs</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium text-lg">No users found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">User Details</h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                    {selectedUser.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">{selectedUser.email}</h3>
                    <p className="text-sm text-gray-400">User ID: {selectedUser.id}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getTierBadgeColor(selectedUser.tier)}`}>
                    {selectedUser.tier === 'premium' && <Crown className="w-4 h-4 inline mr-1" />}
                    {selectedUser.tier.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Account Status</div>
                    <div className={`text-lg font-semibold capitalize ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Portfolios</div>
                    <div className="text-lg font-semibold text-white">{selectedUser.portfolio_count}</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Member Since</div>
                    <div className="text-lg font-semibold text-white">{formatDate(selectedUser.created_at)}</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Last Active</div>
                    <div className="text-lg font-semibold text-white">{formatDate(selectedUser.last_sign_in_at)}</div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                      <Mail className="w-5 h-5" />
                      <span>Send Email</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors">
                      <Crown className="w-5 h-5" />
                      <span>Upgrade Tier</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors">
                      <Ban className="w-5 h-5" />
                      <span>Suspend</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
