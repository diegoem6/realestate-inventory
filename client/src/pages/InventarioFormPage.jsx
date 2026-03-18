import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// ── Fuera del componente para evitar pérdida de foco en cada render ──────────
const InputField = ({ label, name, type = 'text', required, value, onChange, ...props }) => (
  <div className="form-group">
    <label className="form-label">{label}{required && ' *'}</label>
    <input
      type={type}
      className="form-control"
      value={value ?? ''}
      onChange={e => onChange(name, e.target.value)}
      required={required}
      {...props}
    />
  </div>
);

// ── Estilos responsive ────────────────────────────────────────────────────────
const styles = `
  /* Layout dos-columnas: lista + editor (desktop) */
  .amb-layout {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }
  .amb-sidebar {
    width: 200px;
    flex-shrink: 0;
  }
  .amb-editor {
    flex: 1;
    min-width: 0;
  }

  /* En mobile: stack vertical, el editor ocupa todo el ancho */
  @media (max-width: 640px) {
    .amb-layout {
      flex-direction: column;
    }
    .amb-sidebar {
      width: 100%;
    }
    /* Cuando hay un ambiente activo en mobile, ocultar la lista y mostrar solo el editor */
    .amb-layout.has-active .amb-sidebar {
      display: none;
    }
    .amb-layout.has-active .amb-editor {
      width: 100%;
    }
    /* Cuando no hay ambiente activo, ocultar el editor */
    .amb-layout:not(.has-active) .amb-editor {
      display: none;
    }
  }

  /* Tarjetas de ambiente en la lista (mobile-friendly) */
  .amb-list-item {
    width: 100%;
    padding: 0.7rem 0.9rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
    font-family: var(--font-body);
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.15s ease;
    margin-bottom: 2px;
  }
  .amb-list-item:active {
    transform: scale(0.98);
  }

  /* Botón "volver a lista" solo en mobile */
  .amb-back-btn {
    display: none;
  }
  @media (max-width: 640px) {
    .amb-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 0.75rem;
    }
  }

  /* Fila de tuplas: en mobile apilar campo encima de valor */
  .tupla-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tupla-campo-label {
    flex: 0 0 38%;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #4a5568);
    padding: 0.45rem 0.75rem;
    background: var(--bg, #f7f9f7);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 8px;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tupla-campo-label em {
    color: var(--text-muted, #a0aec0);
    font-style: italic;
    font-weight: 400;
  }
  @media (max-width: 480px) {
    .tupla-row {
      flex-wrap: wrap;
    }
    .tupla-row .tupla-campo-label {
      flex: 0 0 100% !important;
    }
    .tupla-row .tupla-valor {
      flex: 1;
    }
  }

  /* Modal overlay IA */
  .ai-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 1rem;
  }
  .ai-modal {
    background: var(--surface, #fff);
    border-radius: 16px;
    padding: 1.5rem;
    width: 100%; max-width: 520px;
    max-height: 85vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .ai-modal h3 {
    margin: 0 0 0.25rem;
    color: var(--primary, #1a3a2a);
    font-size: 1.1rem;
  }
  .ai-modal .ai-subtitle {
    color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;
  }
  .ai-suggestion-row {
    display: flex; gap: 8px; align-items: center;
    padding: 6px 10px; border-radius: 8px;
    background: var(--bg, #f7f9f7);
    margin-bottom: 6px; font-size: 0.88rem;
  }
  .ai-suggestion-row .sug-campo {
    flex: 0 0 42%; font-weight: 600; color: var(--text-secondary, #4a5568);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ai-suggestion-row .sug-valor {
    flex: 1; color: var(--text, #1a1f1c);
  }
  .ai-modal-actions {
    display: flex; gap: 8px; justify-content: flex-end; margin-top: 1.2rem;
    flex-wrap: wrap;
  }
  .btn-ai {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff; border: none; border-radius: 8px;
    padding: 0.45rem 1rem; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
    transition: opacity 0.15s;
  }
  .btn-ai:hover { opacity: 0.88; }
  .btn-ai:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─────────────────────────────────────────────────────────────────────────────

const InventarioFormPage = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    direccion: '', padron: '', localidad: '', arrendador: '',
    arrendatario: '', codigo: '', llaves: '', observaciones: '', estado: 'borrador',
  });
  const [ambientes, setAmbientes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('datos');
  const [showAddAmbiente, setShowAddAmbiente] = useState(false);
  const [newAmbienteName, setNewAmbienteName] = useState('');
  // null = mostrando lista; número = editando ese ambiente
  const [activeAmbiente, setActiveAmbiente] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiPreview, setAiPreview]     = useState(null); // { ambienteId, campos[] }

  useEffect(() => {
    api.get('/templates').then(res => setTemplates(res.data));
    if (isEdit) {
      setLoading(true);
      api.get(`/inventarios/${id}`)
        .then(res => {
          const inv = res.data;
          setForm({
            fecha: new Date(inv.fecha).toISOString().split('T')[0],
            direccion: inv.direccion,
            padron: inv.padron,
            localidad: inv.localidad,
            arrendador: inv.arrendador,
            arrendatario: inv.arrendatario,
            codigo: inv.codigo,
            llaves: inv.llaves,
            observaciones: inv.observaciones || '',
            estado: inv.estado,
          });
          setAmbientes(inv.ambientes || []);
        })
        .catch(() => toast.error('Error cargando inventario'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/inventarios/${id}`, { ...form, ambientes });
        toast.success('Inventario actualizado');
        navigate(`/inventarios/${id}`);
      } else {
        const res = await api.post('/inventarios', form);
        if (res.data.tokensRestantes !== null && res.data.tokensRestantes !== undefined) {
          updateUser({ ...user, tokens: res.data.tokensRestantes });
        }
        toast.success('Inventario creado');
        navigate(`/inventarios/${res.data._id}/editar`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveAmbientes = async () => {
    if (!isEdit) return;
    setSaving(true);
    try {
      await api.put(`/inventarios/${id}`, { ambientes });
      toast.success('Ambientes guardados');
    } catch (err) {
      toast.error('Error al guardar ambientes');
    } finally {
      setSaving(false);
    }
  };

  const addAmbienteFromTemplate = async (templateId) => {
    if (!isEdit) { toast('Guardá primero los datos del inventario'); return; }
    try {
      const res = await api.post(`/inventarios/${id}/ambientes`, { templateId });
      setAmbientes(res.data.ambientes);
      setShowAddAmbiente(false);
      // Auto-seleccionar el nuevo ambiente (el último)
      setActiveAmbiente(res.data.ambientes.length - 1);
    } catch (err) { toast.error('Error al agregar ambiente'); }
  };

  const addAmbienteBlank = async () => {
    if (!newAmbienteName.trim()) return;
    if (!isEdit) { toast('Guardá primero los datos del inventario'); return; }
    try {
      const res = await api.post(`/inventarios/${id}/ambientes`, { nombre: newAmbienteName });
      setAmbientes(res.data.ambientes);
      setShowAddAmbiente(false);
      setNewAmbienteName('');
      setActiveAmbiente(res.data.ambientes.length - 1);
    } catch (err) { toast.error('Error al agregar ambiente'); }
  };

  const updateAmbiente = (ambIdx, field, value) => {
    setAmbientes(prev => prev.map((a, i) => i === ambIdx ? { ...a, [field]: value } : a));
  };

  const updateTupla = (ambIdx, tupIdx, field, value) => {
    setAmbientes(prev => prev.map((a, ai) => {
      if (ai !== ambIdx) return a;
      return { ...a, tuplas: a.tuplas.map((t, ti) => ti === tupIdx ? { ...t, [field]: value } : t) };
    }));
  };

  const addTupla = (ambIdx) => {
    setAmbientes(prev => prev.map((a, i) =>
      i === ambIdx ? { ...a, tuplas: [...a.tuplas, { campo: '', valor: '' }] } : a
    ));
  };

  const removeTupla = (ambIdx, tupIdx) => {
    setAmbientes(prev => prev.map((a, ai) =>
      ai !== ambIdx ? a : { ...a, tuplas: a.tuplas.filter((_, ti) => ti !== tupIdx) }
    ));
  };

  const removeAmbiente = (ambIdx) => {
    if (!window.confirm('¿Eliminar este ambiente?')) return;
    setAmbientes(prev => prev.filter((_, i) => i !== ambIdx));
    setActiveAmbiente(null);
  };

  const handleFileUpload = async (ambienteId, files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('archivos', f));
    setUploadingFiles(p => ({ ...p, [ambienteId]: true }));
    try {
      const res = await api.post(
        `/inventarios/${id}/ambientes/${ambienteId}/archivos`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setAmbientes(res.data.ambientes);
      toast.success(`${files.length} archivo(s) subido(s)`);
    } catch (err) {
      toast.error('Error subiendo archivos');
    } finally {
      setUploadingFiles(p => ({ ...p, [ambienteId]: false }));
    }
  };

  const handleDeleteFile = async (ambienteId, archivoId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      const res = await api.delete(`/inventarios/${id}/ambientes/${ambienteId}/archivos/${archivoId}`);
      setAmbientes(res.data.ambientes);
    } catch (err) { toast.error('Error al eliminar archivo'); }
  };

  // ── Analizar fotos con IA ──────────────────────────────────────────────────
  const analyzeWithAI = async (ambienteId) => {
    setAiAnalyzing(true);
    setAiPreview(null);
    try {
      const res = await api.post(`/inventarios/${id}/ambientes/${ambienteId}/analizar-ia`);
      setAiPreview({ ambienteId, campos: res.data.campos });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al analizar con IA');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Aplicar sugerencias de IA: reemplaza valores en campos existentes y agrega los nuevos
  const applyAiSuggestions = (ambIdx, sugerencias) => {
    setAmbientes(prev => prev.map((a, i) => {
      if (i !== ambIdx) return a;
      // Para cada sugerencia: si el campo existe, actualizar su valor; si no, agregar
      const tuplasActualizadas = [...a.tuplas];
      for (const sug of sugerencias) {
        const idx = tuplasActualizadas.findIndex(
          t => t.campo.toLowerCase().trim() === sug.campo.toLowerCase().trim()
        );
        if (idx >= 0) {
          tuplasActualizadas[idx] = { ...tuplasActualizadas[idx], valor: sug.valor };
        } else {
          tuplasActualizadas.push({ campo: sug.campo, valor: sug.valor });
        }
      }
      return { ...a, tuplas: tuplasActualizadas };
    }));
    setAiPreview(null);
    toast.success('Sugerencias de IA aplicadas');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" />
    </div>
  );

  const ambienteActual = activeAmbiente !== null ? ambientes[activeAmbiente] : null;

  return (
    <>
      <style>{styles}</style>

      {/* ── Modal preview sugerencias IA ────────────────────────────── */}
      {aiPreview && (
        <div className="ai-overlay" onClick={() => setAiPreview(null)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <h3>✨ Sugerencias de la IA</h3>
            <p className="ai-subtitle">
              Revisá los valores detectados en las fotos. Podés aplicarlos todos o cerrar sin cambios.
            </p>
            <div>
              {aiPreview.campos.map((sug, i) => (
                <div key={i} className="ai-suggestion-row">
                  <span className="sug-campo">{sug.campo}</span>
                  <span className="sug-valor">{sug.valor}</span>
                </div>
              ))}
            </div>
            <div className="ai-modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setAiPreview(null)}>
                Cancelar
              </button>
              <button
                className="btn-ai"
                onClick={() => applyAiSuggestions(activeAmbiente, aiPreview.campos)}
              >
                ✅ Aplicar sugerencias
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">{isEdit ? 'Editar Inventario' : 'Nuevo Inventario'}</h1>
            <p className="page-subtitle">{form.direccion || 'Completá los datos'}</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'datos' ? 'active' : ''}`}
            onClick={() => setActiveTab('datos')}
          >
            📝 Datos generales
          </button>
          <button
            className={`tab ${activeTab === 'ambientes' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ambientes'); setActiveAmbiente(null); }}
          >
            🏠 Ambientes ({ambientes.length})
          </button>
        </div>

        {/* ── TAB: DATOS GENERALES ─────────────────────────────────────── */}
        {activeTab === 'datos' && (
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontFamily: 'var(--font-display)' }}>Información del Inventario</h3>
              </div>
              <div className="card-body">
                <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <InputField label="Fecha" name="fecha" type="date" required value={form.fecha} onChange={setField} />
                  <InputField label="Código" name="codigo" required placeholder="Ej: INV-2024-001" value={form.codigo} onChange={setField} />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Dirección *</label>
                  <input className="form-control" value={form.direccion} onChange={e => setField('direccion', e.target.value)} required placeholder="Calle, número, apartamento..." />
                </div>
                <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <InputField label="Localidad" name="localidad" required placeholder="Montevideo" value={form.localidad} onChange={setField} />
                  <InputField label="Padrón" name="padron" type="number" required placeholder="123456" value={form.padron} onChange={setField} />
                </div>
                <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <InputField label="Arrendador" name="arrendador" required placeholder="Nombre completo" value={form.arrendador} onChange={setField} />
                  <InputField label="Arrendatario" name="arrendatario" required placeholder="Nombre completo" value={form.arrendatario} onChange={setField} />
                </div>
                <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <InputField label="Llaves" name="llaves" type="number" required placeholder="2" value={form.llaves} onChange={setField} />
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-control" value={form.estado} onChange={e => setField('estado', e.target.value)}>
                      <option value="borrador">Borrador</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <textarea className="form-control" value={form.observaciones} onChange={e => setField('observaciones', e.target.value)} placeholder="Notas adicionales..." rows={3} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Guardando...' : isEdit ? '💾 Guardar cambios' : '✅ Crear inventario'}
              </button>
            </div>
          </form>
        )}

        {/* ── TAB: AMBIENTES ───────────────────────────────────────────── */}
        {activeTab === 'ambientes' && (
          <div>
            {!isEdit && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                ⚠️ Guardá primero los datos generales para poder gestionar los ambientes.
              </div>
            )}

            {/* Barra de acciones — solo visible en la vista de lista */}
            {activeAmbiente === null && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setShowAddAmbiente(true)}>
                  + Agregar Ambiente
                </button>
                {isEdit && (
                  <button className="btn btn-accent" onClick={saveAmbientes} disabled={saving}>
                    {saving ? '⏳ Guardando...' : '💾 Guardar Ambientes'}
                  </button>
                )}
              </div>
            )}

            {/* Modal: agregar ambiente */}
            {showAddAmbiente && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddAmbiente(false)}>
                <div className="modal">
                  <div className="modal-header">
                    <h3 style={{ fontFamily: 'var(--font-display)' }}>Agregar Ambiente</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowAddAmbiente(false)}>✕</button>
                  </div>
                  <div className="modal-body">
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem', fontSize: '0.9rem' }}>
                      Podés agregar desde un template o crear uno en blanco.
                    </p>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        Desde un Template
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                        {templates.map(t => (
                          <button
                            key={t._id}
                            className="btn btn-outline"
                            style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                            onClick={() => addAmbienteFromTemplate(t._id)}
                          >
                            📐 {t.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                    <hr className="divider" />
                    <div>
                      <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        Ambiente en Blanco
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          className="form-control"
                          placeholder="Nombre del ambiente..."
                          value={newAmbienteName}
                          onChange={e => setNewAmbienteName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addAmbienteBlank()}
                        />
                        <button className="btn btn-primary" onClick={addAmbienteBlank}>Agregar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {ambientes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏠</div>
                <h3>Sin ambientes</h3>
                <p>Agregá ambientes al inventario</p>
              </div>
            ) : (
              <div className={`amb-layout ${activeAmbiente !== null ? 'has-active' : ''}`}>

                {/* ── LISTA DE AMBIENTES ─────────────────────────────── */}
                <div className="amb-sidebar">
                  <div className="card">
                    <div style={{ padding: '0.5rem' }}>
                      {ambientes.map((amb, i) => (
                        <button
                          key={i}
                          className="amb-list-item"
                          onClick={() => setActiveAmbiente(i)}
                          style={{
                            background: activeAmbiente === i ? 'var(--primary-ultra-light)' : 'transparent',
                            color: activeAmbiente === i ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: activeAmbiente === i ? 600 : 400,
                          }}
                        >
                          <span>🏠 {amb.nombre}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px', flexShrink: 0 }}>
                            {amb.tuplas?.length || 0} campo{amb.tuplas?.length !== 1 ? 's' : ''}
                            {amb.archivos?.length > 0 && ` · ${amb.archivos.length} 📎`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── EDITOR DEL AMBIENTE ────────────────────────────── */}
                <div className="amb-editor">
                  {activeAmbiente === null ? (
                    /* Desktop: placeholder cuando no hay selección */
                    <div className="card">
                      <div className="empty-state">
                        <div className="empty-state-icon">👈</div>
                        <h3>Seleccioná un ambiente</h3>
                        <p>Hacé click en un ambiente de la lista para editarlo</p>
                      </div>
                    </div>
                  ) : ambienteActual ? (
                    <div className="card">
                      {/* Botón volver (solo visible en mobile) */}
                      <div style={{ padding: '0.75rem 1rem 0' }}>
                        <button
                          className="btn btn-ghost btn-sm amb-back-btn"
                          onClick={() => setActiveAmbiente(null)}
                        >
                          ← Volver a la lista
                        </button>
                      </div>

                      {/* Header: nombre del ambiente + eliminar */}
                      <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <input
                          className="form-control"
                          style={{ fontWeight: 600, fontSize: '1rem', minWidth: 0, flex: 1 }}
                          value={ambienteActual.nombre || ''}
                          onChange={e => updateAmbiente(activeAmbiente, 'nombre', e.target.value)}
                        />
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeAmbiente(activeAmbiente)}
                          style={{ color: 'var(--danger)', flexShrink: 0 }}
                        >
                          🗑 Eliminar
                        </button>
                      </div>

                      <div className="card-body">
                        {/* ── Campos / Tuplas ──────────────────────────── */}
                        <div style={{ marginBottom: '1.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '8px', flexWrap: 'wrap' }}>
                            <label className="form-label" style={{ margin: 0 }}>Campos del ambiente</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {isEdit && ambienteActual?.archivos?.some(a => a.tipo === 'image') && (
                                <button
                                  className="btn-ai"
                                  onClick={() => analyzeWithAI(ambienteActual._id)}
                                  disabled={aiAnalyzing}
                                  title="Analizar fotos con IA para completar los campos"
                                >
                                  {aiAnalyzing ? (
                                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analizando...</>
                                  ) : (
                                    <>✨ Analizar con IA</>
                                  )}
                                </button>
                              )}
                              <button className="btn btn-outline btn-sm" onClick={() => addTupla(activeAmbiente)}>
                                + Campo
                              </button>
                            </div>
                          </div>

                          {ambienteActual.tuplas?.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              Sin campos. Agregá uno con el botón.
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {ambienteActual.tuplas?.map((tupla, ti) => (
                                <div key={ti} className="tupla-row">
                                  <input
                                    className="form-control tupla-campo-label"
                                    placeholder="Nombre del campo"
                                    value={tupla.campo}
                                    onChange={e => updateTupla(activeAmbiente, ti, 'campo', e.target.value)}
                                    style={{ flex: '0 0 38%' }}
                                  />
                                  <input
                                    className="form-control tupla-valor"
                                    placeholder="Valor"
                                    value={tupla.valor}
                                    onChange={e => updateTupla(activeAmbiente, ti, 'valor', e.target.value)}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    className="btn btn-ghost btn-sm btn-icon"
                                    onClick={() => removeTupla(activeAmbiente, ti)}
                                    style={{ color: 'var(--danger)', flexShrink: 0 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ── Archivos y fotos ──────────────────────────── */}
                        {isEdit && (
                          <div>
                            <hr className="divider" />
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>
                              Fotos y archivos
                            </label>

                            {/* Fotos existentes */}
                            {ambienteActual.archivos?.filter(a => a.tipo === 'image').length > 0 && (
                              <div className="photo-grid" style={{ marginBottom: '0.8rem' }}>
                                {ambienteActual.archivos.filter(a => a.tipo === 'image').map(arch => (
                                  <div key={arch._id} className="photo-thumb">
                                    <img src={arch.url} alt={arch.nombre} />
                                    <button
                                      className="delete-btn"
                                      onClick={() => handleDeleteFile(ambienteActual._id, arch._id)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Otros archivos */}
                            {ambienteActual.archivos?.filter(a => a.tipo !== 'image').map(arch => (
                              <div key={arch._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '6px' }}>
                                <span>📄</span>
                                <a href={arch.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--primary)', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                                  {arch.nombre}
                                </a>
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  onClick={() => handleDeleteFile(ambienteActual._id, arch._id)}
                                  style={{ color: 'var(--danger)', flexShrink: 0 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}

                            {/* Zona de upload */}
                            <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                style={{ display: 'none' }}
                                onChange={e => {
                                  const files = Array.from(e.target.files);
                                  if (files.length) handleFileUpload(ambienteActual._id, files);
                                  e.target.value = '';
                                }}
                              />
                              {uploadingFiles[ambienteActual?._id] ? (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <div className="spinner" style={{ width: 24, height: 24 }} />
                                </div>
                              ) : (
                                <>
                                  <div className="dropzone-icon">📎</div>
                                  <div>Tocá para subir fotos o archivos</div>
                                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                                    Imágenes, PDF, Word, Excel — máx. 20MB
                                  </div>
                                </>
                              )}
                            </label>
                          </div>
                        )}

                        {/* Botón guardar + navegación al final (útil en mobile) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', flexWrap: 'wrap', gap: '8px' }}>
                          {/* Navegar entre ambientes */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              disabled={activeAmbiente === 0}
                              onClick={() => setActiveAmbiente(i => i - 1)}
                            >
                              ← Anterior
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              disabled={activeAmbiente === ambientes.length - 1}
                              onClick={() => setActiveAmbiente(i => i + 1)}
                            >
                              Siguiente →
                            </button>
                          </div>
                          {isEdit && (
                            <button className="btn btn-accent btn-sm" onClick={saveAmbientes} disabled={saving}>
                              {saving ? '⏳...' : '💾 Guardar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

              </div>
            )}

            {/* Botón guardar global al pie (desktop, cuando hay ambientes) */}
            {isEdit && ambientes.length > 0 && activeAmbiente === null && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-accent" onClick={saveAmbientes} disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar todos los ambientes'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default InventarioFormPage;
