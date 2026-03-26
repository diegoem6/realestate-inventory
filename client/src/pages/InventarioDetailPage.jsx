import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import toast from 'react-hot-toast';
import FirmaModal from '../components/FirmaModal';

const InventarioDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAmbiente, setActiveAmbiente] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);
  const exportingRef = useRef(false);
  const [firmaModal, setFirmaModal] = useState(null); // 'arrendador' | 'arrendatario'
  const [savingFirma, setSavingFirma] = useState(false);

  useEffect(() => {
    api.get(`/inventarios/${id}`)
      .then(res => setInv(res.data))
      .catch(() => toast.error('Error cargando inventario'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFirmaConfirm = async (dataURL) => {
    setSavingFirma(true);
    try {
      const res = await api.post(`/inventarios/${id}/firmas`, { tipo: firmaModal, firma: dataURL });
      setInv(res.data);
      toast.success(`Firma de ${firmaModal === 'arrendador' ? 'arrendador' : 'arrendatario'} guardada`);
      setFirmaModal(null);
    } catch {
      toast.error('Error al guardar la firma');
    } finally {
      setSavingFirma(false);
    }
  };

  const handleBorrarFirma = async (tipo) => {
    if (!window.confirm(`¿Borrar la firma del ${tipo}?`)) return;
    try {
      const res = await api.delete(`/inventarios/${id}/firmas/${tipo}`);
      setInv(res.data);
      toast.success('Firma eliminada');
    } catch {
      toast.error('Error al eliminar la firma');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este inventario? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/inventarios/${id}`);
      toast.success('Inventario eliminado');
      navigate('/inventarios');
    } catch (err) { toast.error('Error al eliminar'); }
  };

  const handleExportPDF = async () => {
    // Guardia con ref para evitar doble llamada antes de que React actualice el estado
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExportingPDF(true);
    const toastId = toast.loading('Generando PDF...');
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : '';
      const response = await fetch(`${baseUrl}/api/inventarios/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Error al generar el PDF');
      }

      const blob = await response.blob();
      const filename = `inventario-${inv?.codigo || id}.pdf`;
      const blobUrl = URL.createObjectURL(blob);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && navigator.share) {
        // En móvil: usar Web Share API para compartir el archivo directamente.
        // Esto evita el problema de duplicados al compartir por WhatsApp.
        const file = new File([blob], filename, { type: 'application/pdf' });
        toast.dismiss(toastId);
        try {
          await navigator.share({ files: [file], title: filename });
        } catch (shareErr) {
          // El usuario canceló el share o el browser no soporta compartir archivos:
          // abrir en el visor como fallback.
          if (shareErr.name !== 'AbortError') {
            window.open(blobUrl, '_blank');
          }
        }
        URL.revokeObjectURL(blobUrl);
        return;
      }

      // Desktop (o móvil sin Web Share API): descarga directa
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('PDF descargado', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Error al generar el PDF', { id: toastId });
    } finally {
      exportingRef.current = false;
      setExportingPDF(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" />
    </div>
  );
  if (!inv) return (
    <div className="page-wrapper">
      <div className="alert alert-error">Inventario no encontrado</div>
    </div>
  );

  const amb = inv.ambientes?.[activeAmbiente];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{inv.direccion}</h1>
          <p className="page-subtitle">
            {inv.localidad} · Padrón {inv.padron} ·{' '}
            <span className={`badge badge-${inv.estado === 'completado' ? 'success' : 'warning'}`}>
              {inv.estado}
            </span>
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
          <Link to={`/inventarios/${id}/editar`} className="btn btn-primary">✏️ Editar</Link>
          <button
            className="btn btn-accent"
            onClick={handleExportPDF}
            disabled={exportingPDF}
          >
            {exportingPDF ? '⏳ Generando...' : '📄 PDF'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleDelete}
            style={{ color: 'var(--danger)' }}
          >
            🗑 Eliminar
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Fecha', value: new Date(inv.fecha).toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' }), icon: '📅' },
          { label: 'Código', value: inv.codigo, icon: '🏷' },
          { label: 'Llaves', value: inv.llaves, icon: '🗝' },
          { label: 'Arrendador', value: inv.arrendador, icon: '👤' },
          { label: 'Arrendatario', value: inv.arrendatario, icon: '🤝' },
          { label: 'Ambientes', value: inv.ambientes?.length || 0, icon: '🏠' },
        ].map(item => (
          <div className="card" key={item.label}>
            <div className="card-body" style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '1rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {inv.observaciones && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <label className="form-label">Observaciones</label>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{inv.observaciones}</p>
          </div>
        </div>
      )}

      {/* Ambientes */}
      {inv.ambientes?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>🏠 Ambientes</h3>
          </div>
          <div className="amb-layout" style={{ display: 'flex', minHeight: '400px' }}>
            {/* Sidebar / tabs */}
            <div className="amb-sidebar" style={{ width: '180px', borderRight: '1px solid var(--border)', padding: '0.5rem', flexShrink: 0 }}>
              {inv.ambientes.map((a, i) => (
                <button key={i} onClick={() => setActiveAmbiente(i)}
                  style={{
                    width: '100%', padding: '0.55rem 0.7rem', borderRadius: '8px',
                    border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
                    background: activeAmbiente === i ? 'var(--primary-ultra-light)' : 'transparent',
                    color: activeAmbiente === i ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeAmbiente === i ? 600 : 400,
                    marginBottom: '2px',
                  }}>
                  {a.nombre}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="amb-content" style={{ flex: 1, padding: '1.2rem' }}>
              {amb && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.2rem' }}>
                    {amb.nombre}
                  </h4>

                  {amb.tuplas?.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', marginBottom: '1.5rem' }}>
                      {amb.tuplas.map((t, i) => (
                        <div key={i} style={{ padding: '0.6rem 0.9rem', background: 'var(--bg)', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {t.campo}:
                          </span>
                          <span style={{ color: t.valor ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: t.valor ? 'normal' : 'italic', fontSize: '0.9rem' }}>
                            {t.valor || '(sin completar)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                      Sin campos registrados
                    </p>
                  )}

                  {amb.archivos?.length > 0 && (
                    <div>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.7rem' }}>
                        Fotos y archivos
                      </label>
                      <div className="photo-grid" style={{ marginBottom: '0.8rem' }}>
                        {amb.archivos.filter(a => a.tipo === 'image').map(arch => (
                          <a key={arch._id} href={resolveFileUrl(arch.url)} target="_blank" rel="noreferrer" className="photo-thumb">
                            <img src={resolveFileUrl(arch.url)} alt={arch.nombre} />
                          </a>
                        ))}
                      </div>
                      {amb.archivos.filter(a => a.tipo !== 'image').map(arch => (
                        <a key={arch._id} href={resolveFileUrl(arch.url)} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '4px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.88rem' }}>
                          📄 {arch.nombre}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Firmas */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Firmas</h3>
        </div>
        <div className="card-body firmas-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {['arrendador', 'arrendatario'].map(tipo => {
            const firmaData = inv.firmas?.[tipo];
            const label = tipo === 'arrendador' ? 'Arrendador' : 'Arrendatario';
            const nombre = tipo === 'arrendador' ? inv.arrendador : inv.arrendatario;
            return (
              <div key={tipo} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{nombre}</div>
                  </div>
                  {firmaData?.firma
                    ? <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#16a34a', borderRadius: '999px', padding: '2px 10px', fontWeight: 600 }}>Firmado</span>
                    : <span style={{ fontSize: '0.78rem', background: '#fef9c3', color: '#a16207', borderRadius: '999px', padding: '2px 10px', fontWeight: 600 }}>Pendiente</span>
                  }
                </div>

                {firmaData?.firma ? (
                  <>
                    <img
                      src={firmaData.firma}
                      alt={`Firma ${label}`}
                      style={{ width: '100%', height: '90px', objectFit: 'contain', background: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border)' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(firmaData.fechaFirma).toLocaleString('es-UY')}
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.8rem', color: 'var(--danger)', padding: '4px 10px' }}
                      onClick={() => handleBorrarFirma(tipo)}
                    >
                      Borrar firma
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => setFirmaModal(tipo)}
                    disabled={savingFirma}
                    style={{ width: '100%' }}
                  >
                    Firmar ahora
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón PDF también al pie para fácil acceso */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button
          className="btn btn-accent"
          onClick={handleExportPDF}
          disabled={exportingPDF}
          style={{ gap: '8px' }}
        >
          {exportingPDF ? '⏳ Generando PDF...' : '📄 Exportar inventario a PDF'}
        </button>
      </div>

      {firmaModal && (
        <FirmaModal
          tipo={firmaModal}
          nombre={firmaModal === 'arrendador' ? inv.arrendador : inv.arrendatario}
          onConfirm={handleFirmaConfirm}
          onClose={() => setFirmaModal(null)}
        />
      )}
    </div>
  );
};

export default InventarioDetailPage;
