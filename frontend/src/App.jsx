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
    <div style={{ maxWidth: 700, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Dose Calculator</h1>
        <div>
          <span style={{ marginRight: '1rem' }}>{user.email} ({user.role})</span>
          <button onClick={logout}>Log out</button>
        </div>
      </div>

      <nav style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => setTab('calculator')} disabled={tab === 'calculator'}>Calculator</button>
        <button onClick={() => setTab('history')} disabled={tab === 'history'} style={{ marginLeft: '0.5rem' }}>My history</button>
        {user.role === 'admin' && (
          <button onClick={() => setTab('reports')} disabled={tab === 'reports'} style={{ marginLeft: '0.5rem' }}>Reports</button>
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
