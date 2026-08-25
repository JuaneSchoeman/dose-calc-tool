// src/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return null; // avoid a flash-redirect while the session check is in flight

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'administrator') return <Navigate to="/calculator" replace />;

  return children;
}
