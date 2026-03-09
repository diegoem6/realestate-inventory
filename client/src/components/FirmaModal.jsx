import React, { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';

const FirmaModal = ({ tipo, nombre, onConfirm, onClose }) => {
  const canvasRef = useRef(null);
  const padRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(10, 10, 10)',
      minWidth: 1.5,
      maxWidth: 3,
    });
    padRef.current = pad;
    pad.addEventListener('endStroke', () => setIsEmpty(pad.isEmpty()));

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      pad.clear();
      setIsEmpty(true);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      pad.off();
    };
  }, []);

  const handleClear = () => {
    padRef.current.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (padRef.current.isEmpty()) return;
    onConfirm(padRef.current.toDataURL('image/png'));
  };

  const label = tipo === 'arrendador' ? 'Arrendador' : 'Arrendatario';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        .firma-modal-inner {
          background: white;
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        .firma-header {
          padding: 1rem 1.2rem 0.8rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .firma-header h2 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--primary);
          margin: 0;
        }
        .firma-header p {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin: 2px 0 0;
        }
        .firma-canvas-wrap {
          flex: 1;
          position: relative;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
        }
        .firma-hint {
          text-align: center;
          color: #d1d5db;
          font-size: 0.8rem;
          padding: 0.5rem 0 0;
          pointer-events: none;
          user-select: none;
          flex-shrink: 0;
        }
        .firma-canvas {
          flex: 1;
          width: 100%;
          touch-action: none;
          cursor: crosshair;
        }
        .firma-line {
          position: absolute;
          bottom: 56px;
          left: 10%;
          right: 10%;
          border-bottom: 1.5px dashed #d1d5db;
          pointer-events: none;
        }
        .firma-actions {
          display: flex;
          gap: 10px;
          padding: 1rem 1.2rem;
          flex-shrink: 0;
          background: white;
        }
      `}</style>

      <div className="firma-modal-inner">
        <div className="firma-header">
          <div>
            <h2>Firma — {label}</h2>
            {nombre && <p>{nombre}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
          >
            ×
          </button>
        </div>

        <div className="firma-canvas-wrap">
          <p className="firma-hint">Firmar en el recuadro de abajo</p>
          <canvas ref={canvasRef} className="firma-canvas" />
          <div className="firma-line" />
        </div>

        <div className="firma-actions">
          <button
            className="btn btn-outline"
            onClick={handleClear}
            style={{ flex: 1 }}
          >
            Limpiar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isEmpty}
            style={{ flex: 2 }}
          >
            Confirmar firma
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirmaModal;
