import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Calendar, CheckCircle, LogOut, Mail, Clock, Send, ChevronDown, Users } from 'lucide-react';
import api from '../lib/api';
import usePageBackground from '../lib/usePageBackground';

const BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const CAL_URL = import.meta.env.VITE_CAL_COM_URL || '';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'contact@example.com';

export default function TrialExpiredPage() {
  usePageBackground(BG);
  const { profile, logout } = useAuth();
  const [booked, setBooked] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ email: '', company_name: '' });
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistAlreadyExists, setWaitlistAlreadyExists] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');

  const handleToggleWaitlist = () => {
    if (!showWaitlist && !waitlistForm.email && profile) {
      setWaitlistForm({ email: profile.email || '', company_name: profile.company_name || '' });
    }
    setShowWaitlist(v => !v);
  };

  const handleWaitlistSubmit = async () => {
    if (!waitlistForm.email || !waitlistForm.company_name) return;
    setWaitlistLoading(true);
    setWaitlistError('');
    try {
      const res = await api.post('/waitlist', { ...waitlistForm, source: 'trial_expired', user_id: profile?.id });
      if (res.data.already_exists) setWaitlistAlreadyExists(true);
      else setWaitlistSuccess(true);
    } catch (err) {
      setWaitlistError(err.message || 'Une erreur est survenue');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleBooked = () => {
    setBooked(true);
    setShowCal(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{
            background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)'
          }}>
            <Shield className="w-7 h-7" style={{ color: '#9C4141' }} />
          </div>
          <p className="font-cormorant text-2xl" style={{ color: '#1A1826' }}>DIPpro</p>
          <p className="font-dm-mono text-xs mt-1" style={{ color: '#94A3B8' }}>by Iralink</p>
        </div>

        {/* Card principale */}
        <div className="rounded-2xl p-8" style={{
          background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 32px rgba(80,90,140,0.1)'
        }}>
          {booked ? (
            /* État après prise de RDV */
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mx-auto" style={{
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)'
              }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#22C55E' }} />
              </div>
              <div>
                <h2 className="font-cormorant text-2xl mb-2" style={{ color: '#1A1826' }}>
                  Rendez-vous confirmé
                </h2>
                <p className="font-dm-sans text-sm leading-relaxed" style={{ color: '#64748B' }}>
                  Notre équipe Iralink va vérifier votre réservation et réactiver votre accès sous 24h.
                  Vous recevrez une confirmation par email à <strong>{profile?.email}</strong>.
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(156,65,65,0.08)', border: '1px solid rgba(156,65,65,0.2)' }}>
                <p className="font-dm-sans text-xs" style={{ color: '#64748B' }}>
                  Une question ? Contactez-nous directement :
                </p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-dm-mono text-sm" style={{ color: '#9C4141' }}>
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          ) : showCal ? (
            /* Cal.com iframe */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setShowCal(false)}
                  className="font-dm-sans text-sm" style={{ color: '#94A3B8' }}
                >
                  ← Retour
                </button>
                <h3 className="font-cormorant text-xl" style={{ color: '#1A1826' }}>Réserver un appel</h3>
              </div>
              <div style={{ height: 500, borderRadius: 12, overflow: 'hidden' }}>
                <iframe
                  src={CAL_URL}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="Réserver un appel Iralink"
                  style={{ border: 'none', background: '#f8f9fd' }}
                />
              </div>
              <button
                onClick={handleBooked}
                className="w-full mt-4 font-dm-sans text-sm py-3 rounded-xl transition-all"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                J'ai pris mon rendez-vous
              </button>
            </div>
          ) : (
            /* État principal — essai expiré */
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)'
              }}>
                <Clock className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
                <div>
                  <p className="font-dm-sans text-sm font-medium" style={{ color: '#1A1826' }}>
                    Votre période d'essai de 5 jours est terminée
                  </p>
                  <p className="font-dm-sans text-xs mt-0.5" style={{ color: '#64748B' }}>
                    Pour continuer à utiliser DIPpro, prenez rendez-vous avec l'équipe Iralink.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <h2 className="font-cormorant text-2xl mb-2" style={{ color: '#1A1826' }}>
                  Continuez avec DIPpro
                </h2>
                <p className="font-dm-sans text-sm leading-relaxed" style={{ color: '#64748B' }}>
                  Bonjour <strong>{profile?.company_name || profile?.email}</strong>, votre essai gratuit est arrivé à terme.
                  Prenez 30 minutes avec notre équipe pour découvrir comment DIPpro peut sécuriser votre réseau de franchise.
                </p>
              </div>

              {/* CTA principal */}
              <button
                onClick={() => CAL_URL ? setShowCal(true) : (window.location.href = `mailto:${CONTACT_EMAIL}`)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-dm-sans text-base font-medium transition-all"
                style={{ background: '#9C4141', color: '#1A1826', boxShadow: '0 4px 16px rgba(156,65,65,0.3)' }}
              >
                <Calendar className="w-5 h-5" />
                {CAL_URL ? 'Voir la présentation DIPpro — 30 min' : 'Nous contacter'}
              </button>

              {/* Secondaire */}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=DIPpro — Demande d'accès après essai&body=Bonjour,%0A%0AJe souhaite continuer à utiliser DIPpro.%0A%0ASociété : ${profile?.company_name || ''}%0AEmail : ${profile?.email || ''}%0A%0ACordialement`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-dm-sans text-sm transition-all"
                style={{ border: '1px solid rgba(156,65,65,0.3)', color: '#64748B', background: 'transparent' }}
              >
                <Mail className="w-4 h-4" />
                Contacter par email
              </a>

              {/* Option liste d'attente */}
              <div>
                <button
                  onClick={handleToggleWaitlist}
                  className="w-full text-center font-dm-sans text-xs py-2 flex items-center justify-center gap-1 transition-colors"
                  style={{ color: '#94A3B8' }}
                >
                  Pas encore prêt pour un rendez-vous ?
                  <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: showWaitlist ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {showWaitlist && (
                  <div className="mt-3 p-4 rounded-xl" style={{ background: 'rgba(156,65,65,0.06)', border: '1px solid rgba(156,65,65,0.2)' }}>
                    {waitlistSuccess ? (
                      <div className="text-center space-y-2 py-2">
                        <CheckCircle className="w-6 h-6 mx-auto" style={{ color: '#22C55E' }} />
                        <p className="font-dm-sans text-sm font-medium" style={{ color: '#1A1826' }}>Inscription enregistrée !</p>
                        <p className="font-dm-sans text-xs" style={{ color: '#64748B' }}>Nous vous contacterons dès que votre accès sera prêt.</p>
                      </div>
                    ) : waitlistAlreadyExists ? (
                      <div className="text-center space-y-2 py-2">
                        <Users className="w-6 h-6 mx-auto" style={{ color: '#9C4141' }} />
                        <p className="font-dm-sans text-sm font-medium" style={{ color: '#1A1826' }}>Déjà inscrit !</p>
                        <p className="font-dm-sans text-xs" style={{ color: '#64748B' }}>Votre email est déjà sur notre liste d'attente.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-dm-mono text-xs text-center mb-3" style={{ color: '#9C4141' }}>Rejoindre la liste d'attente</p>
                        {waitlistError && <p className="font-dm-sans text-xs text-center" style={{ color: '#EF4444' }}>{waitlistError}</p>}
                        <input
                          type="text"
                          value={waitlistForm.company_name}
                          onChange={e => setWaitlistForm(f => ({ ...f, company_name: e.target.value }))}
                          placeholder="Nom de la société"
                          className="w-full px-3 py-2 rounded-lg font-dm-sans text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(200,200,220,0.5)', color: '#1A1826' }}
                        />
                        <input
                          type="email"
                          value={waitlistForm.email}
                          onChange={e => setWaitlistForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="Email"
                          className="w-full px-3 py-2 rounded-lg font-dm-sans text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(200,200,220,0.5)', color: '#1A1826' }}
                        />
                        <button
                          onClick={handleWaitlistSubmit}
                          disabled={waitlistLoading || !waitlistForm.email || !waitlistForm.company_name}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-dm-sans text-sm font-medium transition-all"
                          style={{
                            background: waitlistForm.email && waitlistForm.company_name ? '#9C4141' : 'rgba(156,65,65,0.4)',
                            color: '#1A1826',
                            cursor: waitlistForm.email && waitlistForm.company_name ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {waitlistLoading
                            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                          M'inscrire sur la liste
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ce qui vous attend */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(156,65,65,0.06)', border: '1px solid rgba(156,65,65,0.15)' }}>
                <p className="font-dm-mono text-xs mb-3" style={{ color: '#9C4141' }}>Lors de notre appel</p>
                {[
                  'Démo complète adaptée à votre réseau',
                  'Configuration de votre DIP en temps réel',
                  'Réponses à toutes vos questions légales',
                  'Accès immédiat après l\'appel'
                ].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22C55E' }} />
                    <span className="font-dm-sans text-xs" style={{ color: '#64748B' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <div className="text-center mt-6">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 font-dm-sans text-xs transition-colors"
            style={{ color: '#94A3B8' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
