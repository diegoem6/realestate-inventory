import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 60%, #3d7a58 100%);
        }
        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3rem;
          color: white;
        }
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          flex: 1;
        }
        .login-card {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
          box-shadow: var(--shadow-lg);
        }
        .login-logo {
          width: 56px; height: 56px;
          background: var(--primary-ultra-light);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; margin-bottom: 1.5rem;
        }
        .login-card h2 {
          font-family: var(--font-display);
          font-size: 1.7rem;
          color: var(--primary);
          margin-bottom: 0.3rem;
        }
        .login-card p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .login-form { display: flex; flex-direction: column; gap: 1rem; }
        .brand-title { font-family: var(--font-display); font-size: 2.5rem; color: white; line-height: 1.2; }
        .brand-subtitle { color: rgba(255,255,255,0.7); font-size: 1rem; margin-top: 0.5rem; max-width: 320px; text-align: center; }
        .brand-icon { font-size: 4rem; margin-bottom: 1rem; }
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); }
        }
      `}</style>
      <div className="login-page">
        <div className="login-left">
          <div className="brand-icon">🏢</div>
          <div className="brand-title">Gestión de<br/>Inventarios</div>
          <p className="brand-subtitle">Plataforma profesional para el registro y gestión de inventarios de propiedades inmobiliarias</p>
        </div>
        <div className="login-right">
          <div className="login-card">
            <div className="login-logo">🔐</div>
            <h2>Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para continuar</p>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Usuario o Email</label>
                <input className="form-control" placeholder="usuario o email" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoFocus autoCorrect="off" autoCapitalize="off" spellCheck="false" />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-control" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required autoCorrect="off" autoCapitalize="off" />
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
                {loading ? '⏳ Ingresando...' : 'Ingresar →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
