import { Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import CopilotChat from './CopilotChat';
import OnboardingTour from './OnboardingTour';
import FeedbackWidget from './FeedbackWidget';
import BugReportModal from './BugReportModal';
import CompletionReminderWidget from './CompletionReminderWidget';
import api from '../lib/api';
import { FEATURES } from '../lib/features';
import { useAuth } from '../context/AuthContext';
import { Bell, Menu, Search, Bug } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const { refreshProfile } = useAuth();

  // Le profil (dont le rôle, ex: passage à admin) n'était rechargé qu'à la
  // connexion ou au premier chargement de page — une session laissée ouverte
  // pouvait afficher un menu périmé (ex: lien "Admin" absent) alors que le
  // backend, lui, revérifie toujours le rôle en base à chaque appel.
  useEffect(() => {
    const interval = setInterval(refreshProfile, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'pending'],
    queryFn: () => api.get('/alerts?status=pending').then(r => r.data),
    refetchInterval: 30000,
    retry: false
  });
  const pendingCount = alertsData?.alerts?.length || 0;

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Bloque le défilement de l'arrière-plan quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen relative overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <div className="dip-orb dip-orb-b" />
      <div className="dip-orb dip-orb-a" />
      <div className="dip-orb dip-orb-c" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="relative flex-1 min-h-screen md:ml-64">
        {/* Mobile header — hamburger (téléphones uniquement) */}
        <header
          className="md:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
          style={{ background: 'var(--header-bg)', backdropFilter: 'var(--sidebar-blur)', WebkitBackdropFilter: 'var(--sidebar-blur)', borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary hover:text-gold transition-colors p-1.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.04)' }}
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          <span className="font-cormorant text-xl text-gold">DIPpro</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCmdOpen(true)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-gold transition-colors"
              style={{ background: 'rgba(0,0,0,0.04)' }}
              aria-label="Recherche (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <Link to="/alerts" className="relative p-1.5 text-text-secondary hover:text-gold transition-colors rounded-lg" style={{ background: 'rgba(0,0,0,0.04)' }}>
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-danger text-white rounded-full flex items-center justify-center font-dm-mono leading-none" style={{ fontSize: 9 }}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Desktop search hint — ordinateurs et tablettes */}
        <div className="hidden md:flex items-center justify-end px-8 pt-6 pb-0">
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--glass-elevated)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', color: 'rgb(var(--text-muted))' }}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-dm-sans text-xs">Recherche & navigation</span>
            <kbd className="font-dm-mono text-xs ml-1 px-1 rounded" style={{ background: 'var(--input-bg)', color: 'rgb(var(--text-secondary))' }}>⌘K</kbd>
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 pb-8 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {FEATURES.copilot && <CopilotChat />}
      <OnboardingTour />
      <CompletionReminderWidget />
      <FeedbackWidget />

      {/* Bouton signalement de bug — positionné juste au-dessus du FeedbackWidget */}
      <button
        onClick={() => setBugModalOpen(true)}
        title="Signaler un problème à DIPpro"
        style={{
          position: 'fixed', bottom: 148, right: 20, zIndex: 390,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 13px', borderRadius: 99,
          background: 'rgb(var(--bg-elevated))',
          border: '0.5px solid rgba(229,62,62,0.18)',
          color: 'rgba(229,62,62,0.50)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 11.5,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(229,62,62,0.40)'; e.currentTarget.style.color = '#e53e3e'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(229,62,62,0.18)'; e.currentTarget.style.color = 'rgba(229,62,62,0.50)'; }}
      >
        <Bug size={12} />
        <span>Bug</span>
      </button>
      <BugReportModal open={bugModalOpen} onClose={() => setBugModalOpen(false)} />
    </div>
  );
}
