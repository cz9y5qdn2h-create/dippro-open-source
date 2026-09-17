import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import CalModal from './CalModal';
import OnboardingModal from './OnboardingModal';
import LiquidGlassBtn from './ui/LiquidGlassBtn';
import {
  LayoutDashboard, FileText, Upload, Bell, History,
  Users, Settings, Download, LogOut, Phone, ShieldAlert, Sparkles,
  Sun, Moon, FolderSync, ScrollText, ChevronDown, Play, X, ShieldCheck, FolderOpen, ClipboardCheck,
} from 'lucide-react';

const THEME_ICONS = { moon: Moon, sparkle: Sparkles, sun: Sun };

function NavItem({ to, icon: Icon, label, count, adminOnly, sub, onClick, tourId }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      data-tour={tourId || undefined}
      className={({ isActive }) => [
        adminOnly
          ? (isActive ? 'nav-link-active' : 'nav-link text-gold/80 hover:text-gold')
          : (isActive ? 'nav-link-active' : 'nav-link'),
        sub ? 'pl-8 py-1.5' : '',
      ].filter(Boolean).join(' ')}
    >
      <Icon className={sub ? 'w-3.5 h-3.5 flex-shrink-0' : 'w-4 h-4 flex-shrink-0'} />
      <span className={`flex-1 truncate ${sub ? 'text-xs' : ''}`}>{label}</span>
      {count > 0 && (
        <span className="font-dm-mono text-xs bg-danger text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  );
}

function NavGroup({ group, onClose }) {
  const location = useLocation();
  const isGroupActive = group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));
  const [open, setOpen] = useState(isGroupActive);

  if (group.flat) {
    return (
      <div className="space-y-0.5">
        {group.items.map(item => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}
      </div>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        data-tour={group.tourId || undefined}
        className={`nav-link w-full text-left ${isGroupActive ? 'text-gold' : ''}`}
      >
        <GroupIcon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 font-medium text-sm">{group.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ opacity: 0.4 }}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map(item => (
            <NavItem key={item.to} {...item} sub onClick={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const { profile, logout } = useAuth();
  const { theme, setTheme, themes } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [calOpen, setCalOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);

  const toggleLang = () => {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(next);
    localStorage.setItem('dippro-lang', next);
  };

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'pending'],
    queryFn: () => api.get('/alerts?status=pending').then(r => r.data),
    refetchInterval: 30000,
    retry: false
  });
  const pendingCount = alertsData?.alerts?.length || 0;

  // Le rôle affiché dans le menu vient normalement du profil chargé par
  // AuthContext (Supabase client, mis en cache et parfois périmé). Pour le
  // lien Admin spécifiquement — critique et déjà source de confusion — on
  // vérifie aussi directement via le backend (source de vérité, toujours à
  // jour, aucun cache) et on affiche le lien si l'une des deux sources dit
  // "admin".
  const { data: meData } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
    staleTime: 30000,
    refetchInterval: 30000,
    retry: false,
  });
  const isAdmin = profile?.role === 'admin' || meData?.user?.role === 'admin';
  const isAvocat = profile?.role === 'avocat';

  const navGroups = isAvocat ? [
    {
      key: 'dashboard',
      flat: true,
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Mes clients' },
        { to: '/fichiers', icon: FolderOpen, label: 'Fichiers' },
      ],
    },
    {
      key: 'tools',
      flat: true,
      items: [
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ],
    },
  ] : [
    {
      key: 'dashboard',
      flat: true,
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
      ],
    },
    {
      key: 'dip',
      tourId: 'nav-dip',
      label: t('nav.myDip'),
      icon: FileText,
      items: [
        { to: '/dip', icon: FileText, label: 'Mon DIP actif' },
        { to: '/dip/upload', icon: Upload, label: 'Importer / Analyser' },
        { to: '/dip/generate', icon: Sparkles, label: 'Générer avec IA' },
      ],
    },
    {
      key: 'contrat',
      tourId: 'nav-contrat',
      label: t('nav.myContract'),
      icon: ScrollText,
      items: [
        { to: '/contrat', icon: ScrollText, label: 'Mon contrat' },
        { to: '/contrat/generate', icon: Sparkles, label: 'Générer avec IA' },
      ],
    },
    {
      key: 'conformite',
      flat: true,
      items: [
        { to: '/conformite', icon: ClipboardCheck, label: 'Conformité', tourId: 'nav-conformite' },
        { to: '/alerts', icon: Bell, label: t('nav.alerts'), count: pendingCount, tourId: 'nav-alerts' },
        { to: '/franchisees', icon: Users, label: t('nav.franchisees'), tourId: 'nav-franchisees' },
        { to: '/history', icon: History, label: t('nav.history'), tourId: 'nav-history' },
      ],
    },
    {
      key: 'documents',
      flat: true,
      items: [
        { to: '/documents', icon: FolderOpen, label: 'Documents' },
        { to: '/certifications', icon: ShieldCheck, label: 'Certifications' },
        { to: '/export', icon: Download, label: t('nav.export') },
      ],
    },
    {
      key: 'tools',
      flat: true,
      items: [
        { to: '/monitoring', icon: FolderSync, label: t('nav.docMonitoring') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
        ...(isAdmin ? [{ to: '/admin', icon: ShieldAlert, label: t('nav.admin'), adminOnly: true }] : []),
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside className={`
        sidebar-panel
        fixed top-0 left-0 h-full w-[84vw] max-w-[320px] md:w-64 md:max-w-none border-r border-border-subtle
        flex flex-col z-50 md:z-30 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center justify-between" style={{ borderBottom: '0.5px solid rgba(156,65,65,0.12)', marginBottom: 8 }}>
          <div>
            <div className="lg-logo-brand-pill">
              <div className="lg-logo-brand-icon">D</div>
              <span className="lg-logo-brand-text">DIPpro</span>
            </div>
            <p className="lg-logo-brand-sub">by Iralink</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-gold transition-colors flex-shrink-0"
            style={{ background: 'var(--row-bg)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <div className="space-y-0.5">
            {navGroups.map((group, gi) => (
              <div key={group.key}>
                {gi > 0 && (
                  <div className="my-2 mx-1" style={{ height: '1px', background: 'rgba(156,65,65,0.08)' }} />
                )}
                <NavGroup group={group} onClose={onClose} />
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-border-subtle space-y-3">
          <button
            onClick={() => { setPresentationOpen(true); onClose?.(); }}
            className="nav-link w-full text-left"
            style={{ opacity: 0.6, fontSize: 12 }}
          >
            <Play className="w-3 h-3 flex-shrink-0" style={{ color: 'rgb(var(--gold))' }} />
            <span className="text-xs" style={{ color: 'rgb(var(--gold))' }}>Revoir la présentation</span>
          </button>

          <LiquidGlassBtn
            onClick={() => { setCalOpen(true); onClose?.(); }}
            padding="10px 20px"
            cornerRadius={10}
            displacementScale={60}
            blurAmount={0.08}
            saturation={140}
            aberrationIntensity={1.5}
            elasticity={0.2}
            mode="prominent"
            className="w-full"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
              <Phone style={{ width: 14, height: 14 }} />
              {t('nav.contact')}
            </span>
          </LiquidGlassBtn>

          <button onClick={toggleLang} className="nav-link w-full text-left">
            <span className="font-dm-mono text-xs font-medium" style={{ letterSpacing: '0.05em' }}>
              <span style={{ color: i18n.language === 'fr' ? 'rgb(var(--gold))' : undefined }}>FR</span>
              {' / '}
              <span style={{ color: i18n.language === 'en' ? 'rgb(var(--gold))' : undefined }}>EN</span>
            </span>
          </button>

          <div className="flex items-center gap-1 px-1">
            {themes.map(({ id, label, icon }) => {
              const Icon = THEME_ICONS[icon];
              const active = theme === id;
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  title={label}
                  className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-colors ${active ? 'bg-gold/15 text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <div className="lg-user-chip">
            <p className="font-dm-sans text-sm text-text-primary truncate" style={{ fontWeight: 500 }}>
              {profile?.company_name || 'Franchiseur'}
            </p>
            <p className="font-dm-mono text-xs text-text-secondary truncate mt-0.5">
              {profile?.email || ''}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="nav-link w-full text-left text-danger hover:text-danger hover:bg-danger/5"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      <CalModal open={calOpen} onClose={() => setCalOpen(false)} />
      {presentationOpen && (
        <OnboardingModal forceShow onClose={() => setPresentationOpen(false)} />
      )}
    </>
  );
}
