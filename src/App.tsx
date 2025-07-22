import React from 'react';

console.log('📱 App.tsx loading...');

function App() {
  console.log('📱 App component rendering...');
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Portfolio Dashboard</h1>
        <p className="text-gray-400">Loading application...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mt-4"></div>
      </div>
    </div>
  );
}

console.log('📱 App.tsx loaded successfully!');

export default App;