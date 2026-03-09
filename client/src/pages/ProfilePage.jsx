import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Paletas predefinidas para elegir rápido
const PALETTES = [
  { name: 'Verde bosque',  color: '#1a3a2a' },
  { name: 'Azul marino',  color: '#1a2a4a' },
  { name: 'Borgoña',      color: '#5a1a2a' },
  { name: 'Gris carbón',  color: '#2a2a2a' },
  { name: 'Teal',         color: '#1a3a3a' },
  { name: 'Índigo',       color: '#2a1a5a' },
  { name: 'Cobre',        color: '#7a3a10' },
  { name: 'Pizarra',      color: '#2a3a4a' },
];

// Mini preview del membrete del PDF con el color elegido
function PdfPreview({ color }) {
  const bg = color || '#1a3a2a';
  // Calcular una versión más clara para la franja de datos
  const r = parseInt(bg.slice(1,3),16);
  const g = parseInt(bg.slice(3,5),16);
  const b = parseInt(bg.slice(5,7),16);
  const mid = `rgb(${Math.min(255,r+45)},${Math.min(255,g+45)},${Math.min(255,b+45)})`;
  const soft = `rgba(${r},${g},${b},0.07)`;
  const border = `rgba(${r},${g},${b},0.18)`;

  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)', width: '100%', userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{ background: bg, padding: '10px 14px 8px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: mid, flexShrink: 0 }} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>Inmobiliaria Ejemplo</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8 }}>contacto@ejemplo.com</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>Página 1</div>
        </div>
        <div style={{ height: 3, background: '#c8a96e', marginTop: 8, marginLeft: -14, marginRight: -14 }} />
      </div>
      {/* Contenido simulado */}
      <div style={{ background: '#fff', padding: '10px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: bg, marginBottom: 6 }}>INVENTARIO DE PROPIEDAD</div>
        {/* Tabla simulada */}
        <div style={{ border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ background: bg, padding: '3px 8px' }}>
            <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>DATOS GENERALES</span>
          </div>
          {[['DIRECCIÓN','Av. Principal 123'],['ARRENDADOR','Juan García']].map(([k,v],i) => (
            <div key={k} style={{ display:'flex', background: i%2===0?'#fff':soft, padding:'3px 8px', borderTop:`1px solid ${border}` }}>
              <span style={{ color:'#9aaba2', fontSize:7, flex:'0 0 38%' }}>{k}</span>
              <span style={{ color:'#1a1f1c', fontSize:8, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Ambiente simulado */}
        <div style={{ background: mid, borderRadius: 4, padding: '4px 8px', display:'flex', alignItems:'center', gap: 6 }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:'#c8a96e', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color: bg, fontSize: 7, fontWeight:700 }}>1</span>
          </div>
          <span style={{ color:'#fff', fontSize: 9, fontWeight:700 }}>LIVING-COMEDOR</span>
        </div>
      </div>
    </div>
  );
}

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nombre:    user?.nombre   || '',
    apellido:  user?.apellido || '',
    email:     user?.email    || '',
    celular:   user?.celular  || '',
    password:  '',
    pdfColor:  user?.pdfColor || '#1a3a2a',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving]   = useState(false);

  // Sincronizar el form cada vez que el contexto de usuario cambie
  // (cubre tanto el primer render como el update posterior al guardar)
  useEffect(() => {
    if (!user) return;
    setForm({
      nombre:   user.nombre   || '',
      apellido: user.apellido || '',
      email:    user.email    || '',
      celular:  user.celular  || '',
      password: '',
      pdfColor: user.pdfColor || '#1a3a2a',
    });
  }, [user]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      ['nombre','apellido','email','celular','pdfColor'].forEach(k => {
        if (form[k]) fd.append(k, form[k]);
      });
      if (form.password) fd.append('password', form.password);
      if (logoFile) fd.append('logo', logoFile);
      const res = await api.put('/auth/profile', fd);
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
          <p className="page-subtitle">Actualizá tu información de cuenta</p>
        </div>
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* Avatar card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.5rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden', flexShrink: 0 }}>
              {user?.logo
                ? <img src={user.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.nombre?.[0]}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--primary)' }}>
                {user?.nombre} {user?.apellido}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                @{user?.username} · <span style={{ textTransform: 'capitalize' }}>{user?.rol}</span>
              </div>
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
                  <label className="form-label">Nueva contraseña <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(dejar vacío para no cambiar)</span></label>
                  <input type="password" className="form-control" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Logo / Foto de perfil</label>
                  <input type="file" className="form-control" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
                </div>

                {/* Color para PDF */}
                <div className="form-group">
                  <label className="form-label">Color base del PDF</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    {PALETTES.map(p => (
                      <button
                        key={p.color}
                        type="button"
                        title={p.name}
                        onClick={() => setField('pdfColor', p.color)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: p.color, border: 'none', cursor: 'pointer',
                          outline: form.pdfColor === p.color ? `3px solid ${p.color}` : '3px solid transparent',
                          outlineOffset: 2,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                          transition: 'outline 0.15s',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      value={form.pdfColor}
                      onChange={e => setField('pdfColor', e.target.value)}
                      style={{ width: 44, height: 36, padding: 2, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      className="form-control"
                      value={form.pdfColor}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setField('pdfColor', v);
                      }}
                      style={{ fontFamily: 'monospace', maxWidth: 110 }}
                      placeholder="#1a3a2a"
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Hex</span>
                  </div>
                </div>

                {/* Preview inline */}
                <div>
                  <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Vista previa del PDF</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                    Así se verá el encabezado y las tablas de tus inventarios exportados.
                  </p>
                  <div style={{ maxWidth: 360 }}>
                    <PdfPreview color={form.pdfColor} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ProfilePage;
