import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  ShieldCheck, AlertTriangle, Clock, Users, Newspaper, ChevronRight, FileText, ScrollText, Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COMPLIANCE_LEVEL_LABEL, SCORE_DISCLAIMER } from '../lib/legalCopy';

const COMPLIANCE_LABEL = {
  CONFORME: { label: COMPLIANCE_LEVEL_LABEL.CONFORME, color: 'text-success' },
  RÉVISIONS_MINEURES: { label: COMPLIANCE_LEVEL_LABEL.RÉVISIONS_MINEURES, color: 'text-warning' },
  RÉVISIONS_MAJEURES: { label: COMPLIANCE_LEVEL_LABEL.RÉVISIONS_MAJEURES, color: 'text-danger' },
  BLOQUANT_NON_ENVOYABLE: { label: COMPLIANCE_LEVEL_LABEL.BLOQUANT_NON_ENVOYABLE, color: 'text-danger' },
};

function StatCard({ icon: Icon, label, value, tone = 'default', to }) {
  const toneClasses = {
    default: 'text-text-primary',
    danger: 'text-danger',
    warning: 'text-warning',
    success: 'text-success',
  };
  const content = (
    <div className="card hover:border-border-default transition-all h-full">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${toneClasses[tone]}`} />
        {to && <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
      </div>
      <p className={`font-cormorant text-3xl ${toneClasses[tone]}`}>{value}</p>
      <p className="font-dm-sans text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function CompliancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-overview'],
    queryFn: () => api.get('/compliance/overview').then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  const dip = data?.dip;
  const contract = data?.contract;
  const alerts = data?.alerts || { total: 0, haute: 0, moyenne: 0, faible: 0, items: [] };
  const signatureDelays = data?.signature_delays || { count: 0, items: [] };
  const reprises = data?.reprises || { count: 0, items: [] };
  const news = data?.regulatory_news || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Conformité DIP"
        subtitle="Tous les signaux de conformité au même endroit — quelle que soit la situation (mise à jour, reprise, délai légal, veille réglementaire)"
      />

      {/* Statut DIP / Contrat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gold" />
            <span className="font-dm-sans text-sm text-text-primary">Mon DIP</span>
          </div>
          {dip ? (
            <>
              <p className={`font-cormorant text-2xl ${COMPLIANCE_LABEL[dip.compliance_level]?.color || 'text-text-primary'}`}>
                {COMPLIANCE_LABEL[dip.compliance_level]?.label || 'Non évalué'}
              </p>
              <p className="font-dm-mono text-xs text-text-secondary mt-1">
                Score {dip.conformity_score ?? 0}% · {dip.conforme ?? 0} conforme(s) · {dip.a_verifier ?? 0} à vérifier · {dip.non_conforme ?? 0} non conforme(s)
              </p>
              {(dip.blocking_count ?? 0) > 0 && (
                <p className="font-dm-sans text-xs text-danger mt-2">{dip.blocking_count} section(s) légalement bloquante(s) non résolue(s)</p>
              )}
              <Link to="/dip" className="font-dm-sans text-xs text-gold hover:underline mt-3 inline-flex items-center gap-1">
                Voir le DIP <ChevronRight className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <p className="font-dm-sans text-sm text-text-secondary">Aucun DIP actif</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-4 h-4 text-gold" />
            <span className="font-dm-sans text-sm text-text-primary">Mon Contrat</span>
          </div>
          {contract ? (
            <>
              <p className={`font-cormorant text-2xl ${COMPLIANCE_LABEL[contract.compliance_level]?.color || 'text-text-primary'}`}>
                {COMPLIANCE_LABEL[contract.compliance_level]?.label || 'Non évalué'}
              </p>
              <p className="font-dm-mono text-xs text-text-secondary mt-1">Score {contract.conformity_score ?? 0}%</p>
              <Link to="/contrat" className="font-dm-sans text-xs text-gold hover:underline mt-3 inline-flex items-center gap-1">
                Voir le contrat <ChevronRight className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <p className="font-dm-sans text-sm text-text-secondary">Aucun contrat actif</p>
          )}
        </div>
      </div>

      <p className="font-dm-sans text-xs text-text-muted italic">{SCORE_DISCLAIMER}</p>

      {/* Compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Bell} label="Alertes en attente" value={alerts.total} tone={alerts.haute > 0 ? 'danger' : 'default'} to="/alerts" />
        <StatCard icon={Clock} label="Délai 20j non respecté" value={signatureDelays.count} tone={signatureDelays.count > 0 ? 'danger' : 'success'} to="/franchisees" />
        <StatCard icon={Users} label="Reprises en cours" value={reprises.count} tone="warning" to="/franchisees" />
        <StatCard icon={Newspaper} label="Actualités à fort impact" value={news.length} tone={news.length > 0 ? 'warning' : 'default'} to="/monitoring" />
      </div>

      {/* Alertes prioritaires */}
      {alerts.items.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cormorant text-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" /> Alertes prioritaires
            </h2>
            <Link to="/alerts" className="font-dm-sans text-xs text-gold hover:underline">Tout voir</Link>
          </div>
          <div className="space-y-2">
            {alerts.items.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 bg-bg-elevated rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-dm-sans text-sm text-text-primary truncate">{a.title || a.source}</p>
                  {a.suggestion && <p className="font-dm-sans text-xs text-text-secondary mt-0.5 line-clamp-1">{a.suggestion}</p>}
                </div>
                <span className={`font-dm-mono text-xs px-2 py-0.5 rounded flex-shrink-0 ${a.urgency === 'haute' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                  {a.urgency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Délai 20 jours */}
      {signatureDelays.items.length > 0 && (
        <div className="card">
          <h2 className="font-cormorant text-xl mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" /> Candidats en cours — délai légal de remise
          </h2>
          <div className="space-y-2">
            {signatureDelays.items.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3 bg-bg-elevated rounded-lg px-3 py-2.5">
                <span className="font-dm-sans text-sm text-text-primary">{f.name}</span>
                <span className={`font-dm-mono text-xs px-2 py-0.5 rounded ${f.signature_delay.compliant ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                  {f.signature_delay.days_between} jour(s) {f.signature_delay.compliant ? '— OK' : '— insuffisant'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reprises */}
      {reprises.items.length > 0 && (
        <div className="card border-gold/15">
          <h2 className="font-cormorant text-xl mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-gold" /> Candidats en reprise de fonds existant
          </h2>
          <p className="font-dm-sans text-xs text-text-secondary mb-4">
            Une reprise implique de disclosurer fidèlement l'historique réel du point de vente repris (résultats, éventuelles difficultés) — l'Art. R.330-1, 4° s'applique à ces données comme aux vôtres.
          </p>
          <div className="space-y-2">
            {reprises.items.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3 bg-bg-elevated rounded-lg px-3 py-2.5">
                <span className="font-dm-sans text-sm text-text-primary">{f.name}</span>
                <Link to="/franchisees" className="font-dm-mono text-xs text-gold hover:underline">Voir le dossier</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Veille réglementaire à fort impact */}
      {news.length > 0 && (
        <div className="card">
          <h2 className="font-cormorant text-xl mb-4 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-gold" /> Actualités susceptibles d'affecter votre DIP
          </h2>
          <div className="space-y-2">
            {news.map(n => (
              <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 bg-bg-elevated rounded-lg px-3 py-2.5 hover:bg-bg-primary transition-colors">
                <div className="min-w-0">
                  <p className="font-dm-sans text-sm text-text-primary truncate">{n.title}</p>
                  {n.impact_reason && <p className="font-dm-sans text-xs text-text-secondary mt-0.5 line-clamp-1">{n.impact_reason}</p>}
                  <p className="font-dm-mono text-xs text-text-muted mt-0.5">
                    {n.source} {n.published_at && '· ' + formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <span className={`font-dm-mono text-xs px-2 py-0.5 rounded flex-shrink-0 ${n.impact_level === 'critical' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                  {n.impact_level === 'critical' ? 'Critique' : 'Élevé'}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {alerts.total === 0 && signatureDelays.count === 0 && news.length === 0 && (
        <div className="card border-success/20 bg-success/5 text-center py-12">
          <ShieldCheck className="w-8 h-8 text-success mx-auto mb-3" />
          <p className="font-cormorant text-xl text-text-primary">Aucun signal de non-conformité actif</p>
          <p className="font-dm-sans text-sm text-text-secondary mt-1">Continuez à tenir votre DIP à jour à chaque changement.</p>
        </div>
      )}
    </div>
  );
}
