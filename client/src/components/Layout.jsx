import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ to, icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    end={to === '/'}
  >
    <span className="nav-icon">{icon}</span>
    <span className="nav-label">{label}</span>
  </NavLink>
);

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const close = () => setSidebarOpen(false);

  return (
    <>
      <style>{`
        .app-shell { display: flex; min-height: 100vh; }
        .sidebar {
          width: 240px; background: var(--primary); color: #fff;
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; height: 100vh; z-index: 100;
          transition: transform 0.25s ease;
        }
        .sidebar-brand {
          padding: 1.4rem 1.2rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-brand h1 {
          font-family: var(--font-display);
          font-size: 1.3rem; color: #fff; line-height: 1.2;
        }
        .sidebar-brand p { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .sidebar-nav { flex: 1; padding: 1rem 0.7rem; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0.65rem 0.9rem; border-radius: 8px;
          color: rgba(255,255,255,0.7); text-decoration: none;
          font-size: 0.9rem; font-weight: 400;
          transition: all var(--transition);
          cursor: pointer; border: none; background: none; width: 100%;
        }
        .nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .nav-item.active { background: rgba(255,255,255,0.18); color: #fff; font-weight: 500; }
        .nav-icon { font-size: 1.1rem; width: 22px; text-align: center; flex-shrink: 0; }
        .nav-section { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.35); padding: 0.8rem 0.9rem 0.3rem; }
        .sidebar-user {
          padding: 1rem 1.2rem; border-top: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; gap: 10px;
        }
        .user-avatar {
          width: 36px; height: 36px; border-radius: 50%; background: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 0.95rem; color: var(--primary);
          overflow: hidden; flex-shrink: 0;
        }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .user-info { flex: 1; min-width: 0; }
        .user-name { font-size: 0.85rem; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 0.72rem; color: rgba(255,255,255,0.5); text-transform: capitalize; }
        .logout-btn { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 4px; }
        .logout-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .token-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9);
          border-radius: 20px; padding: 2px 8px; font-size: 0.75rem; font-weight: 600;
          margin-left: auto; flex-shrink: 0;
        }
        .token-badge.sin-tokens { background: rgba(239,68,68,0.25); color: #fca5a5; }
        .main-content { flex: 1; margin-left: 240px; min-height: 100vh; }
        .topbar {
          display: none; background: var(--primary); padding: 0.75rem 1rem;
          align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 50;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .topbar-brand { font-family: var(--font-display); color: #fff; font-size: 1.05rem; }
        .hamburger {
          background: none; border: none; color: #fff; font-size: 1.5rem;
          cursor: pointer; padding: 6px; border-radius: 6px;
          -webkit-tap-highlight-color: transparent;
          min-width: 40px; min-height: 40px;
          display: flex; align-items: center; justify-content: center;
        }
        .hamburger:active { background: rgba(255,255,255,0.15); }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .main-content { margin-left: 0; }
          .topbar { display: flex; }
        }
        @media (max-width: 480px) {
          .sidebar { width: 85vw; max-width: 300px; }
        }
      `}</style>

      <div className="app-shell">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={close} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <h1>Inventarios</h1>
            <p>Gestión Inmobiliaria</p>
          </div>
          <nav className="sidebar-nav">
            <NavItem to="/" icon="🏠" label="Dashboard" onClick={close} />
            <NavItem to="/inventarios" icon="📋" label="Inventarios" onClick={close} />
            {user?.rol !== 'admin' && (
              <NavLink
                to="/tokens"
                onClick={close}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">🪙</span>
                <span className="nav-label">Tokens</span>
                <span className={`token-badge${(user?.tokens ?? 0) === 0 ? ' sin-tokens' : ''}`}>
                  {user?.tokens ?? 0}
                </span>
              </NavLink>
            )}
            {user?.rol === 'admin' && (
              <>
                <div className="nav-section">Administración</div>
                <NavItem to="/templates" icon="📐" label="Templates" onClick={close} />
                <NavItem to="/usuarios" icon="👥" label="Usuarios" onClick={close} />
              </>
            )}
            <div className="nav-section">Cuenta</div>
            <NavItem to="/perfil" icon="👤" label="Mi Perfil" onClick={close} />
          </nav>
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.logo ? <img src={user.logo} alt="" /> : (user?.nombre?.[0] || 'U')}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.nombre} {user?.apellido}</div>
              <div className="user-role">{user?.rol}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">⏏</button>
          </div>
        </aside>

        <main className="main-content">
          <div className="topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <span className="topbar-brand">Inventarios</span>
            <button className="logout-btn" onClick={handleLogout}>⏏</button>
          </div>
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;
