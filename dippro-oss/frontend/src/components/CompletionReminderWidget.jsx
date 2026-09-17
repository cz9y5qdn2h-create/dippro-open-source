import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const STORAGE_KEY = 'dippro-reminder-dismissed';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function CompletionReminderWidget() {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const lastDismissed = localStorage.getItem(STORAGE_KEY);
    if (lastDismissed === getTodayKey()) {
      setDismissed(true);
    }
    setReady(true);
  }, []);

  const { data } = useQuery({
    queryKey: ['dips', 'reminder'],
    queryFn: () => api.get('/dip').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: ready && !dismissed,
  });

  const dip = data?.dips?.find(d => d.status === 'actif') ?? data?.dips?.[0];
  const sections = dip?.dip_sections || [];
  const incompleteSections = sections.filter(s => s.status !== 'conforme');

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, getTodayKey());
    setDismissed(true);
  };

  const visible = ready && !dismissed && dip && incompleteSections.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="completion-reminder-widget"
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 380,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            borderRadius: 12,
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.35)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
            maxWidth: 'calc(100vw - 32px)',
            boxSizing: 'border-box',
          }}
        >
          <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B', flexShrink: 0 }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'rgb(var(--text-primary))', minWidth: 0 }}>
            <strong>{incompleteSections.length}</strong> section{incompleteSections.length > 1 ? 's' : ''} du DIP
            {incompleteSections.length > 1 ? ' restent' : ' reste'} à compléter
            {dip.conformity_score != null && ` — ${dip.conformity_score}% de conformité`}
          </span>
          <Link
            to="/dip"
            onClick={handleDismiss}
            style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
              color: '#F59E0B', textDecoration: 'none', flexShrink: 0,
            }}
          >
            Compléter →
          </Link>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgb(var(--text-muted))', padding: 2, flexShrink: 0,
            }}
            aria-label="Fermer"
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
