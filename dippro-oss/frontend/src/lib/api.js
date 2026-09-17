import axios from 'axios';
import { supabase as supabaseAuth } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '';

const api = axios.create({
  baseURL: API_BASE || '/api',
  // Le backend (api/index.js) a un budget Vercel de 300s (voir vercel.json,
  // functions.maxDuration) — les analyses IA (Opus + réflexion étendue sur
  // un DIP entier) dépassent régulièrement 30s. Un timeout client plus court
  // que le budget serveur fait abandonner la requête avant que le serveur
  // ait fini, et affichait un message d'erreur générique masquant le vrai
  // problème (ex: "Analyse impossible" sur l'analyse des risques de litige).
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});

let isRedirectingTo401 = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Le serveur met trop de temps à répondre. Réessayez dans quelques instants.'));
      }
      return Promise.reject(new Error('Le serveur est inaccessible. Verifiez votre connexion.'));
    }
    const status = error.response.status;

    // Les téléchargements (responseType: 'blob') reçoivent le corps d'erreur
    // JSON du backend sous forme de Blob binaire, pas d'objet parsé — sans
    // ce cas particulier, error.response.data?.error est toujours undefined
    // et le vrai message ("DIP introuvable", quota dépassé...) est perdu.
    let data = error.response.data;
    if (data instanceof Blob && data.type?.includes('json')) {
      try { data = JSON.parse(await data.text()); } catch {}
    }

    const raw = data?.error ?? data?.message ?? error.message;
    const msg = typeof raw === 'string' ? raw : (raw?.message ?? JSON.stringify(raw) ?? 'Erreur inconnue');

    if (status === 401) {
      if (!isRedirectingTo401) {
        isRedirectingTo401 = true;
        localStorage.removeItem('access_token');
        try { await supabaseAuth.auth.signOut(); } catch {}
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(new Error('Session expirée, reconnectez-vous.'));
    }
    if (status === 403) return Promise.reject(new Error(msg));
    if (status === 404) return Promise.reject(new Error(msg));
    if (status >= 500) return Promise.reject(new Error(msg));

    return Promise.reject(new Error(msg));
  }
);

export default api;
