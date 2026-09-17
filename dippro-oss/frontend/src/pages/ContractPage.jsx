import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProposalsPanel from '../components/ProposalsPanel';
import DocumentSection from '../components/document/DocumentSection';
import PositionPill from '../components/document/PositionPill';
import SignaturePad from '../components/document/SignaturePad';
import { useSectionScrollTracking } from '../lib/useSectionScrollTracking';
import {
  Upload,
  FileText, Link2, Share2, Copy, Link2Off, Eye, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContractPage() {
  const queryClient = useQueryClient();
  const [shareLoading, setShareLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get('/contracts').then(r => r.data)
  });

  const { data: dipData } = useQuery({
    queryKey: ['dips'],
    queryFn: () => api.get('/dip').then(r => r.data)
  });

  const updateMutation = useMutation({
    mutationFn: ({ contractId, clauseId, content, status }) =>
      api.put(`/contracts/${contractId}/clauses/${clauseId}`, { content, status }),
    // `return` obligatoire — voir le commentaire équivalent dans DIPPage :
    // sans lui l'éditeur se referme sur l'ancien contenu avant l'arrivée des
    // données fraîches, ce qui donne l'illusion d'une sauvegarde perdue.
    onSuccess: () => {
      toast.success('Clause mise à jour');
      return queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const signMutation = useMutation({
    mutationFn: ({ contractId, signature_image, signed_by }) =>
      api.post(`/contracts/${contractId}/signature`, { signature_image, signed_by }),
    onSuccess: () => {
      toast.success('Document signé');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const clearSignatureMutation = useMutation({
    mutationFn: (contractId) => api.delete(`/contracts/${contractId}/signature`),
    onSuccess: () => {
      toast.success('Signature réinitialisée');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const linkMutation = useMutation({
    mutationFn: ({ contractId, dipId }) => api.post(`/contracts/${contractId}/link-dip`, { dip_id: dipId }),
    onSuccess: () => {
      toast.success('Contrat lié au DIP — le tunnel d\'informations est actif');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowLinkPanel(false);
    },
    onError: (err) => toast.error(err.message)
  });

  const contract = data?.contracts?.find(c => c.status === 'actif') ?? data?.contracts?.[0];
  const clauses = contract?.contract_clauses?.sort((a, b) => a.clause_number - b.clause_number) || [];
  const dip = dipData?.dips?.find(d => d.status === 'actif') ?? dipData?.dips?.[0];
  const { activeIndex, registerRef } = useSectionScrollTracking(clauses);

  const handleDownloadPdf = async () => {
    if (!contract) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/contracts/${contract.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrat_${(contract.title || 'franchise').replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) {
      toast.error(err.message || 'Impossible de générer le PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!contract) return;
    setShareLoading(true);
    try {
      await api.post(`/contracts/${contract.id}/share-link`);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Lien de partage généré');
    } catch (err) {
      toast.error(err.message || 'Impossible de générer le lien');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!contract) return;
    setShareLoading(true);
    try {
      await api.delete(`/contracts/${contract.id}/share-link`);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Lien révoqué');
    } catch (err) {
      toast.error(err.message || 'Impossible de révoquer le lien');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!contract?.share_token) return;
    const url = `${window.location.origin}/contrat/partage/${contract.share_token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Lien copié dans le presse-papiers'));
  };

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  if (!contract) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        <PageHeader title="Mon contrat de franchise" subtitle="Importez votre contrat de franchise pour activer le tunnel d'informations avec le DIP" />
        <Link to="/contrat/upload" className="card hover:border-gold/40 transition-all cursor-pointer group text-center py-8 block">
          <Upload className="w-8 h-8 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-dm-sans text-sm font-medium text-text-primary">Importer un contrat</p>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">PDF ou DOCX existant</p>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={contract.title}
        subtitle={`Score de conformité : ${contract.conformity_score}% • ${clauses.length} clauses`}
        action={
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
              onClick={() => setShowLinkPanel(v => !v)}
              className={`btn-secondary flex items-center gap-2 text-sm ${showLinkPanel ? 'border-gold/40 text-gold' : ''}`}
            >
              <Link2 className="w-4 h-4" />
              {contract.linked_dip_id ? 'DIP lié' : 'Lier au DIP'}
              {contract.linked_dip_id && <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />}
            </button>
            <button
              onClick={() => setShowSharePanel(v => !v)}
              className={`btn-secondary flex items-center gap-2 text-sm ${showSharePanel ? 'border-gold/40 text-gold' : ''}`}
            >
              <Share2 className="w-4 h-4" />
              Partager
              {contract.share_token && <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" title="Lien actif" />}
            </button>
            <Link to="/contrat/upload" className="btn-secondary flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> Mettre à jour
            </Link>
          </div>
        }
      />

      {showLinkPanel && (
        <div className="card border-gold/20 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="w-4 h-4 text-gold" />
            <p className="font-dm-sans text-sm font-medium text-text-primary">Tunnel d'informations DIP ↔ Contrat</p>
          </div>
          <p className="font-dm-sans text-xs text-text-secondary mb-4">
            Le DIP doit être remis au franchisé avant la signature du contrat — les deux documents sont juridiquement liés.
            En les reliant, toute modification substantielle de l'un déclenche automatiquement une alerte de cohérence sur l'autre.
          </p>
          {dip ? (
            <div className="flex items-center justify-between bg-bg-elevated rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold/60" />
                <span className="font-dm-sans text-sm text-text-primary">{dip.title}</span>
              </div>
              <button
                onClick={() => linkMutation.mutate({ contractId: contract.id, dipId: dip.id })}
                disabled={linkMutation.isPending || contract.linked_dip_id === dip.id}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {contract.linked_dip_id === dip.id ? 'Déjà lié' : 'Lier ce DIP'}
              </button>
            </div>
          ) : (
            <p className="font-dm-sans text-xs text-text-secondary italic">Aucun DIP actif à lier pour le moment.</p>
          )}
        </div>
      )}

      {showSharePanel && (
        <div className="card border-gold/20 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="w-4 h-4 text-gold" />
            <p className="font-dm-sans text-sm font-medium text-text-primary">Partage sécurisé</p>
          </div>
          {contract.share_token ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2">
                <Link2Off className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                <span className="font-dm-mono text-xs text-text-primary truncate flex-1">
                  {window.location.origin}/contrat/partage/{contract.share_token}
                </span>
                <button onClick={handleCopyShareLink} className="btn-ghost p-1 flex-shrink-0" title="Copier le lien">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-dm-sans text-xs text-text-secondary">
                  <Eye className="w-3.5 h-3.5" />
                  {contract.share_token_views || 0} consultation{(contract.share_token_views || 0) !== 1 ? 's' : ''}
                </div>
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
          ) : (
            <button onClick={handleGenerateShareLink} disabled={shareLoading} className="btn-liquid-glass-prominent flex items-center gap-2 text-sm">
              {shareLoading ? <LoadingSpinner size="sm" /> : <Share2 className="w-4 h-4" />}
              Générer le lien de partage
            </button>
          )}
        </div>
      )}

      <ProposalsPanel target={{ type: 'contract', id: contract.id }} />

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="font-dm-sans text-sm text-text-secondary">Conformité globale</span>
          <span className="font-dm-mono text-sm text-gold">{contract.conformity_score}%</span>
        </div>
        <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${contract.conformity_score}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 sm:gap-6 mt-4">
          {[
            { label: 'Conformes', key: 'conforme', color: 'text-success' },
            { label: 'À vérifier', key: 'a_verifier', color: 'text-warning' },
            { label: 'Non conformes', key: 'non_conforme', color: 'text-danger' },
          ].map(({ label, key, color }) => (
            <div key={key}>
              <p className={`font-cormorant text-2xl ${color}`}>{clauses.filter(c => c.status === key).length}</p>
              <p className="font-dm-sans text-xs text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {clauses.map(clause => (
          <DocumentSection
            key={clause.id}
            id={clause.id}
            number={clause.clause_number}
            title={clause.clause_title}
            status={clause.status}
            content={clause.content}
            lastUpdated={clause.last_updated}
            aiAssistPath={`/contracts/${contract.id}/clauses/${clause.id}/ai-assist`}
            onSave={(content, status) => updateMutation.mutateAsync({ contractId: contract.id, clauseId: clause.id, content, status })}
            isSaving={updateMutation.isPending}
            registerRef={registerRef}
          />
        ))}
      </div>

      {/* Case signature */}
      <div className="card">
        <p className="font-cormorant text-xl text-text-primary mb-1">Signature</p>
        <p className="font-dm-sans text-xs text-text-secondary mb-4">
          Signature du représentant du franchiseur — horodatée, associée à cette version du contrat.
        </p>
        <SignaturePad
          signature={contract}
          isSaving={signMutation.isPending}
          isClearing={clearSignatureMutation.isPending}
          onSign={(signature_image, signed_by) => signMutation.mutate({ contractId: contract.id, signature_image, signed_by })}
          onClear={() => clearSignatureMutation.mutate(contract.id)}
        />
      </div>

      <PositionPill
        index={activeIndex}
        total={clauses.length}
        label={clauses[activeIndex]?.clause_title}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </div>
  );
}
