import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import AvocatClientShell from '../components/avocat/AvocatClientShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ShieldCheck, Download, FileCheck, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_LABELS = { INITIAL: 'Remise initiale', MISE_A_JOUR: 'Mise à jour', REMISE: 'Remise franchisé' };

export default function AvocatCertificatesPage() {
  const { franchiseurId } = useParams();
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['avocat-certificates', franchiseurId],
    queryFn: () => api.get(`/certificates?franchiseur_id=${franchiseurId}&limit=100`).then(r => r.data),
  });

  const certificates = data?.certificates || [];

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      const res = await api.get(`/certificates/${cert.id}/docx?franchiseur_id=${franchiseurId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attestation_${(TYPE_LABELS[cert.certificate_type] || 'DIP').replace(/[^a-z0-9]/gi, '_')}_${cert.id.substring(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Impossible de télécharger cette attestation');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AvocatClientShell franchiseurId={franchiseurId} active="certifications">
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Attestations</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Certifications & attestations</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : certificates.length === 0 ? (
          <div className="card-v2 text-center py-16">
            <FileCheck className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--v2-gold)' }} />
            <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Aucune attestation pour ce client.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map(cert => (
              <div key={cert.id} className="card-v2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)' }}>
                      <ShieldCheck className="w-4 h-4" style={{ color: 'var(--v2-gold)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {cert.certificate_number != null && (
                          <span className="font-dm-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border-hot)', color: 'var(--v2-gold)' }}>
                            N° {String(cert.certificate_number).padStart(4, '0')}
                          </span>
                        )}
                        <span className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                          {cert.certificate_title || TYPE_LABELS[cert.certificate_type] || 'Attestation'}
                        </span>
                        <span className="font-dm-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'var(--v2-gold)' }}>
                          {TYPE_LABELS[cert.certificate_type] || cert.certificate_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {cert.generated_at && (
                          <span className="font-dm-mono text-xs flex items-center gap-1" style={{ color: 'rgb(var(--text-muted))' }}>
                            <Clock className="w-3 h-3" />
                            {new Date(cert.generated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        )}
                        {typeof cert.global_score === 'number' && (
                          <span className="font-dm-mono text-xs" style={{ color: 'var(--v2-gold)' }}>{cert.global_score}%</span>
                        )}
                        {Array.isArray(cert.warnings) && cert.warnings.length > 0 && (
                          <span className="font-dm-sans text-xs flex items-center gap-1" style={{ color: 'rgb(241 124 124)' }}>
                            <AlertTriangle className="w-3 h-3" /> {cert.warnings.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(cert)}
                    disabled={downloadingId === cert.id}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg flex-shrink-0"
                    style={{ border: '1px solid var(--v2-border-hot)', color: 'var(--v2-gold)' }}
                  >
                    {downloadingId === cert.id ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
                    DOCX
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AvocatClientShell>
  );
}
