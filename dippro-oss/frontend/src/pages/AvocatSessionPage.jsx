import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

// Point d'échange du lien d'accès permanent avocat : reçoit un token_hash
// Supabase à usage unique et l'échange contre une session directement via
// l'API, sans passer par la redirection hébergée de Supabase (qui dépend
// d'une liste blanche de domaines qu'on ne peut pas vérifier). Cette page
// n'est jamais elle-même le lien enregistré par l'avocat — il rouvre
// toujours /api/auth/avocat-login/:token, qui régénère un token_hash frais
// et redirige ici.
export default function AvocatSessionPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');

    if (!tokenHash) {
      setStatus('error');
      return;
    }

    // Ne JAMAIS passer `email` ici avec `token_hash` — le SDK Supabase
    // choisit la branche de vérification selon la présence de la clé
    // `email` (prioritaire sur `token_hash`), et attend alors un code OTP
    // court dans `token` plutôt que le hash. Résultat : le token_hash est
    // silencieusement ignoré et la vérification échoue à chaque fois.
    supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
      .then(({ error }) => {
        setStatus(error ? 'error' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [searchParams]);

  if (status === 'success') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      {status === 'verifying' ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-danger/50 mx-auto mb-4" />
          <p className="font-cormorant text-2xl text-text-primary mb-2">Lien expiré ou déjà utilisé</p>
          <p className="font-dm-sans text-sm text-text-secondary">
            Rouvrez le lien d'accès que votre client vous a transmis — chaque visite génère automatiquement un nouvel accès.
          </p>
        </div>
      )}
    </div>
  );
}
