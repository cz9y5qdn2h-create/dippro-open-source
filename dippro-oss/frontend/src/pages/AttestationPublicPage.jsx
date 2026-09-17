import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Shield, Award, AlertTriangle, Download, FileText, Hash } from 'lucide-react';
import usePageBackground from '../lib/usePageBackground';

const BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

const LEVEL_LABEL = {
  CONFORME: 'Conforme',
  'RÉVISIONS_MINEURES': 'Révisions mineures recommandées',
  'RÉVISIONS_MAJEURES': 'Révisions majeures requises',
  BLOQUANT_NON_ENVOYABLE: 'Bloquant',
};

export default function AttestationPublicPage() {
  usePageBackground(BG);
  const { token } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-certificate', token],
    queryFn: () => axios.get(`${API_BASE}/certificates/public/${token}?format=json`).then(r => r.data),
    retry: false,
  });

  const cert = data?.certificate;

  return (
    <div className="min-h-screen p-4 py-8" style={{ background: BG }}>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)' }}>
              <Shield className="w-4 h-4" style={{ color: '#9C4141' }} />
            </div>
            <div>
              <p className="font-cormorant text-lg" style={{ color: '#1A1826' }}>DIPpro</p>
              <p className="font-dm-mono text-xs" style={{ color: '#94A3B8' }}>by Iralink</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-dm-mono text-xs" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
            <Award className="w-3.5 h-3.5" />
            Document officiel
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" style={{ color: '#9C4141' }} />
            <p className="font-dm-sans text-sm mt-4" style={{ color: '#64748B' }}>Vérification en cours…</p>
          </div>
        ) : isError || !cert ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h2 className="font-cormorant text-2xl mb-2" style={{ color: '#1A1826' }}>Attestation introuvable</h2>
            <p className="font-dm-sans text-sm" style={{ color: '#64748B' }}>Ce lien de vérification est invalide ou l'attestation a été retirée.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 32px rgba(80,90,140,0.1)' }}>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-3 font-dm-mono text-xs" style={{ background: 'rgba(156,65,65,0.1)', border: '1px solid rgba(156,65,65,0.2)', color: '#9C4141' }}>
                <FileText className="w-3 h-3" />
                Attestation N° {String(cert.certificate_number ?? '?').padStart(4, '0')}
              </div>
              <h1 className="font-cormorant text-2xl mb-1" style={{ color: '#1A1826' }}>{cert.certificate_title || cert.certificate_type}</h1>
              <p className="font-dm-mono text-xs mb-5" style={{ color: '#94A3B8' }}>
                Générée le {new Date(cert.generated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>

              {cert.global_score != null && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(156,65,65,0.06)' }}>
                    <p className="font-cormorant text-2xl font-light" style={{ color: '#9C4141' }}>{cert.global_score}%</p>
                    <p className="font-dm-sans text-xs" style={{ color: '#64748B' }}>Score au moment de la génération</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(156,65,65,0.06)' }}>
                    <p className="font-dm-sans text-sm mt-1" style={{ color: '#1A1826' }}>{LEVEL_LABEL[cert.compliance_level] || 'Non évalué'}</p>
                    <p className="font-dm-sans text-xs mt-1" style={{ color: '#64748B' }}>Niveau constaté</p>
                  </div>
                </div>
              )}

              {cert.legal_summary && (
                <p className="font-dm-sans text-sm leading-relaxed mb-4" style={{ color: '#475569' }}>{cert.legal_summary}</p>
              )}

              {cert.sha256_dip && (
                <div className="flex items-start gap-2 rounded-lg p-3 mb-4" style={{ background: 'rgba(30,26,38,0.04)' }}>
                  <Hash className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#94A3B8' }} />
                  <p className="font-dm-mono text-xs break-all" style={{ color: '#64748B' }}>{cert.sha256_dip}</p>
                </div>
              )}

              <div className="flex gap-3">
                <a
                  href={`${API_BASE}/certificates/public/${token}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm-sans text-sm"
                  style={{ background: 'rgba(156,65,65,0.16)', border: '0.5px solid rgba(156,65,65,0.42)', color: '#8B6218' }}
                >
                  <Download className="w-4 h-4" /> PDF
                </a>
                <a
                  href={`${API_BASE}/certificates/public/${token}?format=docx`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm-sans text-sm"
                  style={{ border: '0.5px solid rgba(30,26,38,0.16)', color: '#475569' }}
                >
                  <Download className="w-4 h-4" /> DOCX
                </a>
              </div>
            </div>

            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(156,65,65,0.08)', border: '1px solid rgba(156,65,65,0.2)' }}>
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#9C4141' }} />
              <p className="font-dm-sans text-xs leading-relaxed" style={{ color: '#64748B' }}>
                Cette empreinte SHA-256 et cet horodatage constituent une preuve technique vérifiable de l'état du document
                à la date de génération. Cette attestation ne constitue pas un avis juridique et ne garantit pas la conformité
                légale du document — l'analyse IA est un outil d'aide à la décision.
              </p>
            </div>

            <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(156,65,65,0.15)' }}>
              <p className="font-cormorant text-lg" style={{ color: '#1A1826' }}>DIPpro — by Iralink</p>
              <p className="font-dm-mono text-xs mt-1" style={{ color: '#94A3B8' }}>Loi Doubin · Base de données hébergée en Europe</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
