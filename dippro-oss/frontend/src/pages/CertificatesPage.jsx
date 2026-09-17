import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  ShieldCheck, Download, FileCheck, Clock, AlertTriangle, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  INITIAL: 'Remise initiale',
  MISE_A_JOUR: 'Mise à jour',
  REMISE: 'Remise franchisé',
};

const STATUS_LABELS = {
  pending: 'En génération',
  generated: 'Émise',
  ready: 'Émise',
  signed: 'Signée',
};

export default function CertificatesPage() {
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => api.get('/certificates?limit=100').then(r => r.data),
  });

  const certificates = data?.certificates || [];

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      const res = await api.get(`/certificates/${cert.id}/docx`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attestation_${(TYPE_LABELS[cert.certificate_type] || 'DIP').replace(/[^a-z0-9]/gi, '_')}_${cert.id.substring(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Attestation téléchargée');
    } catch (err) {
      toast.error(err.message || 'Impossible de télécharger cette attestation');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Certifications & attestations"
        subtitle="Historique de toutes les attestations de remise et de modification de votre DIP"
        action={
          <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        }
      />

      <div className="card border-gold/15 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <p className="font-dm-sans text-sm text-text-secondary">
          Chaque attestation constitue une <strong className="text-text-primary">preuve horodatée</strong> (empreinte SHA-256)
          de l'état de votre DIP à une date donnée : remise initiale, mise à jour ou remise à un franchisé.
          Conservez-les — elles sont votre preuve de diligence en cas de litige.
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="card border-dashed border-border-default text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 mb-6">
            <FileCheck className="w-8 h-8 text-gold" />
          </div>
          <h2 className="font-cormorant text-2xl text-text-primary mb-3">Aucune attestation pour l'instant</h2>
          <p className="font-dm-sans text-sm text-text-secondary max-w-sm mx-auto">
            Les attestations sont générées automatiquement à chaque remise ou mise à jour de votre DIP.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map(cert => (
            <div key={cert.id} className="card hover:border-border-default transition-all">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cert.certificate_number != null && (
                        <span className="font-dm-mono text-xs px-2 py-0.5 rounded bg-bg-elevated text-gold border border-gold/25">
                          N° {String(cert.certificate_number).padStart(4, '0')}
                        </span>
                      )}
                      <span className="font-dm-sans text-sm font-medium text-text-primary">
                        {cert.certificate_title || TYPE_LABELS[cert.certificate_type] || 'Attestation'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-dm-sans bg-gold/10 text-gold border border-gold/20">
                        {TYPE_LABELS[cert.certificate_type] || cert.certificate_type}
                      </span>
                      {cert.status && STATUS_LABELS[cert.status] && (
                        <span className="px-2 py-0.5 rounded text-xs font-dm-sans bg-bg-elevated text-text-muted border border-border-subtle">
                          {STATUS_LABELS[cert.status]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {cert.generated_at && (
                        <span className="font-dm-sans text-xs text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(cert.generated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {typeof cert.changes_count === 'number' && cert.changes_count > 0 && (
                        <span className="font-dm-sans text-xs text-text-muted">
                          {cert.changes_count} modification{cert.changes_count > 1 ? 's' : ''}
                        </span>
                      )}
                      {typeof cert.global_score === 'number' && (
                        <span className="font-dm-mono text-xs text-gold">{cert.global_score}%</span>
                      )}
                      {Array.isArray(cert.warnings) && cert.warnings.length > 0 && (
                        <span className="font-dm-sans text-xs text-danger flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {cert.warnings.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(cert)}
                    disabled={downloadingId === cert.id}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    {downloadingId === cert.id ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                    Télécharger (DOCX)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
