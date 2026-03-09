import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const emptyTemplate = { nombre: '', esDefault: false, orden: 0, tuplas: [] };

const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTemplate);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err) { toast.error('Error cargando templates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyTemplate, tuplas: [] }); setShowModal(true); };
  const openEdit = (t) => { setEditing(t._id); setForm({ nombre: t.nombre, esDefault: t.esDefault, orden: t.orden, tuplas: t.tuplas.map(tp => ({ campo: tp.campo, valorDefault: tp.valorDefault || '' })) }); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const addTupla = () => setForm(f => ({ ...f, tuplas: [...f.tuplas, { campo: '', valorDefault: '' }] }));
  const removeTupla = (i) => setForm(f => ({ ...f, tuplas: f.tuplas.filter((_, j) => j !== i) }));
  const updateTupla = (i, k, v) => setForm(f => ({ ...f, tuplas: f.tuplas.map((t, j) => j === i ? { ...t, [k]: v } : t) }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/templates/${editing}`, form);
        toast.success('Template actualizado');
      } else {
        await api.post('/templates', form);
        toast.success('Template creado');
      }
      closeModal();
      fetchTemplates();
    } catch (err) { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Template eliminado');
      fetchTemplates();
    } catch (err) { toast.error('Error al eliminar'); }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates de Ambientes</h1>
          <p className="page-subtitle">Configura los ambientes predeterminados para nuevos inventarios</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Template</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {templates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📐</div>
              <h3>Sin templates</h3>
              <p>Crea templates para agilizar la creación de inventarios</p>
            </div>
          ) : templates.map(t => (
            <div key={t._id} className="card">
              <div className="card-body" style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--primary-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>📐</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{t.nombre}</span>
                    {t.esDefault && <span className="badge badge-success">⭐ Por defecto</span>}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Orden: {t.orden}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.tuplas.length} campo{t.tuplas.length !== 1 ? 's' : ''}</span>
                  </div>
                  {t.tuplas.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {t.tuplas.slice(0, 6).map((tp, i) => (
                        <span key={i} style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{tp.campo}</span>
                      ))}
                      {t.tuplas.length > 6 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+{t.tuplas.length - 6} más</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>✏️ Editar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t._id)} style={{ color: 'var(--danger)' }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>{editing ? 'Editar Template' : 'Nuevo Template'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-control" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Habitación, Baño..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Orden</label>
                  <input type="number" className="form-control" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.esDefault} onChange={e => setForm(f => ({ ...f, esDefault: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                  <span style={{ fontWeight: 500 }}>⭐ Incluir por defecto en nuevos inventarios</span>
                </label>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                  <label className="form-label">Campos predeterminados</label>
                  <button className="btn btn-outline btn-sm" onClick={addTupla}>+ Campo</button>
                </div>
                {form.tuplas.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Sin campos. Agrega campos usando el botón.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                    {form.tuplas.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input className="form-control" placeholder="Nombre del campo *" value={t.campo} onChange={e => updateTupla(i, 'campo', e.target.value)} style={{ flex: '0 0 45%' }} />
                        <input className="form-control" placeholder="Valor por defecto (opcional)" value={t.valorDefault} onChange={e => updateTupla(i, 'valorDefault', e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeTupla(i)} style={{ color: 'var(--danger)', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳ Guardando...' : '💾 Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
