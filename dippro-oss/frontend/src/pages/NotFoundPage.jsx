import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import usePageBackground from '../lib/usePageBackground';

const BG = `
  radial-gradient(ellipse 55% 50% at 15% 70%, rgba(156,65,65,0.20) 0%, transparent 60%),
  radial-gradient(ellipse 40% 60% at 80% 20%, rgba(130,50,50,0.14) 0%, transparent 55%),
  linear-gradient(160deg, #0a0805 0%, #0f0d08 25%, #080808 55%, #060606 100%)
`;

export default function NotFoundPage() {
  usePageBackground(BG);
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)' }}>
            <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
          </div>
          <p className="font-cormorant text-xl" style={{ color: '#F4F2EE' }}>DIPpro</p>
        </div>
        <p className="font-dm-mono text-xs mb-3" style={{ color: '#9C4141', letterSpacing: '0.1em' }}>ERREUR 404</p>
        <p className="font-cormorant text-3xl mb-4" style={{ color: '#F4F2EE', fontWeight: 300 }}>Cette page n'existe pas.</p>
        <p className="font-dm-sans text-sm mb-8" style={{ color: 'rgba(244,242,238,0.44)' }}>
          Le lien que vous avez suivi est peut-être obsolète ou mal orthographié.
        </p>
        <Link to="/" className="font-dm-sans text-sm" style={{ color: '#9C4141' }}>← Retour à l'accueil</Link>
      </div>
    </div>
  );
}
