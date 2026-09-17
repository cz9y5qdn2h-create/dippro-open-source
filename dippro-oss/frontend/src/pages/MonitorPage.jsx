import PageHeader from '../components/ui/PageHeader';
import { FolderSync, Clock } from 'lucide-react';

export default function MonitorPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Surveillance docs"
        subtitle="Détection automatique des modifications"
      />

      <div className="card flex flex-col items-center justify-center text-center py-20 gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgb(var(--gold) / 0.08)',
            border: '0.5px solid rgb(var(--gold) / 0.22)',
          }}
        >
          <FolderSync className="w-7 h-7 text-gold" />
        </div>

        <div className="space-y-2 max-w-sm">
          <h2 className="font-cormorant text-2xl text-text-primary" style={{ fontWeight: 300 }}>
            Page à venir
          </h2>
          <p className="font-dm-sans text-sm text-text-secondary">
            La surveillance automatique des documents sera disponible prochainement.
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: 'rgb(var(--gold) / 0.06)',
            border: '0.5px solid rgb(var(--gold) / 0.18)',
          }}
        >
          <Clock className="w-3 h-3 text-gold" style={{ opacity: 0.6 }} />
          <span className="font-dm-mono text-xs" style={{ color: 'rgb(var(--gold) / 0.65)', letterSpacing: '0.04em' }}>
            Bientôt disponible
          </span>
        </div>
      </div>
    </div>
  );
}
