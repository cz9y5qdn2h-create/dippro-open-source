import { Sparkles } from 'lucide-react';
import { AVOCAT_DISCLAIMER } from '../../lib/legalCopy';

export default function AIDisclaimer({ className = '' }) {
  return (
    <p className={`flex items-center gap-1.5 font-dm-mono text-xs text-text-muted ${className}`}>
      <Sparkles className="w-3 h-3 flex-shrink-0 opacity-60" />
      {AVOCAT_DISCLAIMER}
    </p>
  );
}
