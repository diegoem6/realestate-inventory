import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const TokensSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const status    = searchParams.get('status');
  const [estado, setEstado] = useState('verificando'); // 'verificando' | 'ok' | 'pendiente' | 'error'
  const [tokensActuales, setTokensActuales] = useState(null);
  const { updateUser, user } = useAuth();

  useEffect(() => {
    if (status === 'PENDING' || status === 'pending') {
      setEstado('pendiente');
      return;
    }
    if (!paymentId) {
      setEstado('error');
      return;
    }
    api.get(`/pagos/verificar-pago/${paymentId}`)
      .then(res => {
        setTokensActuales(res.data.tokens);
        updateUser({ ...user, tokens: res.data.tokens });
        setEstado(res.data.status === 'PAID' ? 'ok' : 'pendiente');
      })
      .catch(() => setEstado('error'));
  }, [paymentId, status]); // eslint-disable-line

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '2rem' }}>

        {estado === 'verificando' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Verificando tu pago...</p>
          </>
        )}

        {estado === 'ok' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              ¡Pago exitoso!
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Tus tokens fueron acreditados. Ahora tenés{' '}
              <strong style={{ color: 'var(--primary)' }}>
                {tokensActuales ?? user?.tokens ?? '–'} token{tokensActuales !== 1 ? 's' : ''}
              </strong>{' '}
              disponibles.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/inventarios/nuevo" className="btn btn-primary">Crear inventario</Link>
              <Link to="/tokens" className="btn btn-outline">Ver mis tokens</Link>
            </div>
          </>
        )}

        {estado === 'pendiente' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              Pago en proceso
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Tu pago está siendo procesado. Los tokens se acreditarán automáticamente cuando se confirme.
              Si pagaste en efectivo, recordá abonar el cupón en la sucursal.
            </p>
            <Link to="/tokens" className="btn btn-outline">Ver mis tokens</Link>
          </>
        )}

        {estado === 'error' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              No se pudo verificar el pago
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Si el pago fue aprobado, los tokens se acreditarán automáticamente en breve.
              Revisá tu saldo en unos minutos.
            </p>
            <Link to="/tokens" className="btn btn-outline">Ir a Tokens</Link>
          </>
        )}

      </div>
    </div>
  );
};

export default TokensSuccessPage;
