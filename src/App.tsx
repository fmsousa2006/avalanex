import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Dashboard } from './components/Dashboard';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import { SignUp } from './components/SignUp';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    // Check if we're on a password reset link or confirmation link
    const hash = window.location.hash;

    if (hash && hash.includes('type=recovery')) {
      setShowResetPassword(true);
    }

    // Check for email confirmation success
    if (hash && hash.includes('type=signup')) {
      setConfirmationMessage('Email confirmed successfully! You can now log in.');
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Check current session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading...</div>
      </div>
    );
  }

  if (showResetPassword) {
    return <ResetPassword />;
  }

  if (showSignUp) {
    return <SignUp onBackToLogin={() => setShowSignUp(false)} />;
  }

  return session ? (
    <Dashboard key={session.user.id} />
  ) : (
    <Login
      onShowSignUp={() => setShowSignUp(true)}
      confirmationMessage={confirmationMessage}
      onClearMessage={() => setConfirmationMessage('')}
    />
  );
}

export default App;
