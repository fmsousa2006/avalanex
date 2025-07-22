import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('🚀 Main.tsx executing...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
    throw new Error('Root element not found');
  }
  
  console.log('✅ Root element found, creating React app...');
  
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  console.log('✅ React app rendered successfully!');
} catch (error) {
  console.error('❌ Error rendering React app:', error);
  
  // Fallback rendering
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="color: white; background: #111; padding: 20px; font-family: Arial; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center;">
          <h1>React Loading Error</h1>
          <p>Error: ${error.message}</p>
          <p>Check the browser console for more details.</p>
        </div>
      </div>
    `;
  }
}