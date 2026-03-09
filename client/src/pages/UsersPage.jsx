import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const emptyUser = { username: '', nombre: '', apellido: '', email: '', celular: '', password: '' };

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // user a eliminar

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) { toast.error('Error cargando usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyUser }); setLogoFile(null); setShowModal(true); };
  const openEdit = (u) => {
    setEditing(u._id);
    setForm({ username: u.username, nombre: u.nombre, apellido: u.apellido, email: u.email, celular: u.celular || '', password: '' });
    setLogoFile(null);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const handleSave = async () => {
    const required = editing ? ['nombre', 'apellido', 'email'] : ['username', 'nombre', 'apellido', 'email', 'password'];
    for (const f of required) {
      if (!form[f]?.trim()) { toast.error(`El campo "${f}" es obligatorio`); return; }
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (logoFile) fd.append('logo', logoFile);

      if (editing) {
        await api.put(`/users/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Usuario creado');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { activo: !user.activo });
      toast.success(`Usuario ${!user.activo ? 'activado' : 'desactivado'}`);
      fetchUsers();
    } catch (err) { toast.error('Error al actualizar'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await api.delete(`/users/${confirmDelete._id}`);
      const n = res.data.inventariosEliminados;
      toast.success(`Usuario eliminado${n > 0 ? ` junto con ${n} inventario(s)` : ''}`);
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión de cuentas inmobiliarias</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Usuario</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>Sin usuarios</h3>
          <p>Crea el primer usuario inmobiliaria</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {users.map(u => (
            <div className="card" key={u._id} style={{ opacity: u.activo ? 1 : 0.6 }}>
              <div className="card-body" style={{ padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '1.2rem', overflow: 'hidden', flexShrink: 0 }}>
                  {u.logo ? <img src={u.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.nombre?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{u.nombre} {u.apellido}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>@{u.username}</span>
                    <span>{u.email}</span>
                    {u.celular && <span>📱 {u.celular}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span className={`badge badge-${u.activo ? 'success' : 'danger'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>✏️</button>
                  <button className={`btn btn-sm ${u.activo ? 'btn-ghost' : 'btn-accent'}`} onClick={() => handleToggleActive(u)} style={u.activo ? { color: 'var(--danger)' } : {}}>
                    {u.activo ? '⛔' : '✅'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(u)} style={{ color: 'var(--danger)' }} title="Eliminar usuario">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger)' }}>⚠️ Eliminar usuario</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>
                Estás por eliminar permanentemente a <strong>{confirmDelete.nombre} {confirmDelete.apellido}</strong>.
              </p>
              <div style={{ background: '#fff3f3', border: '1px solid #fcc', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.9rem', color: 'var(--danger)' }}>
                Esta acción eliminará también <strong>todos los inventarios</strong> de este usuario y no se puede deshacer.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="form-control" value={form.nombre} onChange={e => setField('nombre', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellido *</label>
                    <input className="form-control" value={form.apellido} onChange={e => setField('apellido', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setField('email', e.target.value)} />
                </div>
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Usuario *</label>
                    <input className="form-control" value={form.username} onChange={e => setField('username', e.target.value)} placeholder="nombre_usuario" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Celular</label>
                  <input className="form-control" value={form.celular} onChange={e => setField('celular', e.target.value)} placeholder="094 123 456" />
                </div>
                <div className="form-group">
                  <label className="form-label">{editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                  <input type="password" className="form-control" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Logo/Foto</label>
                  <input type="file" className="form-control" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
                </div>
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

export default UsersPage;
