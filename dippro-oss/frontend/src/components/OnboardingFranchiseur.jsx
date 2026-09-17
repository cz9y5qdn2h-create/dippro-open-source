import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Users, FileText, Mail, ArrowRight, ArrowLeft, CheckCircle, X } from 'lucide-react';
import api from '../lib/api';

const TOTAL = 4;

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -56 : 56, opacity: 0 }),
};

export default function OnboardingFranchiseur({ profile, onComplete }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nb_franchisees: '',
    has_existing_dip: null,
    lawyer_email: '',
  });

  const goTo = (next) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const finish = async () => {
    setSaving(true);
    try {
      await api.post('/onboarding', {
        role: 'franchiseur',
        nb_franchisees: form.nb_franchisees ? parseInt(form.nb_franchisees, 10) : undefined,
        has_existing_dip: form.has_existing_dip,
        lawyer_email: form.lawyer_email || undefined,
      });
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: 16, overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onComplete(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 540, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', margin: 'auto', borderRadius: 24, border: '1px solid rgba(156,65,65,0.30)', background: 'var(--modal-bg, rgba(255,255,255,0.96))', boxShadow: '0 32px 80px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div>
            <p className="font-dm-mono" style={{ fontSize: 11, color: 'rgb(var(--gold))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Configuration du compte</p>
            <h2 className="font-cormorant" style={{ fontSize: 22, fontWeight: 600, color: 'rgb(var(--text-primary))', marginTop: 2 }}>
              {profile?.company_name || 'Votre réseau'}
            </h2>
          </div>
          <button onClick={onComplete} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'rgb(var(--gold))' : 'rgb(var(--border-subtle))', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ minHeight: 240, padding: '28px 24px 20px', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }}>
              {step === 0 && <StepReseau form={form} set={set} />}
              {step === 1 && <StepDIP form={form} set={set} />}
              {step === 2 && <StepAvocat form={form} set={set} />}
              {step === 3 && <StepDone profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 24px' }}>
          <button
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: step === 0 ? 0.3 : 1, fontSize: 13 }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} /> Retour
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? 'rgb(var(--gold))' : 'rgba(156,65,65,0.25)', transition: 'all 0.25s' }} />
            ))}
          </div>

          {step < TOTAL - 1 ? (
            <button
              onClick={() => goTo(step + 1)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13 }}
            >
              Suivant <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13 }}
            >
              {saving ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle style={{ width: 14, height: 14 }} />}
              Accéder au dashboard
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StepReseau({ form, set }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users style={{ width: 18, height: 18, color: 'rgb(var(--gold))' }} />
        </div>
        <div>
          <p className="font-dm-sans" style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--text-primary))' }}>Votre réseau</p>
          <p className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>Dites-nous en plus sur votre franchise</p>
        </div>
      </div>
      <div>
        <label className="font-dm-sans" style={{ fontSize: 12, fontWeight: 500, color: 'rgb(var(--text-secondary))', display: 'block', marginBottom: 6 }}>
          Nombre de franchisés actifs
        </label>
        <input
          type="number"
          min={0}
          max={9999}
          value={form.nb_franchisees}
          onChange={e => set('nb_franchisees', e.target.value)}
          placeholder="Ex. 24"
          className="input-field"
          style={{ width: '100%' }}
          autoFocus
        />
        <p className="font-dm-sans" style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 6 }}>
          Cette information nous aide à adapter les notifications de conformité.
        </p>
      </div>
    </div>
  );
}

function StepDIP({ form, set }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText style={{ width: 18, height: 18, color: 'rgb(var(--gold))' }} />
        </div>
        <div>
          <p className="font-dm-sans" style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--text-primary))' }}>Votre DIP actuel</p>
          <p className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>Avez-vous déjà un DIP rédigé ?</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { val: true, label: 'Oui, j\'ai un DIP existant', sub: 'Je vais l\'importer pour analyse' },
          { val: false, label: 'Non, je pars de zéro', sub: 'DIPpro va m\'aider à le créer' },
        ].map(({ val, label, sub }) => (
          <button
            key={String(val)}
            onClick={() => set('has_existing_dip', val)}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: `1px solid ${form.has_existing_dip === val ? 'rgba(156,65,65,0.60)' : 'rgb(var(--border-subtle))'}`,
              background: form.has_existing_dip === val ? 'rgba(156,65,65,0.08)' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <p className="font-dm-sans" style={{ fontSize: 14, fontWeight: 500, color: 'rgb(var(--text-primary))' }}>{label}</p>
            <p className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--text-secondary))', marginTop: 2 }}>{sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepAvocat({ form, set }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail style={{ width: 18, height: 18, color: 'rgb(var(--gold))' }} />
        </div>
        <div>
          <p className="font-dm-sans" style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--text-primary))' }}>Votre avocat</p>
          <p className="font-dm-sans" style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>Invitez votre conseil juridique (optionnel)</p>
        </div>
      </div>
      <div>
        <label className="font-dm-sans" style={{ fontSize: 12, fontWeight: 500, color: 'rgb(var(--text-secondary))', display: 'block', marginBottom: 6 }}>
          Email de votre avocat
        </label>
        <input
          type="email"
          value={form.lawyer_email}
          onChange={e => set('lawyer_email', e.target.value)}
          placeholder="avocat@cabinet.fr"
          className="input-field"
          style={{ width: '100%' }}
          autoFocus
        />
        <p className="font-dm-sans" style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 6 }}>
          S'il dispose d'un compte DIPpro, une invitation lui sera envoyée automatiquement.
        </p>
      </div>
    </div>
  );
}

function StepDone({ profile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 8 }}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(156,65,65,0.12)', border: '2px solid rgba(156,65,65,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CheckCircle style={{ width: 32, height: 32, color: 'rgb(var(--gold))' }} />
      </motion.div>
      <div style={{ textAlign: 'center' }}>
        <p className="font-cormorant" style={{ fontSize: 22, fontWeight: 600, color: 'rgb(var(--text-primary))' }}>
          Bienvenue, {profile?.company_name || 'franchiseur'} !
        </p>
        <p className="font-dm-sans" style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', marginTop: 8, maxWidth: 360 }}>
          Votre espace est prêt. Importez votre premier DIP ou laissez notre IA vous guider pour le créer.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['Import DIP', 'Analyse IA', 'Partage'].map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(156,65,65,0.10)', border: '1px solid rgba(156,65,65,0.22)' }}>
              <span className="font-dm-mono" style={{ fontSize: 11, color: 'rgb(var(--gold))' }}>{label}</span>
            </div>
            {i < 2 && <span style={{ color: 'rgb(var(--gold))', fontSize: 12 }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
