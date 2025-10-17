import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  RefreshCw,
  Database,
  Activity,
  Calendar,
  BarChart,
  Settings,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import StockManagement from './StockManagement';
import DividendCalendarAdmin from './DividendCalendarAdmin';
import UserManagement from './UserManagement';
import { supabase } from '../lib/supabase';

interface AdminProps {
  onClose: () => void;
}

const Admin: React.FC<AdminProps> = ({ onClose }) => {
  const [activeView, setActiveView] = useState<string | null>(null);
  const [stockCount, setStockCount] = useState<number>(0);
  const [apiCallsToday, setApiCallsToday] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [dataSyncStatus, setDataSyncStatus] = useState<string>('Checking...');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [upcomingDividends, setUpcomingDividends] = useState<number>(0);

  useEffect(() => {
    fetchStockCount();
    fetchApiCallsToday();
    fetchActiveUsers();
    fetchActiveSessions();
    fetchDataSyncStatus();
    fetchUpcomingDividends();
  }, []);

  const fetchStockCount = async () => {
    try {
      const { count, error } = await supabase
        .from('stocks')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setStockCount(count || 0);
    } catch (error) {
      console.error('Error fetching stock count:', error);
    }
  };

  const fetchApiCallsToday = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('api_calls')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      if (error) throw error;
      setApiCallsToday(count || 0);
    } catch (error) {
      console.error('Error fetching API calls count:', error);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const { count, error } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setActiveUsers(count || 0);
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase.rpc('get_active_sessions_count', {
        time_threshold: oneHourAgo.toISOString()
      });

      if (error) {
        console.error('RPC error, falling back to direct query:', error);
        const { data: usersData, error: queryError } = await supabase
          .from('user_subscriptions')
          .select('user_id');

        if (queryError) throw queryError;

        let activeCount = 0;
        for (const sub of (usersData || [])) {
          const { data: userData, error: authError } = await supabase.auth.admin.getUserById(sub.user_id);
          if (!authError && userData?.user?.last_sign_in_at) {
            const lastSignIn = new Date(userData.user.last_sign_in_at);
            if (lastSignIn > oneHourAgo) {
              activeCount++;
            }
          }
        }
        setActiveSessions(activeCount);
        return;
      }

      setActiveSessions(data || 0);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      setActiveSessions(0);
    }
  };

  const fetchDataSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('api_calls')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const lastSync = new Date(data.created_at);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / 60000);

        if (diffMinutes < 5) {
          setDataSyncStatus('Live');
          setLastSyncTime(`${diffMinutes} min ago`);
        } else if (diffMinutes < 60) {
          setDataSyncStatus('Recent');
          setLastSyncTime(`${diffMinutes} min ago`);
        } else {
          const diffHours = Math.floor(diffMinutes / 60);
          setDataSyncStatus('Delayed');
          setLastSyncTime(`${diffHours}h ago`);
        }
      } else {
        setDataSyncStatus('Unknown');
        setLastSyncTime('No data');
      }
    } catch (error) {
      console.error('Error fetching data sync status:', error);
      setDataSyncStatus('Error');
    }
  };

  const fetchUpcomingDividends = async () => {
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { count, error } = await supabase
        .from('dividends')
        .select('*', { count: 'exact', head: true })
        .gte('payment_date', today.toISOString())
        .lte('payment_date', nextMonth.toISOString());

      if (error) throw error;
      setUpcomingDividends(count || 0);
    } catch (error) {
      console.error('Error fetching upcoming dividends:', error);
    }
  };

  if (activeView === 'stock-management') {
    return <StockManagement onBack={() => setActiveView(null)} />;
  }

  if (activeView === 'dividend-calendar') {
    return <DividendCalendarAdmin onBack={() => setActiveView(null)} />;
  }

  if (activeView === 'user-management') {
    return <UserManagement onBack={() => setActiveView(null)} />;
  }

  const adminPanels = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage user accounts, permissions, and access control',
      stats: `${activeUsers} Active User${activeUsers !== 1 ? 's' : ''}`,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400'
    },
    {
      icon: TrendingUp,
      title: 'Stock Management',
      description: 'Add, edit, or remove stocks and manage dividend schedules',
      stats: `${stockCount} Stock${stockCount !== 1 ? 's' : ''} Tracked`,
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400'
    },
    {
      icon: RefreshCw,
      title: 'Price Sync Control',
      description: 'Monitor API usage, trigger manual updates, and view sync logs',
      stats: lastSyncTime ? `Last sync: ${lastSyncTime}` : 'Last sync: checking...',
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400'
    },
    {
      icon: Database,
      title: 'Database Maintenance',
      description: 'Clean old data, manage backups, and view table statistics',
      stats: '2.3 GB Storage Used',
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400'
    },
    {
      icon: Activity,
      title: 'System Health',
      description: 'Monitor API status, database connections, and error logs',
      stats: 'All Systems Operational',
      color: 'from-green-500 to-green-600',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400'
    },
    {
      icon: Calendar,
      title: 'Dividend Calendar Admin',
      description: 'Manage dividend payment dates and ex-dividend schedules',
      stats: `${upcomingDividends} Upcoming Payment${upcomingDividends !== 1 ? 's' : ''}`,
      color: 'from-cyan-500 to-cyan-600',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400'
    },
    {
      icon: BarChart,
      title: 'Reports & Analytics',
      description: 'View user activity, stock performance, and system metrics',
      stats: '15 Reports Available',
      color: 'from-pink-500 to-pink-600',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400'
    },
    {
      icon: Settings,
      title: 'System Settings',
      description: 'Configure API keys, system defaults, and notifications',
      stats: '23 Configuration Items',
      color: 'from-slate-500 to-slate-600',
      iconBg: 'bg-slate-500/20',
      iconColor: 'text-slate-400'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Administration</h1>
              <p className="text-gray-400 text-lg">Manage your portfolio system and configuration</p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Users</p>
                <p className="text-xl font-bold">{activeUsers}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">API Calls Today</p>
                <p className="text-xl font-bold">{apiCallsToday.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Sessions</p>
                <p className="text-xl font-bold">{activeSessions}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1">Data Sync Status</p>
                <p className="text-xl font-bold">{dataSyncStatus}</p>
                {lastSyncTime && (
                  <p className="text-xs text-gray-500 mt-1">{lastSyncTime}</p>
                )}
              </div>
              <RefreshCw className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {adminPanels.map((panel, index) => (
            <div
              key={index}
              onClick={() => {
                if (panel.title === 'Stock Management') {
                  setActiveView('stock-management');
                } else if (panel.title === 'Dividend Calendar Admin') {
                  setActiveView('dividend-calendar');
                } else if (panel.title === 'User Management') {
                  setActiveView('user-management');
                }
              }}
              className="group bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-gray-900/50 cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${panel.iconBg} p-3 rounded-lg`}>
                    <panel.icon className={`w-7 h-7 ${panel.iconColor}`} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                  {panel.title}
                </h3>

                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {panel.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <span className="text-sm font-medium text-gray-500">
                    {panel.stats}
                  </span>
                  <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${panel.color} group-hover:scale-150 transition-transform`} />
                </div>
              </div>

              <div className={`h-1 bg-gradient-to-r ${panel.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
            </div>
          ))}
        </div>

        <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-start space-x-4">
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  Backup Database
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  Clear Cache
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  Export Logs
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  Run Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
