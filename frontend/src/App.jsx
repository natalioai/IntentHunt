import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SetupWizard from './pages/SetupWizard';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children }) {
  const { client } = useAuth();
  if (!client) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [client, setClient] = useState(() => {
    try {
      const stored = localStorage.getItem('intenthunt_client');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loginClient = (clientData) => {
    localStorage.setItem('intenthunt_client', JSON.stringify(clientData));
    setClient(clientData);
  };

  const logout = () => {
    localStorage.removeItem('intenthunt_client');
    setClient(null);
  };

  return (
    <AuthContext.Provider value={{ client, loginClient, logout }}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <SetupWizard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
