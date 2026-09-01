// src/NavBar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="app-header">
      <span className="brand">Dose Calculator</span>
      <nav className="app-nav">
        {user ? (
          <>
            <NavLink to="/calculator" className={({ isActive }) => (isActive ? 'active' : '')}>
              Calculator
            </NavLink>
            <NavLink to="/converter" className={({ isActive }) => (isActive ? 'active' : '')}>
              Tools
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
              My History
            </NavLink>
            {user.role === 'administrator' && (
              <NavLink to="/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
                Usage Reports
              </NavLink>
            )}
            <span className="session-email">{user.identifierNumber}</span>
            <button type="button" className="secondary" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <NavLink to="/login">Log in</NavLink>
        )}
      </nav>
    </header>
  );
}
