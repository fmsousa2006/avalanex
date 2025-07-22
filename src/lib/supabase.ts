import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
console.log('Initializing Supabase client...');
console.log('URL configured:', !!supabaseUrl);
console.log('Key configured:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables missing!');
  console.error('Please create a .env file in your project root with:');
  console.error('VITE_SUPABASE_URL=your_supabase_project_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('Then restart your development server.');
}

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.error('❌ Placeholder Supabase values detected!');
  console.error('Please update your .env file with real Supabase credentials.');
  console.error('Get them from: https://supabase.com/dashboard > Your Project > Settings > API');
}

// Create Supabase client with proper error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'portfolio-dashboard'
    }
  }
}
)
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