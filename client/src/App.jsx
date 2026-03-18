import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventariosPage from './pages/InventariosPage';
import InventarioFormPage from './pages/InventarioFormPage';
import InventarioDetailPage from './pages/InventarioDetailPage';
import TemplatesPage from './pages/TemplatesPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import TokensPage from './pages/TokensPage';
import TokensSuccessPage from './pages/TokensSuccessPage';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="inventarios" element={<InventariosPage />} />
          <Route path="inventarios/nuevo" element={<InventarioFormPage />} />
          <Route path="inventarios/:id/editar" element={<InventarioFormPage />} />
          <Route path="inventarios/:id" element={<InventarioDetailPage />} />
          <Route path="templates" element={<ProtectedRoute adminOnly><TemplatesPage /></ProtectedRoute>} />
          <Route path="usuarios" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="tokens/exito" element={<TokensSuccessPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
