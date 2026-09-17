import { useRef, useState, useEffect, useCallback } from 'react';
import { Check, RotateCcw, PenLine, ShieldCheck, Trash2 } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';

// Case signature — capture un tracé à la souris/au doigt, exporté en PNG.
// Le canvas est redimensionné en pixels réels (devicePixelRatio) au montage
// pour un tracé net, indépendamment de sa taille affichée en CSS.
function useCanvasSetup() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return canvasRef;
}

export default function SignaturePad({ signature, onSign, onClear, isSaving, isClearing }) {
  const canvasRef = useCanvasSetup();
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState('');

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.getContext('2d').clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setHasDrawn(false);
  }, [canvasRef]);

  const handleSign = () => {
    if (!hasDrawn || !signerName.trim()) return;
    onSign(canvasRef.current.toDataURL('image/png'), signerName.trim());
  };

  if (signature?.signature_image) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
          <p className="font-dm-sans text-sm text-success">
            Signé par <span className="font-medium">{signature.signed_by}</span>
            {signature.signed_at && ` le ${new Date(signature.signed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <img
          src={signature.signature_image}
          alt={`Signature de ${signature.signed_by}`}
          className="rounded-lg border border-border-subtle bg-white h-32 object-contain px-4"
        />
        <button onClick={onClear} disabled={isClearing} className="btn-ghost flex items-center gap-2 text-xs text-danger hover:text-danger/80">
          {isClearing ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
          Réinitialiser la signature
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        className="input-field text-sm"
        placeholder="Nom du signataire"
        value={signerName}
        onChange={e => setSignerName(e.target.value)}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-36 rounded-lg border border-border-subtle bg-white touch-none cursor-crosshair"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <p className="font-dm-sans text-xs text-text-muted flex items-center gap-1.5">
        <PenLine className="w-3.5 h-3.5 flex-shrink-0" /> Signez avec la souris ou le doigt dans le cadre ci-dessus.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSign}
          disabled={!hasDrawn || !signerName.trim() || isSaving}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          {isSaving ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />} Signer le document
        </button>
        <button onClick={clearCanvas} className="btn-ghost flex items-center gap-2 text-sm">
          <RotateCcw className="w-4 h-4" /> Effacer
        </button>
      </div>
    </div>
  );
}
