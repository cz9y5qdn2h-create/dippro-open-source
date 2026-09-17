import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ConformityGauge from '../components/dashboard/ConformityGauge';
import AlertCard from '../components/dashboard/AlertCard';
import CalModal from '../components/CalModal';
import OnboardingModal from '../components/OnboardingModal';
import AvocatDashboard from '../components/dashboard/AvocatDashboard';
import SectionsBarChart from '../components/dashboard/SectionsBarChart';
import {
  Upload, RefreshCw, FileText,
  AlertTriangle, CheckCircle, History,
  Phone, Sparkles, Users, Download, ChevronRight, Clock, ScrollText, ShieldCheck, ShieldAlert, ShieldX,
  ClipboardCheck, Newspaper,
} from 'lucide-react';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [calOpen, setCalOpen] = useState(false);

  const { data: dipsData, isLoading: dipsLoading, isError: dipsError } = useQuery({
    queryKey: ['dips'],
    queryFn: () => api.get('/dip').then(r => r.data)
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'pending'],
    queryFn: () => api.get('/alerts?status=pending').then(r => r.data),
    retry: false
  });

  const { data: complianceData } = useQuery({
    queryKey: ['compliance-overview'],
    queryFn: () => api.get('/compliance/overview').then(r => r.data),
    enabled: profile?.role !== 'avocat',
    retry: false,
  });

  const dip = dipsData?.dips?.find(d => d.status === 'actif') ?? dipsData?.dips?.[0];
  const pendingAlerts = alertsData?.alerts || [];
  const sections = dip?.dip_sections || [];

  const stats = {
    total: sections.length,
    conforme: sections.filter(s => s.status === 'conforme').length,
    a_verifier: sections.filter(s => s.status === 'a_verifier').length,
    non_conforme: sections.filter(s => s.status === 'non_conforme').length,
  };

  const sectionsToCorrect = stats.non_conforme + stats.a_verifier;

  const aiCorrectionMutation = useMutation({
    mutationFn: () => api.post('/alerts/ai-corrections/' + dip.id, {}, { timeout: 180000 }),
    onSuccess: (res) => {
      const n = res.data.alerts_created;
      if (n > 0) {
        toast.success(`${n} correction(s) IA générée(s) — consultez les Alertes`, { duration: 5000 });
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      } else {
        toast.success(res.data.message || 'Aucune correction nécessaire');
      }
    },
    onError: (err) => toast.error(err.message)
  });

  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  const manualCheckMutation = useMutation({
    mutationFn: () => api.post(`/dip/check/${dip.id}`).then(r => r.data),
    onSuccess: (data) => {
      toast.success('Checkup manuel effectué');
      setLastCheckedAt(data.checked_at);
    },
    onError: (err) => toast.error(err.message || 'Checkup impossible — réessayez'),
  });

  if (profile?.role === 'avocat') return <AvocatDashboard />;

  if (dipsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dipsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-danger/50" />
        <p className="font-cormorant text-xl text-text-primary">Impossible de charger le tableau de bord</p>
        <p className="font-dm-sans text-sm text-text-secondary">Vérifiez votre connexion ou rechargez la page.</p>
        <button onClick={() => window.location.reload()} className="btn-ghost text-sm">Recharger</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('dashboard.greeting', { name: profile?.company_name || 'Franchiseur' })}
        subtitle={t('dashboard.subtitle')}
        action={
          <>
            <Link to="/dip/upload" className="lg-pill-btn">
              <Upload className="w-3 h-3" style={{ opacity: 0.6 }} />
              {dip ? t('dashboard.actions.newVersion') : t('common.import')}
            </Link>
            <Link to="/dip/generate" className="lg-pill-btn">
              <Sparkles className="w-3 h-3" style={{ opacity: 0.6 }} />
              {t('dashboard.actions.generate')}
            </Link>
            <Link to="/contrat/generate" className={`lg-pill-btn ${!dip ? 'opacity-40 pointer-events-none' : ''}`}>
              <ScrollText className="w-3 h-3" style={{ opacity: 0.6 }} />
              {t('dashboard.actions.generateContract')}
            </Link>
            <Link to="/history" className={`lg-pill-btn ${!dip ? 'opacity-40 pointer-events-none' : ''}`}>
              <History className="w-3 h-3" style={{ opacity: 0.6 }} />
              {t('dashboard.actions.history')}
            </Link>
            <button onClick={() => setCalOpen(true)} className="lg-pill-btn lg-pill-btn-gold">
              <Phone className="w-3 h-3" />
              {t('dashboard.actions.contact')}
            </button>
          </>
        }
      />

      {/* Checklist onboarding — visible uniquement si aucun DIP et nouveau compte */}
      {!dip && <OnboardingChecklist />}

      {!dip ? (
        /* État vide */
        <div className="card border-dashed border-border-default text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 mb-6">
            <FileText className="w-8 h-8 text-gold" />
          </div>
          <h2 className="font-cormorant text-2xl text-text-primary mb-3">
            {t('dashboard.noDip.title')}
          </h2>
          <p className="font-dm-sans text-sm text-text-secondary mb-8 max-w-sm mx-auto">
            {t('dashboard.noDip.desc')}
          </p>
          <Link to="/dip/upload" className="btn-liquid-glass inline-flex">
            <Upload className="w-4 h-4" />
            {t('dashboard.noDip.cta')}
          </Link>
        </div>
      ) : (
        <>
          {/* Ligne 1: Score + Statistiques */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 card flex flex-col items-center justify-center py-8 gap-1">
              <ConformityGauge score={dip.conformity_score || 0} />
              <p className="font-dm-sans text-xs text-text-secondary mt-2">Score de conformité Loi Doubin</p>
              <AIDisclaimer className="mt-1" />
              <button
                onClick={() => manualCheckMutation.mutate()}
                disabled={manualCheckMutation.isPending}
                className="btn-ghost flex items-center gap-1.5 text-xs mt-2"
                title="Marque toutes les sections du DIP comme vérifiées à l'instant"
              >
                {manualCheckMutation.isPending ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Checkup manuel
              </button>
              {lastCheckedAt && (
                <p className="font-dm-mono text-[11px] text-text-muted">
                  Vérifié {formatDistanceToNow(new Date(lastCheckedAt), { addSuffix: true, locale: fr })}
                </p>
              )}
            </div>

            <div className="lg:col-span-3">
              <SectionsBarChart
                total={stats.total}
                conforme={stats.conforme}
                a_verifier={stats.a_verifier}
                non_conforme={stats.non_conforme}
              />
            </div>
          </div>

          {/* Bandeau statut légal — visible en permanence */}
          <LegalStatusBanner score={dip.conformity_score || 0} nonConforme={stats.non_conforme} uploadDate={dip.upload_date} />

          {/* Bandeau Corrections IA — visible si sections non conformes */}
          {sectionsToCorrect > 0 && (
            <div className="card lg-alert-gold p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-dm-sans text-sm font-medium text-text-primary">
                      {sectionsToCorrect} {t('dashboard.sectionsToImprove')}
                    </p>
                    <p className="font-dm-sans text-xs text-text-secondary mt-0.5">
                      {t('dashboard.aiCorrectionHint')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => aiCorrectionMutation.mutate()}
                  disabled={aiCorrectionMutation.isPending}
                  className="btn-liquid-glass flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto"
                >
                  {aiCorrectionMutation.isPending ? (
                    <><LoadingSpinner size="sm" /> {t('dashboard.claudeAnalyzing')}</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> {t('dashboard.generateAiCorrections')}</>
                  )}
                </button>
              </div>
              {aiCorrectionMutation.isPending && (
                <p className="font-dm-mono text-xs text-text-muted mt-3">
                  Claude analyse {sectionsToCorrect} section{sectionsToCorrect > 1 ? 's' : ''} — 30 à 90 secondes selon le nombre…
                </p>
              )}
            </div>
          )}

          {/* Ligne 2: Sections + Alertes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <div className="lg-card-header">
                {t('dip.sections')}
                <Link to="/dip" className="lg-card-header-pill">Voir tout</Link>
              </div>
              <div className="space-y-2">
                {sections
                  .sort((a, b) => a.section_number - b.section_number)
                  .map(section => (
                    <SectionRow key={section.id} section={section} />
                  ))}
                {sections.length === 0 && (
                  <p className="text-text-secondary font-dm-sans text-sm py-4 text-center">
                    {t('dashboard.noSections')}
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="lg-card-header">
                <span className="flex items-center gap-2">
                  {t('dashboard.alerts')}
                  {pendingAlerts.length > 0 && (
                    <span className="lg-badge lg-badge-danger">{pendingAlerts.length}</span>
                  )}
                </span>
                <Link to="/alerts" className="lg-card-header-pill">Voir tout</Link>
              </div>

              {alertsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : pendingAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-success/40 mx-auto mb-3" />
                  <p className="font-dm-sans text-sm text-text-secondary">{t('dashboard.noAlerts')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAlerts.slice(0, 4).map(alert => (
                    <AlertCard key={alert.id} alert={alert} compact />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conformité — délai 20 jours, reprises, veille à fort impact */}
          <ComplianceSection data={complianceData} />

          {/* Niveau d'automatisation actif */}
          {profile?.automation_level && (
            <div className="card border-gold/15 bg-gold/3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-cormorant text-xl text-gold">{profile.automation_level}</span>
                </div>
                <div>
                  <p className="font-dm-sans text-sm font-medium text-text-primary">
                    Niveau {profile.automation_level} d'automatisation actif
                  </p>
                  <p className="font-dm-sans text-xs text-text-secondary">
                    {profile.automation_level === 1 && 'Chaque changement doit être approuvé manuellement'}
                    {profile.automation_level === 2 && 'Approbation globale en une action'}
                    {profile.automation_level === 3 && 'Changements appliqués automatiquement après 48h'}
                  </p>
                </div>
                <Link to="/settings" className="ml-auto btn-ghost text-xs py-1.5">
                  Modifier
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-text-secondary text-xs font-dm-mono">
            <Clock className="w-3 h-3" />
            <span>
              {t('dashboard.lastImport')} : {dip.upload_date
                ? formatDistanceToNow(new Date(dip.upload_date), { addSuffix: true, locale: fr })
                : 'N/A'}
            </span>
          </div>
        </>
      )}

      <CalModal open={calOpen} onClose={() => setCalOpen(false)} />
      <OnboardingModal />
    </div>
  );
}

function LegalStatusBanner({ score, nonConforme, uploadDate }) {
  const daysSinceImport = uploadDate
    ? Math.floor((Date.now() - new Date(uploadDate).getTime()) / 86400000)
    : null;

  const outdated = daysSinceImport !== null && daysSinceImport > 365;

  if (nonConforme > 0) {
    return (
      <div className="card border-danger/20 bg-danger/3 flex items-start gap-4 p-5">
        <div className="w-10 h-10 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center flex-shrink-0">
          <ShieldX className="w-5 h-5 text-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-dm-sans text-sm font-medium text-danger">
            Risque légal — {nonConforme} section{nonConforme > 1 ? 's' : ''} non conforme{nonConforme > 1 ? 's' : ''} détectée{nonConforme > 1 ? 's' : ''}
          </p>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Un DIP non conforme peut entraîner la <strong>nullité du contrat de franchise</strong> (Loi Doubin art. L.330-3). Validez les corrections IA ci-dessous ou consultez votre avocat.
          </p>
        </div>
      </div>
    );
  }

  if (outdated) {
    return (
      <div className="card border-gold/20 flex flex-col sm:flex-row sm:items-start gap-4 p-5">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-dm-sans text-sm font-medium text-text-primary">
              DIP importé il y a {daysSinceImport} jours — mise à jour recommandée
            </p>
            <p className="font-dm-sans text-xs text-text-secondary mt-1">
              La Loi Doubin exige que le DIP reflète la situation <em>réelle et actuelle</em> du réseau. Importez une version à jour.
            </p>
          </div>
        </div>
        <Link to="/dip/upload" className="btn-ghost text-xs py-1.5 flex-shrink-0 w-full sm:w-auto text-center">Mettre à jour</Link>
      </div>
    );
  }

  if (score >= 80) {
    return (
      <div className="card border-success/15 flex items-start gap-4 p-5">
        <div className="w-10 h-10 rounded-lg bg-success/10 border border-success/15 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-dm-sans text-sm font-medium text-text-primary">
            Votre DIP est conforme — vos contrats de franchise sont protégés
          </p>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Score {score}% · DIPpro surveille votre conformité en continu. Mettez à jour après chaque changement majeur du réseau.
          </p>
        </div>
        {daysSinceImport !== null && (
          <span className="font-dm-mono text-xs text-text-muted flex-shrink-0">
            Mis à jour il y a {daysSinceImport}j
          </span>
        )}
      </div>
    );
  }

  return null;
}

function ComplianceSection({ data }) {
  if (!data) return null;

  const delays = (data.signature_delays?.items || []).filter(f => !f.signature_delay.compliant);
  const reprises = data.reprises?.items || [];
  const news = data.regulatory_news || [];
  const hasContent = delays.length > 0 || reprises.length > 0 || news.length > 0;

  return (
    <div className="card">
      <div className="lg-card-header">
        <span className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-gold" /> Conformité
          {(delays.length + news.length) > 0 && (
            <span className="lg-badge lg-badge-danger">{delays.length + news.length}</span>
          )}
        </span>
        <Link to="/conformite" className="lg-card-header-pill">Voir tout</Link>
      </div>

      {!hasContent ? (
        <div className="text-center py-8">
          <ShieldCheck className="w-10 h-10 text-success/40 mx-auto mb-3" />
          <p className="font-dm-sans text-sm text-text-secondary">Aucun signal de non-conformité actif</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {delays.length > 0 && (
            <div>
              <p className="font-dm-sans text-xs text-danger font-medium flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" /> Délai 20j non respecté ({delays.length})
              </p>
              <div className="space-y-1.5">
                {delays.slice(0, 3).map(f => (
                  <p key={f.id} className="font-dm-sans text-xs text-text-secondary truncate">{f.name}</p>
                ))}
              </div>
            </div>
          )}
          {reprises.length > 0 && (
            <div>
              <p className="font-dm-sans text-xs text-gold font-medium flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5" /> Reprises en cours ({reprises.length})
              </p>
              <div className="space-y-1.5">
                {reprises.slice(0, 3).map(f => (
                  <p key={f.id} className="font-dm-sans text-xs text-text-secondary truncate">{f.name}</p>
                ))}
              </div>
            </div>
          )}
          {news.length > 0 && (
            <div>
              <p className="font-dm-sans text-xs text-gold font-medium flex items-center gap-1.5 mb-2">
                <Newspaper className="w-3.5 h-3.5" /> Veille à fort impact ({news.length})
              </p>
              <div className="space-y-1.5">
                {news.slice(0, 3).map(n => (
                  <p key={n.id} className="font-dm-sans text-xs text-text-secondary truncate">{n.title}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionRow({ section }) {
  return (
    <div className="lg-row justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-dm-mono text-xs w-6 flex-shrink-0" style={{ color: 'rgb(var(--gold) / 0.50)' }}>{section.section_number}</span>
        <span className="font-dm-sans text-sm text-text-primary truncate">{section.section_title}</span>
      </div>
      <StatusBadge status={section.status} />
    </div>
  );
}

function OnboardingChecklist() {
  const STEPS = [
    { icon: Upload, label: 'Importez votre DIP existant', sub: 'ou générez-en un depuis zéro', to: '/dip/upload', cta: 'Importer' },
    { icon: Sparkles, label: 'Générez un DIP avec l\'IA', sub: 'Formulaire guidé, conforme Loi Doubin', to: '/dip/generate', cta: 'Générer' },
    { icon: Users, label: 'Ajoutez vos franchisés', sub: 'Pour les notifier des mises à jour', to: '/franchisees', cta: 'Ajouter' },
    { icon: Download, label: 'Exportez votre premier rapport', sub: 'PDF de conformité ou DIP en DOCX', to: '/export', cta: 'Exporter' },
  ];
  return (
    <div className="card border-gold/15">
      <div className="lg-card-header">
        Par où commencer
        <span className="lg-card-header-pill">4 étapes</span>
      </div>
      <div className="space-y-2">
        {STEPS.map(({ icon: Icon, label, sub, to, cta }) => (
          <Link key={to} to={to} className="lg-step group">
            <div className="lg-step-num">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-dm-sans text-sm text-text-primary">{label}</p>
              <p className="font-dm-sans text-xs text-text-secondary">{sub}</p>
            </div>
            <span className="font-dm-sans text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {cta} <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
