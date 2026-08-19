import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginRegister from './pages/LoginRegister';
import Calculator from './pages/Calculator';
import History from './pages/History';
import Reports from './pages/Reports';

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('calculator');

  return (
    <div className="app-shell">
      <div className="app-header">
        <div>
          <h1>Dose Calculator</h1>
          <div className="subtitle">Weight- and BSA-based dosing, calculated and shown step by step.</div>
        </div>
        <div className="session-info">
          <span>{user.email}</span>
          <span className="role-badge">{user.role}</span>
          <button className="btn-text" onClick={logout}>Log out</button>
        </div>
      </div>

      <nav className="tab-nav">
        <button onClick={() => setTab('calculator')} disabled={tab === 'calculator'}>Calculator</button>
        <button onClick={() => setTab('history')} disabled={tab === 'history'}>My history</button>
        {user.role === 'admin' && (
          <button onClick={() => setTab('reports')} disabled={tab === 'reports'}>Reports</button>
        )}
      </nav>

      {tab === 'calculator' && <Calculator />}
      {tab === 'history' && <History />}
      {tab === 'reports' && user.role === 'admin' && <Reports />}
    </div>
  );
}

function AppShell() {
  const { token, user } = useAuth();
  if (!token || !user) return <LoginRegister />;
  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
