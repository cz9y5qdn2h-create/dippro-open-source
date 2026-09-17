import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Scale, Gavel } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { LEGAL_ENTRIES, SANCTIONS } from '../lib/legalLibrary';
import usePageBackground from '../lib/usePageBackground';

const GOLD = '#9C4141';
const DARK = '#1A1826';
const GLASS = 'rgba(255,255,255,0.85)';
const BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const JURISPRUDENCE = LEGAL_ENTRIES.filter(e => e.category === 'Jurisprudence');

export default function BaseLitigesDIPPage() {
  usePageBackground(BG);
  return (
    <>
      <SEOHead
        title="Base des litiges DIP — Loi Doubin"
        description="Sanctions, jurisprudence récente et fondements juridiques classés par manquement à la Loi Doubin (art. L.330-3 C. com.)."
        canonical="/ressources/base-litiges-dip"
      />
      <div className="min-h-screen" style={{ background: BG }}>
        <header style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 15, height: 15, color: GOLD }} />
            </div>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 19, color: DARK }}>DIPpro</span>
          </Link>
        </header>

        <main style={{ maxWidth: 720, margin: '0 auto', padding: '10px 20px 70px' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 'clamp(1.9rem, 6vw, 2.6rem)', color: DARK, lineHeight: 1.2, marginBottom: 10 }}>
              La base des litiges DIP
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>
              Manquements à l&apos;obligation d&apos;information précontractuelle (Loi Doubin, art. L.330-3 C. com.), sanctions encourues et jurisprudence récente de la Cour de cassation. Contenu strictement issu de sources vérifiées — aucun classement de fréquence n&apos;est avancé faute de statistique publique fiable.
            </p>
          </div>

          {/* Tableau des sanctions */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Scale style={{ width: 18, height: 18, color: GOLD }} />
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: DARK }}>Manquements et sanctions</h2>
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(156,65,65,0.2)', background: GLASS, backdropFilter: 'blur(20px)' }}>
              {SANCTIONS.map((s, i) => (
                <div key={i} style={{ padding: '16px 18px', borderBottom: i < SANCTIONS.length - 1 ? '1px solid rgba(156,65,65,0.12)' : 'none' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 4 }}>{s.manquement}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', marginBottom: 4 }}>{s.sanction}</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: GOLD }}>{s.fondement}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Jurisprudence */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Gavel style={{ width: 18, height: 18, color: GOLD }} />
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: DARK }}>Jurisprudence récente</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {JURISPRUDENCE.map(j => (
                <div key={j.id} style={{ borderRadius: 14, padding: '18px 20px', background: GLASS, backdropFilter: 'blur(20px)', border: '1px solid rgba(156,65,65,0.18)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: GOLD, marginBottom: 6 }}>{j.ref}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>{j.title}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{j.summary}</p>
                  {j.url && (
                    <a href={j.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: GOLD, textDecoration: 'underline' }}>
                      Lire la décision
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div style={{ borderRadius: 14, padding: '18px 20px', background: 'rgba(156,65,65,0.06)', border: '1px solid rgba(156,65,65,0.18)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 10 }}>
              DIPpro est l&apos;outil de conformité DIP conçu pour les avocats en droit de la franchise — analyse IA, bibliothèque juridique complète et suivi des franchiseurs accompagnés.
            </p>
            <a href="mailto:theo@iralink-agency.com" style={{ fontFamily: 'monospace', fontSize: 12, color: GOLD }}>theo@iralink-agency.com</a>
          </div>

          <p style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94A3B8', textDecoration: 'none' }}>
              <ArrowLeft style={{ width: 12, height: 12 }} /> Retour à l&apos;accueil
            </Link>
          </p>
        </main>
      </div>
    </>
  );
}
