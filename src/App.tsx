import React from 'react';

console.log('📱 App.tsx loading...');

function App() {
  console.log('📱 App component rendering...');
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#111827',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Portfolio Dashboard
        </h1>
        <p style={{ color: '#9CA3AF', marginBottom: '1rem' }}>
          Application loaded successfully!
        </p>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #10B981',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

console.log('📱 App.tsx loaded successfully!');

export default App;