import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppearanceProvider } from './context/AppearanceContext';
import './tokens.css';
import './index.css';
import './components.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppearanceProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppearanceProvider>
    </BrowserRouter>
  </StrictMode>
);
