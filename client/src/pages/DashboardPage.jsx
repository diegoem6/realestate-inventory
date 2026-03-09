import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const StatCard = ({ icon, label, value, color }) => (
  <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: '700', color, fontFamily: 'var(--font-display)' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, borradores: 0, completados: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/inventarios?limit=5');
        const { inventarios, total } = res.data;
        setRecent(inventarios);
        setStats({
          total,
          borradores: inventarios.filter(i => i.estado === 'borrador').length,
          completados: inventarios.filter(i => i.estado === 'completado').length,
        });
      } catch (err) {} finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bienvenido, {user?.nombre} 👋</h1>
          <p className="page-subtitle">Panel de control · {new Date().toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="page-header-actions">
          <Link to="/inventarios/nuevo" className="btn btn-primary">+ Nuevo Inventario</Link>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <StatCard icon="📋" label="Total de inventarios" value={stats.total} color="var(--primary)" />
        <StatCard icon="✏️" label="En borrador" value={stats.borradores} color="var(--accent)" />
        <StatCard icon="✅" label="Completados" value={stats.completados} color="#27ae60" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Inventarios Recientes</h3>
          <Link to="/inventarios" className="btn btn-ghost btn-sm">Ver todos →</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>Sin inventarios</h3>
              <p>Crea tu primer inventario para empezar</p>
              <Link to="/inventarios/nuevo" className="btn btn-primary">Crear inventario</Link>
            </div>
          ) : (
            <>
              {/* Vista tabla — desktop */}
              <table className="desktop-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Dirección', 'Localidad', 'Arrendatario', 'Fecha', 'Estado', ''].map(h => (
                      <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(inv => (
                    <tr key={inv._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 500 }}>{inv.direccion}</td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{inv.localidad}</td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{inv.arrendatario}</td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(inv.fecha).toLocaleDateString('es-UY')}</td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <span className={`badge badge-${inv.estado === 'completado' ? 'success' : 'warning'}`}>{inv.estado}</span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <Link to={`/inventarios/${inv._id}`} className="btn btn-ghost btn-sm">Ver →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Vista cards — mobile */}
              <div className="mobile-cards">
                {recent.map(inv => (
                  <Link key={inv._id} to={`/inventarios/${inv._id}`}
                    style={{ display: 'block', padding: '1rem', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', flex: 1, paddingRight: '8px' }}>{inv.direccion}</div>
                      <span className={`badge badge-${inv.estado === 'completado' ? 'success' : 'warning'}`} style={{ flexShrink: 0 }}>{inv.estado}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {inv.localidad} · {inv.arrendatario}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(inv.fecha).toLocaleDateString('es-UY')}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
