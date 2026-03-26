import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : '/api',
});

// Resuelve URLs de archivos: las relativas (/uploads/...) se completan con la URL del servidor
export function resolveFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Arreglar URLs rotas del tipo "undefined/uploads/..."
  const clean = url.replace(/^undefined\//, '/');
  return API_BASE + (clean.startsWith('/') ? clean : `/${clean}`);
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
