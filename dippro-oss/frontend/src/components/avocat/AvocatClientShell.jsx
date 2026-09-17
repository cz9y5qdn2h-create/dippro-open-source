import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  FileText, ShieldCheck, FolderOpen, Download, FolderSync, ClipboardCheck, Scale,
  ChevronLeft, ChevronDown, Building2, AlertCircle,
} from 'lucide-react';

// "Recherche conformité" fusionnée dans "Moteur juridique" (bibliothèque +
// recherche IA + check de conformité réunis sur une seule page) — un onglet
// de moins à naviguer pour l'avocat.
const TABS = [
  { key: 'dip',          label: 'DIP / Contrat', icon: FileText,   to: (id) => `/dip/avocat/${id}` },
  { key: 'conformite',   label: 'Conformité',     icon: ClipboardCheck, to: (id) => `/avocat/${id}/conformite` },
  { key: 'bibliotheque', label: 'Moteur juridique', icon: Scale, to: (id) => `/avocat/${id}/bibliotheque` },
  { key: 'certifications', label: 'Certificats',  icon: ShieldCheck, to: (id) => `/avocat/${id}/certifications` },
  { key: 'documents',    label: 'Documents',       icon: FolderOpen, to: (id) => `/avocat/${id}/documents` },
  { key: 'export',       label: 'Export',          icon: Download,   to: (id) => `/avocat/${id}/export` },
  { key: 'surveillance', label: 'Surveillance',    icon: FolderSync, to: (id) => `/avocat/${id}/surveillance` },
];

export default function AvocatClientShell({ franchiseurId, active, children }) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['avocat', 'dashboard'],
    queryFn: () => api.get('/avocat/dashboard').then(r => r.data),
  });

  const franchiseurs = data?.franchiseurs || [];
  const current = franchiseurs.find(r => r.franchiseur?.id === franchiseurId)?.franchiseur;

  if (isLoading) {
    return (
      <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-primary))' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4" style={{ background: 'rgb(var(--bg-primary))' }}>
        <AlertCircle className="w-10 h-10 text-danger/50" />
        <p className="display-v2" style={{ fontSize: 24 }}>Client introuvable ou accès révoqué</p>
        <button onClick={() => navigate('/dashboard')} className="btn-cta-glow">Retour à mes clients</button>
      </div>
    );
  }

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen" style={{ background: 'rgb(var(--bg-primary))' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-dm-mono text-xs mb-4 transition-colors"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Mes clients
        </button>

        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)' }}>
              <Building2 className="w-5 h-5" style={{ color: 'var(--v2-gold)' }} />
            </div>
            <div className="min-w-0">
              <p className="display-v2 truncate" style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}>{current.company_name || 'Réseau'}</p>
              <p className="font-dm-mono text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>{current.email}</p>
            </div>
          </div>

          {franchiseurs.length > 1 && (
            <div className="relative">
              <select
                value={franchiseurId}
                onChange={(e) => {
                  const tab = TABS.find(t => t.key === active) || TABS[0];
                  navigate(tab.to(e.target.value));
                }}
                className="input-field text-sm pr-8 appearance-none cursor-pointer"
                style={{ minWidth: 200 }}
              >
                {franchiseurs.map(r => (
                  <option key={r.franchiseur?.id} value={r.franchiseur?.id}>{r.franchiseur?.company_name || 'Réseau'}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgb(var(--text-muted))' }} />
            </div>
          )}
        </div>

        <nav className="flex items-center gap-1 mb-6 overflow-x-auto pb-1" style={{ borderBottom: '1px solid var(--v2-border)' }}>
          {TABS.map(({ key, label, icon: Icon, to }) => (
            <NavLink
              key={key}
              to={to(franchiseurId)}
              className="flex items-center gap-1.5 px-3 py-2.5 font-dm-sans text-sm whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                color: active === key ? 'var(--v2-gold)' : 'rgb(var(--text-secondary))',
                borderBottom: active === key ? '2px solid var(--v2-gold)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        {children}
      </div>
    </div>
  );
}
