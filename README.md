# Avalanex - Portfolio Management Dashboard

A modern stock portfolio management application built with React, TypeScript, and Supabase.

## 🚀 Quick Setup

### 1. Environment Configuration

Create a `.env` file in the project root and configure your API credentials:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Finnhub API Configuration  
VITE_FINNHUB_API_KEY=your-finnhub-api-key-here
```

### 2. Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings > API**
4. Copy your **Project URL** and **anon public** key
5. Replace the placeholder values in `.env`

### 3. Get Finnhub API Key

1. Register at [Finnhub.io](https://finnhub.io/register)
2. Get your free API key from the dashboard
3. Add it to your `.env` file

### 4. Database Setup

Run the database migrations in your Supabase SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and run the migration from `supabase/migrations/create_historical_price_tables.sql`

### 5. Start Development Server

```bash
npm install
npm run dev
```

## 🔧 Troubleshooting

### NetworkError when fetching data

This error occurs when Supabase is not properly configured:

1. **Check your `.env` file** - Make sure it exists in the project root
2. **Verify credentials** - Ensure URL and key are correct (no placeholder values)
3. **Restart dev server** - Run `npm run dev` after updating `.env`
4. **Check Supabase project** - Ensure it's not paused or deleted

### App shows "offline mode"

The app will work with mock data if Supabase isn't configured. To enable live data:

1. Complete the Supabase setup above
2. Restart your development server
3. Check browser console for connection status

## 📊 Features

- **Portfolio Management** - Track multiple portfolios
- **Real-time Stock Prices** - Live data from Finnhub API
- **Historical Charts** - Multiple timeframes (1D to 5Y)
- **Dividend Tracking** - Monitor dividend payments
- **Transaction History** - Complete trade records
- **Performance Analytics** - Gain/loss calculations

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Lucide React
- **API**: Finnhub for stock data