import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Planning from './pages/Planning';
import Categories from './pages/Categories';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';

// Guard: redirect to /onboarding if not logged in
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32 }}>טוען...</div>;
  if (!user) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-family)',
            direction: 'rtl',
            borderRadius: 'var(--border-radius-sm)',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
