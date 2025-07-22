import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Enhanced validation and logging
console.log('🔧 Initializing Supabase client...');
console.log('📍 VITE_SUPABASE_URL:', supabaseUrl || '❌ MISSING');
console.log('🔑 VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✅ SET (${supabaseAnonKey.substring(0, 20)}...)` : '❌ MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables missing!');
  console.error('');
  console.error('📋 TO FIX THIS:');
  console.error('1. Go to https://supabase.com/dashboard');
  console.error('2. Select your project');
  console.error('3. Go to Settings > API');
  console.error('4. Copy your Project URL and anon public key');
  console.error('5. Create/update .env file in project root:');
  console.error('   VITE_SUPABASE_URL=https://your-project-ref.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.error('6. Restart development server: npm run dev');
  console.error('');
}
// Test connection if credentials look valid
if (supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase.co') && supabaseAnonKey.startsWith('eyJ')) {
  console.log('✅ Supabase credentials appear valid');
  console.log('🔗 Attempting connection to:', supabaseUrl);
} else {
  console.error('❌ Invalid Supabase configuration detected');
  console.error('📋 REPLACE PLACEHOLDERS:');
  console.error('1. Go to https://supabase.com/dashboard');
// Create Supabase client with enhanced error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'portfolio-dashboard',
      'X-Client-Version': '1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
// Database types
export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  market_cap?: string;
  created_at: string;
  current_price?: number;
  price_change_24h?: number;
  price_change_percent_24h?: number;
  market_status?: string;
  last_price_update?: string;
  is_active?: boolean;
  historical_data?: any;
  last_historical_update?: string;
}

export interface PortfolioHolding {
  id: string;
  portfolio_id: string;
  stock_id: string;
  shares: number;
  average_cost: number;
  current_price: number;
  last_updated: string;
  stock?: Stock;
}

export interface Transaction {
  id: string;
  portfolio_id: string;
  stock_id: string;
  type: 'buy' | 'sell' | 'dividend';
  shares?: number;
  price?: number;
  amount: number;
  fee: number;
  currency: string;
  transaction_date: string;
  status: 'completed' | 'pending';
  created_at: string;
  stock?: Stock;
}

export interface Dividend {
  id: string;
  stock_id: string;
  amount: number;
  ex_dividend_date: string;
  payment_date: string;
  record_date?: string;
  dividend_yield?: number;
  frequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  status: 'upcoming' | 'ex-dividend' | 'paid';
  created_at: string;
  stock?: Stock;
}

// Portfolio data with calculated values
export interface PortfolioData {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  cost: number;
  change: number;
  changePercent: number;
}