import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const METODOS_PAGO = [
  { id: 'VI', label: 'Visa',       tipo: 'tarjeta' },
  { id: 'MC', label: 'Mastercard', tipo: 'tarjeta' },
  { id: 'OC', label: 'OCA',        tipo: 'tarjeta' },
  { id: 'LI', label: 'Lider',      tipo: 'tarjeta' },
  { id: 'RP', label: 'RedPagos',   tipo: 'efectivo' },
  { id: 'AI', label: 'Abitab',     tipo: 'efectivo' },
];

const TokensPage = () => {
  const [paquetes, setPaquetes] = useState([]);
  const [loadingPaquetes, setLoadingPaquetes] = useState(true);
  const [loadingPago, setLoadingPago] = useState(false);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.get('/pagos/paquetes')
      .then(res => setPaquetes(res.data))
      .catch(() => toast.error('Error cargando paquetes'))
      .finally(() => setLoadingPaquetes(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('cancelado')) toast.error('Pago cancelado');
  }, [searchParams]);

  const handlePagar = async (metodoPago) => {
    setLoadingPago(true);
    try {
      const res = await api.post('/pagos/crear-pago', {
        paqueteId: paqueteSeleccionado.id,
        metodoPago,
      });
      if (!res.data.redirectUrl) throw new Error('No se recibió URL de pago');
      window.location.href = res.data.redirectUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar el pago');
      setLoadingPago(false);
    }
  };

  const formatPrecio = (precio) =>
    new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(precio);

  const tarjetas  = METODOS_PAGO.filter(m => m.tipo === 'tarjeta');
  const efectivos = METODOS_PAGO.filter(m => m.tipo === 'efectivo');

  return (
    <div className="page-wrapper">
      <style>{`
        .tokens-header-card {
          background: var(--primary);
          color: #fff;
          border-radius: 12px;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .tokens-balance { display: flex; align-items: center; gap: 12px; }
        .tokens-balance-icon { font-size: 2.5rem; }
        .tokens-balance-info h2 { font-size: 2rem; font-family: var(--font-display); color: #fff; margin: 0; line-height: 1; }
        .tokens-balance-info p { color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 4px 0 0; }
        .tokens-balance-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.5); }
        .paquetes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }
        .paquete-card {
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: var(--surface);
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .paquete-card:hover { border-color: var(--primary); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .paquete-card.popular { border-color: var(--primary); }
        .paquete-card.seleccionado { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent); }
        .paquete-badge {
          position: absolute; top: 0; right: 0;
          background: var(--primary); color: #fff;
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 4px 10px;
          border-bottom-left-radius: 8px;
        }
        .paquete-tokens { font-size: 2.2rem; font-family: var(--font-display); color: var(--primary); line-height: 1; }
        .paquete-tokens span { font-size: 1rem; color: var(--text-secondary); font-family: var(--font-body); font-weight: 400; }
        .paquete-desc { font-size: 0.82rem; color: var(--text-secondary); min-height: 36px; }
        .paquete-precio { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); }
        .paquete-precio-unit { font-size: 0.75rem; color: var(--text-muted); }

        /* Panel de medios de pago */
        .metodos-panel {
          margin-top: 2rem;
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 1.5rem;
          background: var(--surface);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .metodos-panel h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 1rem; }
        .metodos-grupo-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem; }
        .metodos-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.25rem; }
        .metodo-btn {
          border: 2px solid var(--border);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          background: var(--bg);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          color: var(--text-primary);
        }
        .metodo-btn:hover:not(:disabled) { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
        .metodo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .metodos-panel-footer { display: flex; align-items: center; gap: 1rem; margin-top: 0.25rem; }
        .metodos-panel-footer button { background: none; border: none; color: var(--text-secondary); font-size: 0.85rem; cursor: pointer; padding: 0; }
        .metodos-panel-footer button:hover { color: var(--text-primary); }

        .info-box {
          background: var(--bg);
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-top: 2rem;
        }
        .info-box strong { color: var(--text-primary); }
        @media (max-width: 480px) {
          .tokens-header-card { padding: 1.25rem; }
          .tokens-balance-info h2 { font-size: 1.6rem; }
          .paquetes-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
          .paquete-card { padding: 1rem; }
          .paquete-tokens { font-size: 1.8rem; }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Tokens</h1>
          <p className="page-subtitle">Comprá tokens para crear inventarios</p>
        </div>
      </div>

      {/* Saldo actual */}
      <div className="tokens-header-card">
        <div className="tokens-balance">
          <div className="tokens-balance-icon">🪙</div>
          <div className="tokens-balance-info">
            <div className="tokens-balance-label">Tu saldo actual</div>
            <h2>{user?.tokens ?? 0}</h2>
            <p>{user?.tokens === 1 ? '1 inventario disponible' : `${user?.tokens ?? 0} inventarios disponibles`}</p>
          </div>
        </div>
      </div>

      {/* Paso 1: elegir paquete */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        {paqueteSeleccionado ? 'Paquete seleccionado' : 'Elegí un paquete'}
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
        Cada token te permite crear 1 inventario
      </p>

      {loadingPaquetes ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : (
        <div className="paquetes-grid">
          {paquetes.map((p) => {
            const esPopular    = p.id === 'token_5';
            const esSeleccionado = paqueteSeleccionado?.id === p.id;
            const precioPorToken = Math.round(p.precio / p.tokens);
            return (
              <div
                key={p.id}
                className={`paquete-card${esPopular ? ' popular' : ''}${esSeleccionado ? ' seleccionado' : ''}`}
                onClick={() => setPaqueteSeleccionado(p)}
              >
                {esPopular && <div className="paquete-badge">Más popular</div>}
                <div className="paquete-tokens">
                  {p.tokens} <span>token{p.tokens !== 1 ? 's' : ''}</span>
                </div>
                <div className="paquete-desc">{p.descripcion}</div>
                <div>
                  <div className="paquete-precio">{formatPrecio(p.precio)}</div>
                  <div className="paquete-precio-unit">{formatPrecio(precioPorToken)} por token</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paso 2: elegir medio de pago */}
      {paqueteSeleccionado && (
        <div className="metodos-panel">
          <h3>Pagás {formatPrecio(paqueteSeleccionado.precio)} por {paqueteSeleccionado.tokens} token{paqueteSeleccionado.tokens !== 1 ? 's' : ''} · Elegí cómo pagar</h3>

          <div className="metodos-grupo-label">Tarjeta de crédito / débito</div>
          <div className="metodos-grid">
            {tarjetas.map(m => (
              <button
                key={m.id}
                className="metodo-btn"
                onClick={() => handlePagar(m.id)}
                disabled={loadingPago}
              >
                {loadingPago ? '...' : m.label}
              </button>
            ))}
          </div>

          <div className="metodos-grupo-label">Efectivo</div>
          <div className="metodos-grid">
            {efectivos.map(m => (
              <button
                key={m.id}
                className="metodo-btn"
                onClick={() => handlePagar(m.id)}
                disabled={loadingPago}
              >
                {loadingPago ? '...' : m.label}
              </button>
            ))}
          </div>

          <div className="metodos-panel-footer">
            <button onClick={() => setPaqueteSeleccionado(null)}>← Cambiar paquete</button>
          </div>
        </div>
      )}

      <div className="info-box">
        <strong>¿Cómo funcionan los tokens?</strong><br />
        Cada vez que creás un inventario se descuenta 1 token de tu saldo.
        Los tokens no vencen y podés comprar más cuando quieras.
        El pago se procesa de forma segura a través de <strong>dLocal</strong>.
      </div>
    </div>
  );
};

export default TokensPage;
