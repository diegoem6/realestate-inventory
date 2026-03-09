import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ nombre: user?.nombre || '', apellido: user?.apellido || '', email: user?.email || '', celular: user?.celular || '', password: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (logoFile) fd.append('logo', logoFile);
      const res = await api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data);
      toast.success('Perfil actualizado');
      setForm(f => ({ ...f, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Perfil</h1>
          <p className="page-subtitle">Actualiza tu información de cuenta</p>
        </div>
      </div>

      <div style={{ maxWidth: '560px' }}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.5rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '2rem', overflow: 'hidden', flexShrink: 0 }}>
              {user?.logo ? <img src={user.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.nombre?.[0]}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--primary)' }}>{user?.nombre} {user?.apellido}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>@{user?.username} · <span style={{ textTransform: 'capitalize' }}>{user?.rol}</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 style={{ fontFamily: 'var(--font-display)' }}>Editar datos</h3></div>
          <div className="card-body">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={form.nombre} onChange={e => setField('nombre', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input className="form-control" value={form.apellido} onChange={e => setField('apellido', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={e => setField('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                <input className="form-control" value={form.celular} onChange={e => setField('celular', e.target.value)} placeholder="094 123 456" />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
                <input type="password" className="form-control" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Logo / Foto de perfil</label>
                <input type="file" className="form-control" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Guardando...' : '💾 Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
