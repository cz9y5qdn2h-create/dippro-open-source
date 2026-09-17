import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Upload, FileText, X, CheckCircle, AlertCircle, Sparkles,
  ChevronDown, ChevronUp, Check, XCircle, ScrollText
} from 'lucide-react';
import toast from 'react-hot-toast';

const IMPACT_CONFIG = {
  High:     { label: 'Critique', cls: 'impact-high' },
  Moderate: { label: 'Modéré',  cls: 'impact-moderate' },
  Low:      { label: 'Faible',  cls: 'impact-low' }
};

export default function UploadContractPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [file, setFile]   = useState(null);
  const [title, setTitle] = useState('');
  const [step, setStep]   = useState('idle');
  const [stepMsg, setStepMsg] = useState('');
  const [error, setError] = useState('');

  const [comparisonResult, setComparisonResult] = useState(null);
  const [approvedIds, setApprovedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [expandedId, setExpandedId]   = useState(null);
  const [initialResult, setInitialResult] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setTitle(accepted[0].name.replace(/\.(pdf|docx|doc)$/i, ''));
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      if (err?.code === 'file-too-large') toast.error('Fichier trop volumineux (max 50 Mo)');
      else toast.error('Format non supporté. Utilisez PDF ou DOCX.');
    }
  });

  const handleUpload = async () => {
    if (!file) return;
    setError('');

    try {
      setStep('uploading');
      setStepMsg('Upload du fichier vers le stockage sécurisé…');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session expirée, reconnectez-vous.');

      const storage_path = `${session.user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-files')
        .upload(storage_path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        });

      if (uploadError) {
        throw new Error('Upload impossible: ' + uploadError.message);
      }

      const { data: signed } = await supabase.storage
        .from('contract-files')
        .createSignedUrl(storage_path, 3600);

      setStep('analyzing');
      setStepMsg('Claude analyse votre contrat… (30 à 60 secondes)');

      const processRes = await api.post('/contracts/process', {
        storage_path,
        signed_url: signed?.signedUrl,
        title: title || file.name.replace(/\.(pdf|docx|doc)$/i, '')
      }, { timeout: 120000 });

      const data = processRes.data;

      if (data.mode === 'comparison') {
        setComparisonResult(data);
        setStep('report');
      } else {
        setInitialResult(data);
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        setStep('done');
        toast.success(`Contrat analysé — ${data.clauses_count} clauses extraites`);
      }

    } catch (err) {
      setStep('error');
      setError(err.message || 'Erreur inconnue');
    }
  };

  const handleFinalApprove = async () => {
    if (!comparisonResult) return;
    setStep('approving');
    try {
      const approved = comparisonResult.changements.filter(c => approvedIds.has(c.id));
      await api.post('/contracts/approve-changes', {
        draft_contract_id:    comparisonResult.draft_contract_id,
        previous_contract_id: comparisonResult.previous_contract_id,
        approved_changes:     approved
      });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setStep('done');
      toast.success('Nouvelle version du contrat activée avec succès');
    } catch (err) {
      setStep('error');
      setError(err.message);
    }
  };

  const toggleApprove = (id) => {
    setApprovedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    setRejectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleReject = (id) => {
    setRejectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    setApprovedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const approveAll = () => {
    setApprovedIds(new Set(comparisonResult.changements.map(c => c.id)));
    setRejectedIds(new Set());
  };

  const reset = () => {
    setFile(null); setTitle(''); setStep('idle'); setError(''); setStepMsg('');
    setComparisonResult(null); setInitialResult(null);
    setApprovedIds(new Set()); setRejectedIds(new Set());
  };

  const formatSize = (b) => b < 1048576 ? `${(b/1024).toFixed(0)} Ko` : `${(b/1048576).toFixed(1)} Mo`;

  /* ── Chargement ── */
  if (step === 'uploading' || step === 'analyzing' || step === 'approving') {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 mb-6 animate-glow">
          {step === 'analyzing'
            ? <Sparkles className="w-8 h-8 text-gold animate-pulse" />
            : <LoadingSpinner size="md" />
          }
        </div>
        <p className="font-cormorant text-2xl text-text-primary mb-2">
          {step === 'uploading' ? 'Upload en cours…'
            : step === 'analyzing' ? 'Analyse IA en cours…'
            : 'Activation en cours…'}
        </p>
        <p className="font-dm-sans text-sm text-text-secondary">{stepMsg}</p>
        {step === 'analyzing' && (
          <div className="w-48 h-1 bg-bg-elevated rounded-full mx-auto mt-6 overflow-hidden">
            <div className="h-full bg-gold rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    );
  }

  /* ── Succès ── */
  if (step === 'done') {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <PageHeader title="Analyse terminée" subtitle="Votre contrat a été traité avec succès" />

        <div className="card border-success/30">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-dm-sans text-sm font-medium text-text-primary">
                {comparisonResult ? 'Nouvelle version activée' : 'Contrat analysé et enregistré'}
              </p>
              <p className="font-dm-mono text-xs text-text-secondary">
                {comparisonResult
                  ? `${approvedIds.size} changement(s) approuvé(s) sur ${comparisonResult.changements.length}`
                  : `${initialResult?.clauses_count} clauses · Score ${initialResult?.conformity_score}%`}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('/contrat')} className="btn-liquid-glass flex-1">
              <CheckCircle className="w-4 h-4" /> Consulter le contrat
            </button>
            <button onClick={reset} className="btn-secondary">Importer un autre</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Rapport de comparaison ── */
  if (step === 'report' && comparisonResult) {
    const changements = comparisonResult.changements || [];
    const critiques = changements.filter(c => c.impact_legal === 'High').length;
    const pendingDecision = changements.filter(c => !approvedIds.has(c.id) && !rejectedIds.has(c.id)).length;

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <PageHeader title="Rapport des changements" subtitle={comparisonResult.resume} />

        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center py-4">
            <p className="font-cormorant text-xl sm:text-3xl text-text-primary">{changements.length}</p>
            <p className="font-dm-sans text-xs text-text-secondary">Changements</p>
          </div>
          <div className="card text-center py-4">
            <p className="font-cormorant text-xl sm:text-3xl text-danger">{critiques}</p>
            <p className="font-dm-sans text-xs text-text-secondary">Impact critique</p>
          </div>
          <div className="card text-center py-4">
            <p className="font-cormorant text-xl sm:text-3xl text-gold">{approvedIds.size}</p>
            <p className="font-dm-sans text-xs text-text-secondary">Approuvés</p>
          </div>
        </div>

        {changements.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-10 h-10 text-success/40 mx-auto mb-3" />
            <p className="font-cormorant text-xl text-text-primary">Aucun changement significatif détecté</p>
            <p className="font-dm-sans text-sm text-text-secondary mt-2">Les deux versions du contrat sont identiques.</p>
            <button onClick={() => navigate('/contrat')} className="btn-liquid-glass mt-6">Retour au contrat</button>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <button onClick={approveAll} className="btn-secondary text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> Tout approuver
              </button>
            </div>

            <div className="space-y-3">
              {changements.map((c) => {
                const impact = IMPACT_CONFIG[c.impact_legal] || IMPACT_CONFIG.Low;
                const isApproved = approvedIds.has(c.id);
                const isRejected = rejectedIds.has(c.id);
                const isExpanded = expandedId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`card transition-all duration-200 ${
                      isApproved ? 'border-success/30 bg-success/3'
                      : isRejected ? 'border-danger/20 bg-danger/3'
                      : 'border-border-default'
                    }`}
                  >
                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-dm-mono text-xs text-gold/60">§{c.clause_number}</span>
                          <span className="font-dm-sans text-sm font-medium text-text-primary">{c.clause}</span>
                          <span className={impact.cls}>{impact.label}</span>
                          {isApproved && <span className="text-xs font-dm-mono text-success">✓ Approuvé</span>}
                          {isRejected && <span className="text-xs font-dm-mono text-danger">✗ Rejeté</span>}
                        </div>
                        <p className="font-dm-sans text-xs text-text-secondary capitalize">
                          {c.type?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-text-secondary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <div className="bg-danger/5 border border-danger/15 rounded p-3">
                        <p className="font-dm-mono text-xs text-danger mb-1">Avant</p>
                        <p className="font-dm-sans text-sm text-text-primary">{c.ancien || '—'}</p>
                      </div>
                      <div className="bg-success/5 border border-success/15 rounded p-3">
                        <p className="font-dm-mono text-xs text-success mb-1">Après</p>
                        <p className="font-dm-sans text-sm text-text-primary">{c.nouveau || '—'}</p>
                      </div>
                    </div>

                    {isExpanded && c.recommandation_ia && (
                      <div className="mt-4 bg-gold/5 border border-gold/20 rounded p-3 animate-slide-up">
                        <p className="font-dm-mono text-xs text-gold mb-2">Recommandation IA</p>
                        <p className="font-dm-sans text-sm text-text-primary leading-relaxed">{c.recommandation_ia}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
                      <button
                        onClick={() => toggleApprove(c.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-dm-sans transition-all border ${
                          isApproved ? 'bg-success/15 border-success/40 text-success' : 'border-border-subtle text-text-secondary hover:border-success/40 hover:text-success'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Approuver
                      </button>
                      <button
                        onClick={() => toggleReject(c.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-dm-sans transition-all border ${
                          isRejected ? 'bg-danger/10 border-danger/30 text-danger' : 'border-border-subtle text-text-secondary hover:border-danger/30 hover:text-danger'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-6 card border-border-default bg-bg-card/90 backdrop-blur-sm shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="font-dm-sans text-sm text-text-secondary">
                    {approvedIds.size} approuvé(s) · {rejectedIds.size} rejeté(s) · {pendingDecision} en attente
                  </p>
                </div>
                <button
                  onClick={handleFinalApprove}
                  disabled={approvedIds.size === 0 && rejectedIds.size === 0}
                  className="btn-liquid-glass-prominent flex-shrink-0 w-full sm:w-auto justify-center"
                >
                  <CheckCircle className="w-4 h-4" /> Valider la nouvelle version
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Formulaire d'upload ── */
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <PageHeader
        title="Importer un contrat"
        subtitle="Uploadez votre contrat de franchise au format PDF ou DOCX. L'IA détecte automatiquement les changements par rapport à la version précédente."
      />

      <div className="space-y-5">
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-lg p-6 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'border-gold bg-gold/5'
            : file ? 'border-success/40 bg-success/3'
            : 'border-border-default hover:border-gold hover:bg-gold/3'
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-success/10 border border-success/20">
                <ScrollText className="w-7 h-7 text-success" />
              </div>
              <div>
                <p className="font-dm-sans text-sm font-medium text-text-primary">{file.name}</p>
                <p className="font-dm-mono text-xs text-text-secondary">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-danger transition-colors"
              >
                <X className="w-3 h-3" /> Changer de fichier
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-gold/10 border border-gold/20">
                <Upload className="w-7 h-7 text-gold" />
              </div>
              <div>
                <p className="font-dm-sans text-sm font-medium text-text-primary">
                  {isDragActive ? 'Déposez ici' : 'Glissez-déposez votre contrat'}
                </p>
                <p className="font-dm-sans text-xs text-text-secondary mt-1">PDF ou DOCX, jusqu'à 50 Mo</p>
              </div>
              <span className="inline-block font-dm-sans text-xs text-gold border border-gold/30 rounded px-3 py-1">
                Parcourir les fichiers
              </span>
            </div>
          )}
        </div>

        {file && (
          <div className="animate-slide-up">
            <label className="label">Titre du document</label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contrat de franchise 2025"
            />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 text-danger rounded p-4 text-sm font-dm-sans">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">Erreur lors de l'analyse</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
            <button onClick={() => { setStep('idle'); setError(''); }} className="underline text-xs flex-shrink-0">
              Réessayer
            </button>
          </div>
        )}

        {file && step === 'idle' && (
          <button onClick={handleUpload} className="btn-liquid-glass-prominent w-full">
            <Sparkles className="w-4 h-4" />
            Analyser avec l'IA
          </button>
        )}

        <div className="bg-gold/5 border border-gold/20 rounded p-4">
          <p className="font-dm-mono text-xs text-gold mb-2">Comment ça fonctionne</p>
          <ol className="space-y-1.5">
            {[
              'Le fichier est uploadé directement vers le stockage sécurisé Supabase',
              'L\'IA Claude extrait le texte et l\'analyse clause par clause',
              'Si un contrat existe déjà, Claude compare les deux versions et détecte les changements',
              'Si le contrat est lié à un DIP, toute incohérence créée est signalée par une alerte d\'impact croisé',
              'Vous approuvez ou rejetez chaque changement avant l\'activation de la nouvelle version'
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2 font-dm-sans text-xs text-text-secondary">
                <span className="font-dm-mono text-gold/60 flex-shrink-0">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
