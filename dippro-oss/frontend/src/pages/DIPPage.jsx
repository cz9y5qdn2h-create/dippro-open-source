import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import {
  Upload,
  Sparkles, Download, FileText, Plus, Trash2, AlertCircle,
  Share2, Copy, Link2Off, Eye, BarChart2, Briefcase, Send,
  Scale, ShieldAlert, ShieldCheck, Info, RotateCcw, Clock, Archive
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProposalsPanel from '../components/ProposalsPanel';
import DocumentSection from '../components/document/DocumentSection';
import PositionPill from '../components/document/PositionPill';
import SignaturePad from '../components/document/SignaturePad';
import { useSectionScrollTracking } from '../lib/useSectionScrollTracking';

const SECTION_DESCRIPTIONS = [
  '',
  'Raison sociale, forme juridique, capital, dirigeants, RCS, adresse du siège social.',
  'Date de création de l\'enseigne, historique du dirigeant sur les 5 dernières années.',
  'Nombre de franchisés, implantations, ouvertures et fermetures des 2 dernières années.',
  'Comptes annuels des 2 derniers exercices (bilan, compte de résultat).',
  'Marques déposées, brevets, savoir-faire protégé, durée de protection.',
  'Droits d\'entrée, redevances, CA moyen des franchisés, tableaux financiers.',
  'Zone d\'exclusivité territoriale, conditions de modification.',
  'Durée du contrat, conditions de renouvellement et de résiliation.',
  'Litiges en cours et survenus dans les 5 dernières années.',
  'Comptes prévisionnels d\'un point de vente type.'
];

const STEPS = [
  { id: 1, label: 'Identité & Historique', desc: 'Sections 1–2' },
  { id: 2, label: 'Réseau & Comptes',      desc: 'Sections 3–4' },
  { id: 3, label: 'Marque, Finances & Contrat', desc: 'Sections 5–9' },
  { id: 4, label: 'Prévisionnels',          desc: 'Section 10' },
];

const emptyForm = () => ({
  identite: { raison_sociale: '', forme_juridique: 'SAS', capital: '', rcs_numero: '', rcs_ville: '', siege_social: '', dirigeants: [{ nom: '', fonction: 'Président' }] },
  historique: { date_creation_societe: '', date_creation_enseigne: '', parcours_dirigeant: '' },
  reseau: { nb_franchises: '', nb_succursales: '', ouvertures_12mois: '', fermetures_12mois: '' },
  comptes: { exercice_n1: { annee: new Date().getFullYear() - 1, ca: '', resultat: '' }, exercice_n2: { annee: new Date().getFullYear() - 2, ca: '', resultat: '' } },
  marque: { nom_marque: '', inpi_numero: '', inpi_date: '', territoire: 'France' },
  financier: { droit_entree: '', redevance_exploitation_pct: '', redevance_publicitaire_pct: '', investissement_total: '' },
  territoire: { type_exclusivite: 'exclusive', description: '', perimetre_km: '' },
  contrat: { duree_ans: '', renouvellement: '', resiliation_conditions: '' },
  litiges: { attestation_absence: true, details: '' },
  previsionnels: { an1: { ca: '', charges: '' }, an2: { ca: '', charges: '' }, an3: { ca: '', charges: '' }, hypotheses: '' },
});

export default function DIPPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [tab, setTab] = useState('view');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyForm());
  const [generating, setGenerating] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [importingXlsx, setImportingXlsx] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [lawyerEmail, setLawyerEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [litigationData, setLitigationData] = useState(null);

  const litigationMutation = useMutation({
    mutationFn: (dipId) => api.post(`/dip/${dipId}/litigation-risks`).then(r => r.data),
    onSuccess: (data) => setLitigationData(data.litigation_risks),
    onError: (err) => toast.error(err.message || 'Analyse impossible — réessayez'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['dips'],
    queryFn: () => api.get('/dip').then(r => r.data),
  });

  const { data: allDipsData } = useQuery({
    queryKey: ['dips-all'],
    queryFn: () => api.get('/dip?all=true').then(r => r.data),
  });

  useEffect(() => {
    const activeDip = data?.dips?.find(x => x.status === 'actif') ?? data?.dips?.[0];
    if (activeDip && !lawyerEmail) setLawyerEmail(profile?.lawyer_email || '');
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: ({ dipId, sectionId, content, status }) =>
      api.put(`/dip/${dipId}/sections/${sectionId}`, { content, status }),
    // Le `return` est indispensable : sans lui, react-query résout la
    // mutation avant la fin du rechargement, l'éditeur se referme et
    // réaffiche l'ANCIEN contenu le temps que les données arrivent. Sur un
    // texte long produit par l'assistant IA, ce clignotement se lit comme une
    // sauvegarde qui n'a pas fonctionné — et pousse à ressaisir le texte.
    onSuccess: () => {
      toast.success('Section mise à jour');
      return queryClient.invalidateQueries({ queryKey: ['dips'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const signMutation = useMutation({
    mutationFn: ({ dipId, signature_image, signed_by }) =>
      api.post(`/dip/${dipId}/signature`, { signature_image, signed_by }),
    onSuccess: () => {
      toast.success('Document signé');
      queryClient.invalidateQueries({ queryKey: ['dips'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const clearSignatureMutation = useMutation({
    mutationFn: (dipId) => api.delete(`/dip/${dipId}/signature`),
    onSuccess: () => {
      toast.success('Signature réinitialisée');
      queryClient.invalidateQueries({ queryKey: ['dips'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const dip = data?.dips?.find(d => d.status === 'actif') ?? data?.dips?.[0];
  const sections = dip?.dip_sections?.sort((a, b) => a.section_number - b.section_number) || [];
  const archivedDips = (allDipsData?.dips || []).filter(d => d.status === 'archive');
  const { activeIndex, registerRef } = useSectionScrollTracking(sections);

  const set = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const next = structuredClone(prev);
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/agent/generate', { formData }, { timeout: 180000 });
      toast.success('DIP généré — sauvegarde en cours…');

      const sectionsGenerated = res.data.sections || [];
      if (!dip) {
        const { data: newDip } = await api.post('/dip/create-from-agent', {
          sections: sectionsGenerated,
          global_score: res.data.global_score,
          title: `DIP ${formData.identite.raison_sociale || 'Franchiseur'} — ${new Date().getFullYear()}`,
          company_name: formData.identite.raison_sociale,
        }).catch(() => ({ data: null }));
        if (newDip) toast.success('DIP enregistré avec succès');
      }

      queryClient.invalidateQueries({ queryKey: ['dips'] });
      setTab('view');
      toast.success(`${sectionsGenerated.length} sections générées — score ${res.data.global_score}%`);
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!dip) return;
    setShareLoading(true);
    try {
      const res = await api.post(`/dip/${dip.id}/share-link`);
      queryClient.invalidateQueries({ queryKey: ['dips'] });
      toast.success('Lien de partage généré');
      return res.data;
    } catch (err) {
      toast.error(err.message || 'Impossible de générer le lien');
    } finally {
      setShareLoading(false);
    }
  };

  const handleInviteAvocat = async () => {
    if (!lawyerEmail.trim()) return;
    setInviteLoading(true);
    try {
      await api.post('/avocat/invite', { lawyer_email: lawyerEmail.trim() });
      toast.success(`Invitation envoyée à ${lawyerEmail.trim()}`);
    } catch (err) {
      toast.error(err.message || 'Impossible d\'envoyer l\'invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!dip) return;
    setShareLoading(true);
    try {
      await api.delete(`/dip/${dip.id}/share-link`);
      queryClient.invalidateQueries({ queryKey: ['dips'] });
      toast.success('Lien révoqué — les franchisés n\'y ont plus accès');
    } catch (err) {
      toast.error(err.message || 'Impossible de révoquer le lien');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!dip?.share_token) return;
    const url = `${window.location.origin}/dip/partage/${dip.share_token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Lien copié dans le presse-papiers'));
  };

  const handleDownloadPdf = async () => {
    if (!dip) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/export/${dip.id}/document-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DIP_${(profile?.company_name || 'Franchiseur').replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) {
      toast.error(err.message || 'Impossible de générer le PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadXlsx = async () => {
    if (!dip) return;
    setDownloadingXlsx(true);
    try {
      const res = await api.get(`/export/${dip.id}/xlsx`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DIP_${(profile?.company_name || 'Franchiseur').replace(/[^a-z0-9]/gi, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel téléchargé');
    } catch (err) {
      toast.error(err.message || 'Impossible de générer le fichier Excel');
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const handleImportXlsx = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !dip) return;
    setImportingXlsx(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/export/${dip.id}/import-xlsx`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${res.data.updated} section(s) mises à jour depuis l'Excel`);
      queryClient.invalidateQueries({ queryKey: ['dips'] });
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'import Excel');
    } finally {
      setImportingXlsx(false);
      e.target.value = '';
    }
  };

  const handleDownloadDocx = async () => {
    if (!dip) return;
    setDownloadingDocx(true);
    try {
      const res = await api.post('/agent/docx', {
        sections: { sections, global_score: dip.conformity_score, summary: dip.title },
        companyName: profile?.company_name || dip.title
      }, { responseType: 'blob', timeout: 60000 });

      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DIP_${(profile?.company_name || 'Franchiseur').replace(/[^a-z0-9]/gi, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DOCX téléchargé');
    } catch (err) {
      toast.error('Impossible de générer le DOCX');
    } finally {
      setDownloadingDocx(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  if (!dip && tab === 'view') {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        <PageHeader title="Mon DIP" subtitle="Importez ou générez votre Document d'Information Précontractuelle" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/dip/upload" className="card hover:border-gold/40 transition-all cursor-pointer group text-center py-8">
            <Upload className="w-8 h-8 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-dm-sans text-sm font-medium text-text-primary">Importer un DIP</p>
            <p className="font-dm-sans text-xs text-text-secondary mt-1">PDF ou DOCX existant</p>
          </Link>
          <button onClick={() => setTab('generate')} className="card hover:border-gold/40 transition-all cursor-pointer group text-center py-8">
            <Sparkles className="w-8 h-8 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-dm-sans text-sm font-medium text-text-primary">Générer avec l'IA</p>
            <p className="font-dm-sans text-xs text-text-secondary mt-1">Remplir un formulaire</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={dip?.title || 'Mon DIP'}
        subtitle={dip ? `Score de conformité : ${dip.conformity_score}% • ${sections.length} sections` : 'Générer votre DIP'}
        action={
          dip && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {downloadingPdf ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                PDF
              </button>
              <button
                onClick={handleDownloadDocx}
                disabled={downloadingDocx}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {downloadingDocx ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                DOCX
              </button>
              <button
                onClick={handleDownloadXlsx}
                disabled={downloadingXlsx}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {downloadingXlsx ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                Excel
              </button>
              <label className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
                {importingXlsx ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                Import Excel
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleImportXlsx}
                  disabled={importingXlsx}
                  className="sr-only"
                />
              </label>
              <button
                onClick={() => setShowSharePanel(v => !v)}
                className={`btn-secondary flex items-center gap-2 text-sm ${showSharePanel ? 'border-gold/40 text-gold' : ''}`}
              >
                <Share2 className="w-4 h-4" />
                Partager
                {dip.share_token && (
                  <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" title="Lien actif" />
                )}
              </button>
              <Link to={`/analytics/dip/${dip.id}`} className="btn-secondary flex items-center gap-2 text-sm">
                <BarChart2 className="w-4 h-4" /> Analytics
              </Link>
              <Link to="/dip/upload" className="btn-secondary flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4" /> Mettre à jour
              </Link>
            </div>
          )
        }
      />

      {/* Panneau de partage franchisés */}
      {showSharePanel && (
        <div className="card border-gold/20 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="w-4 h-4 text-gold" />
            <p className="font-dm-sans text-sm font-medium text-text-primary">Portail franchisé — partage sécurisé</p>
          </div>
          <p className="font-dm-sans text-xs text-text-secondary mb-4">
            Générez un lien unique pour permettre à vos franchisés de consulter ce DIP en lecture seule, sans créer de compte.
            Vous pouvez révoquer l'accès à tout moment.
          </p>

          {/* Partage avocat */}
          <div className="mt-5 pt-5 border-t border-border-subtle">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-gold" />
              <p className="font-dm-sans text-sm font-medium text-text-primary">Partager avec votre avocat</p>
            </div>
            <p className="font-dm-sans text-xs text-text-secondary mb-3">
              Invitez votre avocat à consulter et annoter ce DIP directement dans DIPpro — il pourra proposer des modifications section par section.
            </p>
            <div className="flex gap-2">
              <input
                className="input-field text-sm flex-1 py-2"
                type="email"
                placeholder="avocat@cabinet.fr"
                value={lawyerEmail}
                onChange={e => setLawyerEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInviteAvocat()}
              />
              <button
                onClick={handleInviteAvocat}
                disabled={inviteLoading || !lawyerEmail.trim()}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-3 whitespace-nowrap"
              >
                {inviteLoading ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Inviter
              </button>
            </div>
          </div>

          {dip.share_token ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2">
                <Link2Off className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                <span className="font-dm-mono text-xs text-text-primary truncate flex-1">
                  {window.location.origin}/dip/partage/{dip.share_token}
                </span>
                <button onClick={handleCopyShareLink} className="btn-ghost p-1 flex-shrink-0" title="Copier le lien">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-dm-sans text-xs text-text-secondary">
                  <Eye className="w-3.5 h-3.5" />
                  {dip.share_token_views || 0} consultation{(dip.share_token_views || 0) !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopyShareLink} className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3">
                    <Copy className="w-3.5 h-3.5" /> Copier le lien
                  </button>
                  <button
                    onClick={handleRevokeShareLink}
                    disabled={shareLoading}
                    className="btn-ghost flex items-center gap-2 text-xs text-danger hover:text-danger/80"
                  >
                    {shareLoading ? <LoadingSpinner size="sm" /> : <Link2Off className="w-3.5 h-3.5" />}
                    Révoquer l'accès
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateShareLink}
              disabled={shareLoading}
              className="btn-liquid-glass-prominent flex items-center gap-2 text-sm"
            >
              {shareLoading ? <LoadingSpinner size="sm" /> : <Share2 className="w-4 h-4" />}
              Générer le lien de partage
            </button>
          )}
        </div>
      )}

      {/* Panel propositions avocat — visible uniquement pour le franchiseur */}
      {dip && <ProposalsPanel target={{ type: 'dip', id: dip.id }} />}

      {dip && <AIDisclaimer />}

      {/* Onglets */}
      <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 w-full sm:w-fit">
        <button
          onClick={() => setTab('view')}
          className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded text-sm font-dm-sans transition-all ${
            tab === 'view' ? 'bg-gold/20 text-gold font-medium' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="flex items-center justify-center gap-2"><FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Vue DIP</span></span>
        </button>
        <button
          onClick={() => setTab('risks')}
          className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded text-sm font-dm-sans transition-all ${
            tab === 'risks' ? 'bg-danger/15 text-danger font-medium' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="flex items-center justify-center gap-2"><Scale className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Risques juridiques</span></span>
        </button>
        <button
          onClick={() => setTab('generate')}
          className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded text-sm font-dm-sans transition-all ${
            tab === 'generate' ? 'bg-gold/20 text-gold font-medium' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="flex items-center justify-center gap-2"><Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Générer avec l'IA</span></span>
        </button>
      </div>

      {/* ── Onglet Vue DIP ─────────────────────────────────────────── */}
      {tab === 'view' && dip && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-dm-sans text-sm text-text-secondary">Conformité globale</span>
              <span className="font-dm-mono text-sm text-gold">{dip.conformity_score}%</span>
            </div>
            <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${dip.conformity_score}%` }} />
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-6 mt-4">
              {[
                { label: 'Conformes', key: 'conforme', color: 'text-success' },
                { label: 'À vérifier', key: 'a_verifier', color: 'text-warning' },
                { label: 'Non conformes', key: 'non_conforme', color: 'text-danger' },
              ].map(({ label, key, color }) => (
                <div key={key}>
                  <p className={`font-cormorant text-2xl ${color}`}>{sections.filter(s => s.status === key).length}</p>
                  <p className="font-dm-sans text-xs text-text-secondary">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {sections.map(section => (
              <DocumentSection
                key={section.id}
                id={section.id}
                number={section.section_number}
                title={section.section_title}
                status={section.status}
                content={section.content}
                lastUpdated={section.last_updated}
                description={SECTION_DESCRIPTIONS[section.section_number] || ''}
                aiAssistPath={`/dip/${dip.id}/sections/${section.id}/ai-assist`}
                onSave={(content, status) => updateMutation.mutateAsync({ dipId: dip.id, sectionId: section.id, content, status })}
                isSaving={updateMutation.isPending}
                registerRef={registerRef}
              />
            ))}
          </div>

          {/* Case signature */}
          <div className="card">
            <p className="font-cormorant text-xl text-text-primary mb-1">Signature</p>
            <p className="font-dm-sans text-xs text-text-secondary mb-4">
              Signature du représentant du franchiseur — horodatée, associée à cette version du document.
            </p>
            <SignaturePad
              signature={dip}
              isSaving={signMutation.isPending}
              isClearing={clearSignatureMutation.isPending}
              onSign={(signature_image, signed_by) => signMutation.mutate({ dipId: dip.id, signature_image, signed_by })}
              onClear={() => clearSignatureMutation.mutate(dip.id)}
            />
          </div>

          <PositionPill
            index={activeIndex}
            total={sections.length}
            label={sections[activeIndex]?.section_title}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Versions précédentes */}
          {archivedDips.length > 0 && (
            <div className="mt-6">
              <p className="font-dm-sans text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Archive className="w-3.5 h-3.5" />
                Versions précédentes ({archivedDips.length})
              </p>
              <div className="space-y-2">
                {archivedDips.map(d => (
                  <div key={d.id} className="lg-row justify-between gap-3 opacity-70">
                    <div className="flex items-center gap-3 min-w-0">
                      <Archive className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="font-dm-sans text-sm text-text-secondary truncate">{d.title}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-dm-mono text-xs text-text-muted">{d.conformity_score}%</span>
                      {d.upload_date && (
                        <span className="font-dm-sans text-xs text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(d.upload_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs font-dm-sans bg-bg-elevated text-text-muted border border-border-subtle">Archivé</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Onglet Risques juridiques ──────────────────────────────── */}
      {tab === 'risks' && dip && (() => {
        const RISK_TYPE_LABELS = {
          nullite_consentement:        'Nullité du contrat (vice du consentement)',
          responsabilite_precontractuelle: 'Responsabilité précontractuelle',
          dol_previsionnel:            'Dol sur prévisionnels',
          desequilibre_significatif:   'Déséquilibre significatif',
          rupture_brutale:             'Rupture brutale de relations établies',
          ordre_public_l330_3:         'Nullité d\'ordre public (L330-3)',
        };
        const SEV = {
          critique: { ring: 'border-danger/30 bg-danger/5',  badge: 'bg-danger/15 text-danger',       label: 'Critique', icon: <ShieldAlert className="w-4 h-4 text-danger flex-shrink-0" /> },
          eleve:    { ring: 'border-orange-500/30 bg-orange-500/5', badge: 'bg-orange-500/15 text-orange-400', label: 'Élevé',    icon: <ShieldAlert className="w-4 h-4 text-orange-400 flex-shrink-0" /> },
          modere:   { ring: 'border-gold/30 bg-gold/5',      badge: 'bg-gold/15 text-gold',           label: 'Modéré',   icon: <Info className="w-4 h-4 text-gold flex-shrink-0" /> },
        };
        const OVERALL = {
          CRITIQUE: { label: 'Risque critique', color: 'text-danger',       bg: 'bg-danger/10',       border: 'border-danger/30' },
          ELEVE:    { label: 'Risque élevé',    color: 'text-orange-400',   bg: 'bg-orange-500/10',   border: 'border-orange-500/30' },
          MODERE:   { label: 'Risque modéré',   color: 'text-gold',         bg: 'bg-gold/10',         border: 'border-gold/30' },
          FAIBLE:   { label: 'Risque faible',   color: 'text-success',      bg: 'bg-success/10',      border: 'border-success/30' },
        };
        const ld = litigationData;
        const isLoading = litigationMutation.isPending;
        const overall = ld ? (OVERALL[ld.overall_risk] || OVERALL.MODERE) : null;

        return (
          <div className="space-y-5">
            {!ld && !isLoading && (
              <div className="card text-center py-14 space-y-4">
                <Scale className="w-12 h-12 text-text-muted mx-auto" />
                <div>
                  <p className="font-cormorant text-2xl text-text-primary">Analyse des risques de litiges</p>
                  <p className="font-dm-sans text-sm text-text-secondary mt-2 max-w-md mx-auto">
                    Identifie, pour chaque lacune du DIP, la forme de litige que le franchisé pourrait engager
                    (nullité, dol, responsabilité…) avec les articles et jurisprudences applicables.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 text-xs text-text-muted font-dm-sans">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" />Nullité du contrat</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Responsabilité précontractuelle</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold inline-block" />Déséquilibre significatif</span>
                </div>
                <button
                  onClick={() => litigationMutation.mutate(dip.id)}
                  className="btn-liquid-glass-prominent flex items-center gap-2 mx-auto"
                >
                  <Scale className="w-4 h-4" /> Lancer l'analyse juridique
                </button>
              </div>
            )}

            {isLoading && (
              <div className="card text-center py-14 space-y-3">
                <Scale className="w-12 h-12 text-danger/60 animate-pulse mx-auto" />
                <p className="font-cormorant text-2xl text-text-primary">Analyse des risques en cours…</p>
                <p className="font-dm-sans text-sm text-text-secondary">Claude Opus examine chaque section selon la jurisprudence Loi Doubin</p>
                <div className="w-48 h-1 bg-bg-elevated rounded-full mx-auto overflow-hidden mt-2">
                  <div className="h-full bg-danger/60 rounded-full animate-pulse" style={{ width: '65%' }} />
                </div>
              </div>
            )}

            {ld && !isLoading && (
              <>
                {/* Bannière risque global */}
                <div className={`card ${overall.bg} ${overall.border} border`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${overall.bg} border ${overall.border} flex-shrink-0`}>
                        <span className={`font-dm-mono text-xl font-bold ${overall.color}`}>{ld.risk_score}</span>
                      </div>
                      <div>
                        <p className={`font-cormorant text-xl font-medium ${overall.color}`}>{overall.label}</p>
                        <p className="font-dm-sans text-xs text-text-secondary mt-0.5">
                          {ld.risks.length} risque{ld.risks.length > 1 ? 's' : ''} identifié{ld.risks.length > 1 ? 's' : ''}
                          {ld.coherence_issues.length > 0 && ` · ${ld.coherence_issues.length} incohérence${ld.coherence_issues.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setLitigationData(null); litigationMutation.mutate(dip.id); }}
                      className="btn-ghost flex items-center gap-2 text-xs text-text-muted"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Relancer
                    </button>
                  </div>
                  {ld.risk_score === 0 && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-success/20">
                      <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
                      <p className="font-dm-sans text-sm text-success">Aucun risque de litige significatif détecté sur ce DIP.</p>
                    </div>
                  )}
                </div>

                {/* Risques par section */}
                {ld.risks.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-dm-sans text-xs text-text-muted uppercase tracking-wider">Risques par section</p>
                    {ld.risks.map((r, i) => {
                      const sev = SEV[r.severity] || SEV.modere;
                      return (
                        <div key={i} className={`card border ${sev.ring} space-y-3`}>
                          <div className="flex items-start gap-3">
                            {sev.icon}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-dm-sans font-medium ${sev.badge}`}>{sev.label}</span>
                                <span className="font-dm-sans text-xs text-text-muted">Section {r.section_number} — {r.section_title}</span>
                              </div>
                              <p className="font-dm-sans text-sm font-medium text-text-primary mt-1">{r.risk_label || RISK_TYPE_LABELS[r.risk_type] || r.risk_type}</p>
                              <p className="font-dm-sans text-sm text-text-secondary mt-1">{r.description}</p>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-border-subtle">
                            <div>
                              <p className="font-dm-sans text-xs text-text-muted mb-1">Base légale</p>
                              <p className="font-dm-mono text-xs text-text-primary">{r.legal_basis}</p>
                              {r.jurisprudence && <p className="font-dm-sans text-xs text-text-secondary mt-0.5 italic">{r.jurisprudence}</p>}
                            </div>
                            <div>
                              <p className="font-dm-sans text-xs text-text-muted mb-1">Action recommandée</p>
                              <p className="font-dm-sans text-xs text-text-primary">{r.recommended_action}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Incohérences inter-sections */}
                {ld.coherence_issues.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-dm-sans text-xs text-text-muted uppercase tracking-wider">Incohérences entre sections</p>
                    {ld.coherence_issues.map((issue, i) => {
                      const sev = SEV[issue.severity] || SEV.modere;
                      return (
                        <div key={i} className={`card border ${sev.ring} flex items-start gap-3`}>
                          {sev.icon}
                          <div>
                            <p className="font-dm-sans text-sm text-text-primary">{issue.description}</p>
                            <p className="font-dm-sans text-xs text-text-muted mt-1">
                              Sections concernées : {issue.sections_involved.join(', ')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Analyse prévisionnelle */}
                {(() => {
                  const pa = ld.previsionnel_analysis;
                  const paColor = { critique: 'text-danger border-danger/25 bg-danger/5', eleve: 'text-orange-400 border-orange-500/25 bg-orange-500/5', modere: 'text-gold border-gold/25 bg-gold/5', faible: 'text-success border-success/25 bg-success/5' };
                  return (
                    <div className={`card border ${paColor[pa.risk_level] || paColor.faible}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="w-4 h-4 flex-shrink-0" />
                        <p className="font-dm-sans text-sm font-medium">Section 10 — Analyse prévisionnels (Cass. com. 1er juin 2022)</p>
                      </div>
                      <div className="flex flex-wrap gap-3 mb-2">
                        <span className={`text-xs font-dm-sans px-2 py-0.5 rounded ${pa.has_projections ? 'bg-gold/15 text-gold' : 'bg-bg-elevated text-text-muted'}`}>
                          {pa.has_projections ? 'Prévisionnels présents' : 'Aucun prévisionnel'}
                        </span>
                        {pa.has_projections && (
                          <span className={`text-xs font-dm-sans px-2 py-0.5 rounded ${pa.disclaimer_present ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                            {pa.disclaimer_present ? 'Disclaimer présent ✓' : 'Disclaimer absent — risque de dol'}
                          </span>
                        )}
                      </div>
                      <p className="font-dm-sans text-sm text-text-secondary">{pa.observations}</p>
                    </div>
                  );
                })()}

                {/* Actions recommandées */}
                {ld.recommended_actions.length > 0 && (
                  <div className="card">
                    <p className="font-dm-sans text-xs text-text-muted uppercase tracking-wider mb-3">Actions prioritaires</p>
                    <ul className="space-y-2">
                      {ld.recommended_actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-dm-mono text-xs text-gold mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                          <p className="font-dm-sans text-sm text-text-secondary">{action}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="font-dm-sans text-xs text-text-muted text-center">
                  Analyse basée sur la Loi Doubin (art. L330-3 C. com.), l'art. R.330-1 C. com. (décret n°2023-1394 du 30 décembre 2023) et la jurisprudence de la Cour de cassation.
                  Cette analyse ne constitue pas un avis juridique — consultez un avocat spécialisé franchise.
                </p>
              </>
            )}
          </div>
        );
      })()}

      {/* ── Onglet Générer avec l'IA ───────────────────────────────── */}
      {tab === 'generate' && (
        <div className="space-y-6">
          {generating && (
            <div className="card border-gold/20 text-center py-12">
              <Sparkles className="w-10 h-10 text-gold animate-pulse mx-auto mb-4" />
              <p className="font-cormorant text-2xl text-text-primary">Claude génère votre DIP…</p>
              <p className="font-dm-sans text-sm text-text-secondary mt-2">Analyse juridique en cours (30–60 secondes)</p>
              <div className="w-48 h-1 bg-bg-elevated rounded-full mx-auto mt-6 overflow-hidden">
                <div className="h-full bg-gold rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {!generating && (
            <>
              {/* Stepper */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setStep(s.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-dm-sans transition-all ${
                        step === s.id
                          ? 'bg-gold/20 border border-gold/40 text-gold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        step > s.id ? 'bg-gold text-bg-primary' : step === s.id ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-bg-elevated text-text-secondary'
                      }`}>{step > s.id ? '✓' : s.id}</span>
                      <span className="hidden sm:block">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && <div className="w-4 h-px bg-border-subtle flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <div className="card">
                <p className="font-dm-mono text-xs text-gold mb-4 uppercase tracking-widest">{STEPS[step - 1].label}</p>

                {/* Étape 1 — Identité & Historique */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Raison sociale *" value={formData.identite.raison_sociale} onChange={v => set('identite.raison_sociale', v)} placeholder="PIZZA VILLAGE SAS" />
                      <div>
                        <label className="label">Forme juridique</label>
                        <select className="input-field" value={formData.identite.forme_juridique} onChange={e => set('identite.forme_juridique', e.target.value)}>
                          {['SAS', 'SARL', 'SA', 'SNC', 'EURL', 'SCI', 'EI'].map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Capital (€)" type="number" value={formData.identite.capital} onChange={v => set('identite.capital', v)} placeholder="50000" />
                      <Field label="N° RCS" value={formData.identite.rcs_numero} onChange={v => set('identite.rcs_numero', v)} placeholder="123 456 789" />
                      <Field label="Ville RCS" value={formData.identite.rcs_ville} onChange={v => set('identite.rcs_ville', v)} placeholder="Paris" />
                    </div>
                    <Field label="Siège social (adresse complète)" value={formData.identite.siege_social} onChange={v => set('identite.siege_social', v)} placeholder="123 rue de la Paix, 75001 Paris" />

                    <div className="space-y-2">
                      <label className="label">Dirigeants</label>
                      {formData.identite.dirigeants.map((d, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input className="input-field flex-1" placeholder="Nom Prénom" value={d.nom} onChange={e => { const arr = [...formData.identite.dirigeants]; arr[i].nom = e.target.value; set('identite.dirigeants', arr); }} />
                          <input className="input-field w-36" placeholder="Fonction" value={d.fonction} onChange={e => { const arr = [...formData.identite.dirigeants]; arr[i].fonction = e.target.value; set('identite.dirigeants', arr); }} />
                          {i > 0 && <button onClick={() => set('identite.dirigeants', formData.identite.dirigeants.filter((_, j) => j !== i))} className="text-danger hover:text-danger/70 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      ))}
                      <button onClick={() => set('identite.dirigeants', [...formData.identite.dirigeants, { nom: '', fonction: '' }])} className="btn-ghost text-xs flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> Ajouter un dirigeant
                      </button>
                    </div>

                    <div className="border-t border-border-subtle pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Date création société" type="date" value={formData.historique.date_creation_societe} onChange={v => set('historique.date_creation_societe', v)} />
                      <Field label="Date création enseigne" type="date" value={formData.historique.date_creation_enseigne} onChange={v => set('historique.date_creation_enseigne', v)} />
                    </div>
                    <TextArea label="Parcours du dirigeant (5 ans minimum)" value={formData.historique.parcours_dirigeant} onChange={v => set('historique.parcours_dirigeant', v)} placeholder="2019–2024 : PDG de Pizza Village SAS. Avant : 10 ans dans la restauration rapide dont 5 ans comme directeur régional chez…" rows={4} />
                  </div>
                )}

                {/* Étape 2 — Réseau & Comptes */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="font-dm-sans text-xs text-text-secondary mb-2">État actuel du réseau de franchisés</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Field label="Nb franchisés" type="number" value={formData.reseau.nb_franchises} onChange={v => set('reseau.nb_franchises', v)} placeholder="45" />
                      <Field label="Nb succursales" type="number" value={formData.reseau.nb_succursales} onChange={v => set('reseau.nb_succursales', v)} placeholder="3" />
                      <Field label="Ouvertures (12 mois)" type="number" value={formData.reseau.ouvertures_12mois} onChange={v => set('reseau.ouvertures_12mois', v)} placeholder="5" />
                      <Field label="Fermetures (12 mois)" type="number" value={formData.reseau.fermetures_12mois} onChange={v => set('reseau.fermetures_12mois', v)} placeholder="1" />
                    </div>

                    <div className="border-t border-border-subtle pt-4">
                      <p className="font-dm-sans text-xs text-text-secondary mb-3">Comptes annuels — 2 derniers exercices</p>
                      {[
                        { key: 'exercice_n1', label: `Exercice N-1 (${formData.comptes.exercice_n1.annee})` },
                        { key: 'exercice_n2', label: `Exercice N-2 (${formData.comptes.exercice_n2.annee})` },
                      ].map(({ key, label }) => (
                        <div key={key} className="mb-4">
                          <p className="font-dm-mono text-xs text-gold mb-2">{label}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Field label="Année" type="number" value={formData.comptes[key].annee} onChange={v => set(`comptes.${key}.annee`, v)} />
                            <Field label="CA (€)" type="number" value={formData.comptes[key].ca} onChange={v => set(`comptes.${key}.ca`, v)} placeholder="2 500 000" />
                            <Field label="Résultat net (€)" type="number" value={formData.comptes[key].resultat} onChange={v => set(`comptes.${key}.resultat`, v)} placeholder="180 000" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Étape 3 — Marque, Finances & Contrat */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="font-dm-mono text-xs text-gold uppercase tracking-widest mb-2">Marque & Propriété intellectuelle</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nom de la marque" value={formData.marque.nom_marque} onChange={v => set('marque.nom_marque', v)} placeholder="PIZZA VILLAGE" />
                      <Field label="N° dépôt INPI" value={formData.marque.inpi_numero} onChange={v => set('marque.inpi_numero', v)} placeholder="4234567" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Date dépôt INPI" type="date" value={formData.marque.inpi_date} onChange={v => set('marque.inpi_date', v)} />
                      <Field label="Territoire de protection" value={formData.marque.territoire} onChange={v => set('marque.territoire', v)} placeholder="France, UE" />
                    </div>

                    <div className="border-t border-border-subtle pt-4">
                      <p className="font-dm-mono text-xs text-gold uppercase tracking-widest mb-2">Informations financières</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Field label="Droit d'entrée (€)" type="number" value={formData.financier.droit_entree} onChange={v => set('financier.droit_entree', v)} placeholder="15000" />
                        <Field label="Redevance exploit. (%)" type="number" value={formData.financier.redevance_exploitation_pct} onChange={v => set('financier.redevance_exploitation_pct', v)} placeholder="5" />
                        <Field label="Redevance pub. (%)" type="number" value={formData.financier.redevance_publicitaire_pct} onChange={v => set('financier.redevance_publicitaire_pct', v)} placeholder="2" />
                        <Field label="Investissement total (€)" type="number" value={formData.financier.investissement_total} onChange={v => set('financier.investissement_total', v)} placeholder="120000" />
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-4">
                      <p className="font-dm-mono text-xs text-gold uppercase tracking-widest mb-2">Territoire & Contrat</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="label">Type de territoire</label>
                          <select className="input-field" value={formData.territoire.type_exclusivite} onChange={e => set('territoire.type_exclusivite', e.target.value)}>
                            <option value="exclusive">Zone exclusive</option>
                            <option value="non_exclusive">Zone non exclusive</option>
                          </select>
                        </div>
                        <Field label="Durée du contrat (ans)" type="number" value={formData.contrat.duree_ans} onChange={v => set('contrat.duree_ans', v)} placeholder="7" />
                      </div>
                      <Field label="Description de la zone territoriale" value={formData.territoire.description} onChange={v => set('territoire.description', v)} placeholder="Zone de chalandise de 30 000 habitants autour du point de vente" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <Field label="Conditions de renouvellement" value={formData.contrat.renouvellement} onChange={v => set('contrat.renouvellement', v)} placeholder="Renouvelable par tacite reconduction pour 5 ans" />
                        <Field label="Conditions de résiliation" value={formData.contrat.resiliation_conditions} onChange={v => set('contrat.resiliation_conditions', v)} placeholder="Résiliation possible avec préavis de 6 mois…" />
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-4">
                      <p className="font-dm-mono text-xs text-gold uppercase tracking-widest mb-2">Litiges</p>
                      <label className="flex items-center gap-3 cursor-pointer mb-3">
                        <input type="checkbox" checked={formData.litiges.attestation_absence} onChange={e => set('litiges.attestation_absence', e.target.checked)} className="rounded" />
                        <span className="font-dm-sans text-sm text-text-primary">Attestation d'absence de litige (aucun litige en cours ou passé)</span>
                      </label>
                      {!formData.litiges.attestation_absence && (
                        <TextArea label="Détail des litiges" value={formData.litiges.details} onChange={v => set('litiges.details', v)} placeholder="Procédure en cours devant le TGI de Paris depuis 2023 — demandeur : M. Dupont, franchisé à Lyon…" rows={3} />
                      )}
                    </div>
                  </div>
                )}

                {/* Étape 4 — Prévisionnels */}
                {step === 4 && (
                  <div className="space-y-4">
                    <p className="font-dm-sans text-xs text-text-secondary mb-2">Comptes prévisionnels pour un point de vente type sur 3 ans</p>
                    {[
                      { key: 'an1', label: 'Année 1' },
                      { key: 'an2', label: 'Année 2' },
                      { key: 'an3', label: 'Année 3' },
                    ].map(({ key, label }) => {
                      const ca = Number(formData.previsionnels[key].ca) || 0;
                      const charges = Number(formData.previsionnels[key].charges) || 0;
                      const resultat = ca - charges;
                      return (
                        <div key={key} className="bg-bg-elevated rounded-lg p-4">
                          <p className="font-dm-mono text-xs text-gold mb-3">{label}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Field label="CA prévisionnel (€)" type="number" value={formData.previsionnels[key].ca} onChange={v => set(`previsionnels.${key}.ca`, v)} placeholder="400 000" />
                            <Field label="Charges totales (€)" type="number" value={formData.previsionnels[key].charges} onChange={v => set(`previsionnels.${key}.charges`, v)} placeholder="320 000" />
                            <div>
                              <label className="label">Résultat net</label>
                              <p className={`font-dm-mono text-base mt-2 ${resultat >= 0 ? 'text-success' : 'text-danger'}`}>
                                {resultat >= 0 ? '+' : ''}{resultat.toLocaleString('fr-FR')} €
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <TextArea label="Hypothèses et conditions de réalisation *" value={formData.previsionnels.hypotheses} onChange={v => set('previsionnels.hypotheses', v)} placeholder="Ces projections sont établies sur la base d'un emplacement prime en zone commerciale avec un flux piéton de 5 000 personnes/jour, une équipe de 3 salariés ETP, et un ticket moyen de 12 €…" rows={5} />

                    <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 flex gap-3">
                      <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                      <p className="font-dm-sans text-xs text-text-secondary">Ces prévisionnels sont fournis à titre indicatif. Ils doivent être établis par un expert-comptable pour valeur légale.</p>
                    </div>
                  </div>
                )}

                {/* Navigation stepper */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
                  <button
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1}
                    className="btn-ghost text-sm disabled:opacity-30"
                  >
                    ← Précédent
                  </button>

                  {step < 4 ? (
                    <button onClick={() => setStep(s => Math.min(4, s + 1))} className="btn-liquid-glass text-sm">
                      Suivant →
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={generating || !formData.identite.raison_sociale}
                      className="btn-liquid-glass-prominent flex items-center gap-2 text-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      Générer le DIP avec l'IA
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input-field" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea rows={rows} className="input-field resize-none" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

