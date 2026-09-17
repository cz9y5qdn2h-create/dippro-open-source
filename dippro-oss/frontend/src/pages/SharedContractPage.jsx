import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, AlertTriangle, ScrollText, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { useState } from 'react';
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

function ClauseCard({ clause, statusConfig }) {
  const [open, setOpen] = useState(false);
  const cfg = statusConfig[clause.status] || statusConfig.a_verifier;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cfg.border}`, background: 'rgba(255,255,255,0.7)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-dm-mono text-xs w-5 flex-shrink-0" style={{ color: '#9C4141' }}>{String(clause.clause_number).padStart(2, '0')}</span>
          <span className="font-dm-sans text-sm font-medium truncate" style={{ color: '#1A1826' }}>{clause.clause_title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="font-dm-mono text-xs px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
          {open ? <ChevronUp className="w-4 h-4" style={{ color: '#94A3B8' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#94A3B8' }} />}
        </div>
      </button>
      {open && clause.content && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: cfg.border }}>
          <RichTextView content={clause.content} className="font-dm-sans text-sm leading-relaxed mt-3" style={{ color: '#475569' }} />
        </div>
      )}
    </div>
  );
}

export default function SharedContractPage() {
  usePageBackground(BG);
  const { token } = useParams();
  const { t } = useTranslation();

  const STATUS_CONFIG = {
    conforme:     { label: t('common.conformity.compliant'), ...STATUS_CONFIG_BASE.conforme },
    a_verifier:   { label: t('common.conformity.toCheck'), ...STATUS_CONFIG_BASE.a_verifier },
    non_conforme: { label: t('common.conformity.nonCompliant'), ...STATUS_CONFIG_BASE.non_conforme },
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-contract', token],
    queryFn: () => axios.get(`${API_BASE}/contracts/shared/${token}`).then(r => r.data),
    retry: false
  });

  const contract = data?.contract;

  const stats = contract ? {
    total: contract.clauses.length,
    conforme: contract.clauses.filter(c => c.status === 'conforme').length,
    a_verifier: contract.clauses.filter(c => c.status === 'a_verifier').length,
    non_conforme: contract.clauses.filter(c => c.status === 'non_conforme').length,
  } : null;

  return (
    <div className="min-h-screen p-4 py-8" style={{ background: BG }}>
      <div className="max-w-2xl mx-auto space-y-6">

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
        ) : isError || !contract ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h2 className="font-cormorant text-2xl mb-2" style={{ color: '#1A1826' }}>{t('shared.notFound.title')}</h2>
            <p className="font-dm-sans text-sm" style={{ color: '#64748B' }}>{t('shared.notFound.desc')}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 32px rgba(80,90,140,0.1)' }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-3 font-dm-mono text-xs" style={{ background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.2)', color: '#9C4141' }}>
                    <ScrollText className="w-3 h-3" />
                    Contrat de franchise
                  </div>
                  <h1 className="font-cormorant text-2xl" style={{ color: '#1A1826' }}>{contract.title}</h1>
                  <p className="font-dm-mono text-xs mt-1" style={{ color: '#94A3B8' }}>
                    {t('shared.updatedOn', { date: new Date(contract.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) })}
                  </p>
                </div>
                <div className="text-center flex-shrink-0">
                  <ScoreArc score={contract.conformity_score || 0} />
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

            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(156,65,65,0.08)', border: '1px solid rgba(156,65,65,0.2)' }}>
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9C4141' }} />
              <div>
                <p className="font-dm-sans text-xs font-medium mb-0.5" style={{ color: '#1A1826' }}>{t('shared.legalNotice')}</p>
                <p className="font-dm-sans text-xs leading-relaxed" style={{ color: '#64748B' }}>
                  Ce contrat de franchise a été analysé par l'IA DIPpro. Il doit être lu conjointement avec le DIP qui vous a été remis 20 jours avant sa signature.
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-cormorant text-xl mb-4" style={{ color: '#1A1826' }}>
                {t('shared.sectionsTitle')} ({contract.clauses.length})
              </h2>
              <div className="space-y-3">
                {contract.clauses.map(clause => (
                  <ClauseCard key={clause.id} clause={clause} statusConfig={STATUS_CONFIG} />
                ))}
              </div>
            </div>

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
