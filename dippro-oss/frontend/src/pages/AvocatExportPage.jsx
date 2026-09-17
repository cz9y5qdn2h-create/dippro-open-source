import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import AvocatClientShell from '../components/avocat/AvocatClientShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Download, FileText, BarChart2, FileType } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AvocatExportPage() {
  const { franchiseurId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['avocat-dip', franchiseurId],
    queryFn: () => api.get(`/avocat/franchiseur/${franchiseurId}/dip`).then(r => r.data),
  });

  const dip = data?.dip;

  const downloadBlob = async (path, filename) => {
    if (!dip) return toast.error('Aucun DIP disponible');
    const t = toast.loading('Génération du document…');
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Téléchargement terminé', { id: t });
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'export", { id: t });
    }
  };

  const exports = dip ? [
    {
      title: 'DIP complet (DOCX)',
      description: 'Le DIP complet, toutes sections, format éditable.',
      icon: FileType,
      action: () => downloadBlob(`/export/${dip.id}/docx`, `dip-${dip.id.substring(0, 8)}.docx`),
    },
    {
      title: 'Rapport de conformité (PDF)',
      description: 'Score global, statut de chaque section, synthèse Loi Doubin.',
      icon: BarChart2,
      action: () => downloadBlob(`/export/${dip.id}/pdf`, `rapport-conformite-${dip.id.substring(0, 8)}.pdf`),
    },
    {
      title: 'Données brutes (JSON)',
      description: 'Toutes les données DIP, sections et historique.',
      icon: FileText,
      action: async () => {
        try {
          const res = await api.get(`/export/${dip.id}/json`);
          const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'dip-export.json';
          a.click();
          window.URL.revokeObjectURL(url);
        } catch (err) {
          toast.error(err.message || "Erreur lors de l'export");
        }
      },
    },
  ] : [];

  return (
    <AvocatClientShell franchiseurId={franchiseurId} active="export">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Téléchargement</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Export</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : !dip ? (
          <div className="card-v2 text-center py-16">
            <Download className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--v2-gold)' }} />
            <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Aucun DIP actif pour ce client.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exports.map(exp => (
              <div key={exp.title} className="card-v2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)' }}>
                      <exp.icon className="w-4 h-4" style={{ color: 'var(--v2-gold)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{exp.title}</p>
                      <p className="font-dm-sans text-xs mt-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>{exp.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={exp.action}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg flex-shrink-0"
                    style={{ border: '1px solid var(--v2-border-hot)', color: 'var(--v2-gold)' }}
                  >
                    <Download className="w-4 h-4" />
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
