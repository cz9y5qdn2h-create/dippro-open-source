import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, AlertTriangle, FileText, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import RichTextView from '../components/document/RichTextView';
import usePageBackground from '../lib/usePageBackground';

const BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

const STATUS_CONFIG_BASE = {
  conforme:     { color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'  },
  a_verifier:   { color: '#9C4141', bg: 'rgba(156,65,65,0.08)', border: 'rgba(156,65,65,0.2)' },
  non_conforme: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
};

function ScoreArc({ score }) {
  const r = 52, cx = 64, cy = 64;
  const circumference = Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#9C4141' : '#EF4444';
  return (
    <svg width="128" height="80" viewBox="0 0 128 80">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(200,200,220,0.3)" strokeWidth="10" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fill: color, fontSize: 22, fontFamily: 'Fraunces, serif', fontWeight: 300 }}>{score}%</text>
    </svg>
  );
}

function SectionCard({ section, onToggle, statusConfig }) {
  const [open, setOpen] = useState(false);
  const cfg = statusConfig[section.status] || statusConfig.a_verifier;

  const handleClick = () => {
    const next = !open;
    setOpen(next);
    onToggle(section.section_number, next);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cfg.border}`, background: 'rgba(255,255,255,0.7)' }}>
      <button onClick={handleClick} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-dm-mono text-xs w-5 flex-shrink-0" style={{ color: '#9C4141' }}>{String(section.section_number).padStart(2, '0')}</span>
          <span className="font-dm-sans text-sm font-medium truncate" style={{ color: '#1A1826' }}>{section.section_title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="font-dm-mono text-xs px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
          {open ? <ChevronUp className="w-4 h-4" style={{ color: '#94A3B8' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#94A3B8' }} />}
        </div>
      </button>
      {open && section.content && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: cfg.border }}>
          <RichTextView content={section.content} className="font-dm-sans text-sm leading-relaxed mt-3" style={{ color: '#475569' }} />
        </div>
      )}
    </div>
  );
}

function useReadTracker(dip, token) {
  const visitIdRef  = useRef(null);
  const openTimes   = useRef({});
  const pendingEvts = useRef([]);
  const maxScroll   = useRef(0);

  // Initialise le visit_id une seule fois par token (sessionStorage = même onglet)
  useEffect(() => {
    if (!token) return;
    const key = `dip_vid_${token}`;
    let vid = sessionStorage.getItem(key);
    if (!vid) {
      vid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, vid);
    }
    visitIdRef.current = vid;
  }, [token]);

  useEffect(() => {
    if (!dip?.id || !token) return;

    const onScroll = () => {
      const pct = Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
      if (pct > maxScroll.current) maxScroll.current = Math.min(pct, 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const flush = () => {
      // Fermer les sections encore ouvertes
      for (const [num, t] of Object.entries(openTimes.current)) {
        const s = Math.round((Date.now() - t) / 1000);
        if (s >= 1) pendingEvts.current.push({ section_number: +num, time_spent_s: s, scroll_depth_pct: maxScroll.current });
      }
      openTimes.current = {};

      if (pendingEvts.current.length === 0 || !visitIdRef.current) return;

      const payload = JSON.stringify({
        dip_id: dip.id,
        share_token: token,
        visit_id: visitIdRef.current,
        events: pendingEvts.current.splice(0),
      });
      // sendBeacon garantit l'envoi même si la page se ferme
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/analytics/read`, blob);
    };

    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', flush);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [dip?.id, token]);

  const handleToggle = useCallback((sectionNumber, isOpen) => {
    if (isOpen) {
      openTimes.current[sectionNumber] = Date.now();
    } else {
      const t = openTimes.current[sectionNumber];
      if (t) {
        const s = Math.round((Date.now() - t) / 1000);
        if (s >= 1) {
          pendingEvts.current.push({ section_number: sectionNumber, time_spent_s: s, scroll_depth_pct: maxScroll.current });
        }
        delete openTimes.current[sectionNumber];
      }
    }
  }, []);

  return { handleToggle };
}

export default function SharedDIPPage() {
  usePageBackground(BG);
  const { token } = useParams();
  const { t } = useTranslation();

  const STATUS_CONFIG = {
    conforme:     { label: t('common.conformity.compliant'), ...STATUS_CONFIG_BASE.conforme },
    a_verifier:   { label: t('common.conformity.toCheck'), ...STATUS_CONFIG_BASE.a_verifier },
    non_conforme: { label: t('common.conformity.nonCompliant'), ...STATUS_CONFIG_BASE.non_conforme },
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-dip', token],
    queryFn: () => axios.get(`${API_BASE}/dip/shared/${token}`).then(r => r.data),
    retry: false
  });

  const dip = data?.dip;
  const { handleToggle } = useReadTracker(dip, token);

  const stats = dip ? {
    total: dip.sections.length,
    conforme: dip.sections.filter(s => s.status === 'conforme').length,
    a_verifier: dip.sections.filter(s => s.status === 'a_verifier').length,
    non_conforme: dip.sections.filter(s => s.status === 'non_conforme').length,
  } : null;

  return (
    <div className="min-h-screen p-4 py-8" style={{ background: BG }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)' }}>
              <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
            </div>
            <div>
              <p className="font-cormorant text-lg" style={{ color: '#1A1826' }}>DIPpro</p>
              <p className="font-dm-mono text-xs" style={{ color: '#94A3B8' }}>by Iralink</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-dm-mono text-xs" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
            <Award className="w-3.5 h-3.5" />
            {t('shared.officialDoc')}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" style={{ color: '#9C4141' }} />
            <p className="font-dm-sans text-sm mt-4" style={{ color: '#64748B' }}>{t('shared.loading')}</p>
          </div>
        ) : isError || !dip ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h2 className="font-cormorant text-2xl mb-2" style={{ color: '#1A1826' }}>{t('shared.notFound.title')}</h2>
            <p className="font-dm-sans text-sm" style={{ color: '#64748B' }}>{t('shared.notFound.desc')}</p>
          </div>
        ) : (
          <>
            {/* DIP Card principal */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 32px rgba(80,90,140,0.1)' }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-3 font-dm-mono text-xs" style={{ background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.2)', color: '#9C4141' }}>
                    <FileText className="w-3 h-3" />
                    {t('shared.docTitle')}
                  </div>
                  <h1 className="font-cormorant text-2xl" style={{ color: '#1A1826' }}>{dip.title}</h1>
                  <p className="font-dm-mono text-xs mt-1" style={{ color: '#94A3B8' }}>
                    {t('shared.updatedOn', { date: new Date(dip.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) })}
                  </p>
                </div>
                <div className="text-center flex-shrink-0">
                  <ScoreArc score={dip.conformity_score || 0} />
                  <p className="font-dm-sans text-xs" style={{ color: '#64748B' }}>{t('shared.conformityScore')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('common.conformity.compliant'), value: stats.conforme, color: '#22C55E', bg: 'rgba(34,197,94,0.06)' },
                  { label: t('common.conformity.toCheck'), value: stats.a_verifier, color: '#9C4141', bg: 'rgba(156,65,65,0.06)' },
                  { label: t('common.conformity.nonCompliant'), value: stats.non_conforme, color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
                    <p className="font-cormorant text-2xl font-light" style={{ color }}>{value}</p>
                    <p className="font-dm-sans text-xs" style={{ color: '#64748B' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notice légale & accusé de réception */}
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(156,65,65,0.08)', border: '1px solid rgba(156,65,65,0.2)' }}>
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9C4141' }} />
              <div>
                <p className="font-dm-sans text-xs font-medium mb-0.5" style={{ color: '#1A1826' }}>{t('shared.legalNotice')}</p>
                <p className="font-dm-sans text-xs leading-relaxed" style={{ color: '#64748B' }}>
                  En consultant ce document, vous accusez réception du DIP conformément à l'obligation légale de remise 20 jours avant signature (Loi Doubin art. L.330-3 du Code de commerce). La date et l'heure de consultation sont horodatées.
                </p>
                <p className="font-dm-mono text-xs mt-2" style={{ color: '#94A3B8' }}>
                  Ce document a été analysé par intelligence artificielle (DIPpro by Iralink). L'analyse IA est un outil d'aide à la conformité et ne se substitue pas à l'avis d'un avocat spécialisé en droit de la franchise.
                </p>
              </div>
            </div>

            {/* Sections */}
            <div>
              <h2 className="font-cormorant text-xl mb-4" style={{ color: '#1A1826' }}>
                {t('shared.sectionsTitle')} ({dip.sections.length})
              </h2>
              <div className="space-y-3">
                {dip.sections.map(section => (
                  <SectionCard key={section.id} section={section} onToggle={handleToggle} statusConfig={STATUS_CONFIG} />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(156,65,65,0.15)' }}>
              <p className="font-dm-sans text-xs mb-1" style={{ color: '#94A3B8' }}>{t('shared.generatedBy')}</p>
              <p className="font-cormorant text-lg" style={{ color: '#1A1826' }}>{t('shared.brand')} — {t('shared.byIralink')}</p>
              <p className="font-dm-mono text-xs mt-1" style={{ color: '#94A3B8' }}>Conformité Loi Doubin · RGPD · Base de données hébergée en Europe</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                {[
                  { icon: CheckCircle, label: t('shared.badges.law') },
                  { icon: CheckCircle, label: t('shared.badges.rgpd') },
                  { icon: CheckCircle, label: t('shared.badges.timestamped') },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1 font-dm-sans text-xs" style={{ color: '#94A3B8' }}>
                    <Icon className="w-3 h-3" style={{ color: '#22C55E' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
