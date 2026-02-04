import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Removed manual process.env polyfill to comply with Gemini API coding guidelines.
// The API key must be obtained exclusively from the pre-configured environment variable process.env.API_KEY.

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}