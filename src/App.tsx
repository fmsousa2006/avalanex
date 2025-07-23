import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Dashboard } from './components/Dashboard';
import { usePortfolio } from './hooks/usePortfolio';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const portfolioData = usePortfolio();

  useEffect(() => {
    // Check if user is already signed in
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
        } else {
          // Sign in anonymously to create a user session
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('Error signing in anonymously:', error);
          } else {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading || portfolioData.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  if (portfolioData.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Portfolio</h2>
          <p className="text-gray-600">{portfolioData.error}</p>
        </div>
      </div>
    );
  }

  return <Dashboard {...portfolioData} />;
}

export default App;