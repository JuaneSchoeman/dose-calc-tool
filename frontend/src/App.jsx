// src/App.jsx - top-level layout and route table.

import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './NavBar';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CalculatorPage from './pages/CalculatorPage';
import ConverterPage from './pages/ConverterPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/calculator" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/calculator"
            element={
              <ProtectedRoute>
                <CalculatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/converter"
            element={
              <ProtectedRoute>
                <ConverterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute adminOnly>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/calculator" replace />} />
        </Routes>
      </div>
      <footer className="app-footer">
        <span className="app-footer-text">ITRI671 - Dose Calculation Artefact. Not for clinical use.</span>
      </footer>
    </div>
  );
}

export default App;
