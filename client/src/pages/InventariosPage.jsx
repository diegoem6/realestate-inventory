import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

async function descargarPDF(inv) {
  const toastId = toast.loading('Generando PDF...');
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/inventarios/' + inv._id + '/pdf', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!response.ok) throw new Error('Error al generar el PDF');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario-' + (inv.codigo || inv._id) + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF descargado', { id: toastId });
  } catch (err) {
    toast.error(err.message || 'Error al generar el PDF', { id: toastId });
  }
}

const InventariosPage = () => {
  const [inventarios, setInventarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchInventarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      const res = await api.get(`/inventarios?${params}`);
      setInventarios(res.data.inventarios);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      toast.error('Error cargando inventarios');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchInventarios(); }, [fetchInventarios]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este inventario? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/inventarios/${id}`);
      toast.success('Inventario eliminado');
      fetchInventarios();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventarios</h1>
          <p className="page-subtitle">{total} inventario{total !== 1 ? 's' : ''} en total</p>
        </div>
        <div className="page-header-actions">
          <Link to="/inventarios/nuevo" className="btn btn-primary">+ Nuevo</Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <input
            className="form-control"
            placeholder="Buscar por dirección, localidad, código..."
            value={search}
            onChange={handleSearchChange}
            style={{ maxWidth: '400px' }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : inventarios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>Sin resultados</h3>
            <p>{search ? 'No hay inventarios que coincidan con tu búsqueda' : 'Aún no hay inventarios creados'}</p>
            {!search && <Link to="/inventarios/nuevo" className="btn btn-primary">Crear primer inventario</Link>}
          </div>
        ) : (
          <>
            {/* Vista tabla — desktop */}
            <div className="desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <colgroup>
                  <col /><col /><col /><col /><col /><col /><col /><col />
                  <col style={{ width: '160px' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['Fecha', 'Código', 'Dirección', 'Localidad', 'Arrendador', 'Arrendatario', 'Padrón', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventarios.map(inv => (
                    <tr key={inv._id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => navigate(`/inventarios/${inv._id}`)}
                    >
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{new Date(inv.fecha).toLocaleDateString('es-UY')}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{inv.codigo}</span></td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{inv.direccion}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{inv.localidad}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{inv.arrendador}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{inv.arrendatario}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{inv.padron}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge badge-${inv.estado === 'completado' ? 'success' : 'warning'}`}>{inv.estado}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <Link to={`/inventarios/${inv._id}`} className="btn btn-ghost btn-sm btn-icon" title="Ver">👁</Link>
                          <Link to={`/inventarios/${inv._id}/editar`} className="btn btn-ghost btn-sm btn-icon" title="Editar">✏️</Link>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Eliminar" onClick={() => handleDelete(inv._id)} style={{ color: 'var(--danger)' }}>🗑</button>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Exportar PDF" onClick={() => descargarPDF(inv)}>📄</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista cards — mobile */}
            <div className="mobile-cards">
              {inventarios.map(inv => (
                <div key={inv._id}
                  onClick={() => navigate(`/inventarios/${inv._id}`)}
                  style={{ padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', flex: 1, paddingRight: '8px' }}>{inv.direccion}</div>
                    <span className={`badge badge-${inv.estado === 'completado' ? 'success' : 'warning'}`} style={{ flexShrink: 0 }}>{inv.estado}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {inv.localidad} · Padrón {inv.padron}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {inv.arrendatario} · {new Date(inv.fecha).toLocaleDateString('es-UY')}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                    <Link to={`/inventarios/${inv._id}`} className="btn btn-ghost btn-sm">Ver</Link>
                    <Link to={`/inventarios/${inv._id}/editar`} className="btn btn-outline btn-sm">Editar</Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => descargarPDF(inv)}>PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(inv._id)} style={{ color: 'var(--danger)', marginLeft: 'auto' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InventariosPage;
