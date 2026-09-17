import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { FEATURES } from '../lib/features';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Save, Plus, Trash2, Database, Mail, Cloud, Globe, CheckCircle, Eye, EyeOff, Send, Sun, Moon, Sparkles, Lock, Key, Calendar, AlertCircle, Bell, Briefcase, RotateCcw, Copy, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CAL_URL = import.meta.env.VITE_CAL_COM_URL || '';

const SOURCE_TYPES = [
  { value: 'email', label: 'Email (Gmail)', icon: Mail },
  { value: 'google_drive', label: 'Google Drive', icon: Cloud },
  { value: 'manual', label: 'Upload manuel', icon: Database },
  { value: 'api', label: 'API externe', icon: Globe },
];

const AUTOMATION_LEVELS = [
  {
    level: 1,
    title: 'Contrôle total',
    description: 'Chaque changement détecté doit être approuvé ou rejeté individuellement. Recommandé pour les franchiseurs qui souhaitent valider chaque modification avant publication.',
    badge: 'Manuel'
  },
  {
    level: 2,
    title: 'Semi-automatique',
    description: 'Tous les changements proposés par l\'IA sont affichés ensemble. Une seule action "Approuver tout" suffit pour valider l\'ensemble des modifications en une fois.',
    badge: 'Hybride'
  },
  {
    level: 3,
    title: 'Full automatique',
    description: 'Les changements sont appliqués automatiquement après un délai de 48h. Vous recevez une notification et pouvez les consulter, mais aucune action n\'est requise.',
    badge: 'Auto'
  }
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile, supabase, isTrialExpired, trialDaysLeft } = useAuth();
  const isAvocat = profile?.role === 'avocat';
  const { theme, setTheme, themes } = useTheme();
  const [profileForm, setProfileForm] = useState({
    company_name: '', phone: '', address: '', lawyer_email: '',
    automation_level: 1,
    notifications_email: true, notifications_inapp: true,
    notifications_sms: false, notification_frequency: 'immediate',
    renewal_alert_days: 30
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [lastInviteUrl, setLastInviteUrl] = useState(null);
  const [resendForm, setResendForm] = useState({ resend_api_key: '', resend_sender_name: 'DIPpro', resend_sender_email: '' });
  const [showResendKey, setShowResendKey] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceForm, setSourceForm] = useState({ type: 'manual' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [mfaStatus, setMfaStatus] = useState('loading');
  const [mfaEnrollData, setMfaEnrollData] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [copilotForm, setCopilotForm] = useState({
    copilot_addressing_name: '', copilot_formality: 'vous', copilot_memory_notes: ''
  });

  useEffect(() => {
    const loadMfa = async () => {
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp?.filter(f => f.status === 'verified') || [];
        if (verified.length > 0) {
          setMfaStatus('enabled');
          setMfaEnrollData({ factorId: verified[0].id });
        } else {
          setMfaStatus('disabled');
        }
      } catch {
        setMfaStatus('disabled');
      }
    };
    loadMfa();
  }, [supabase]);

  const startMfaEnrollment = async () => {
    setMfaError('');
    setMfaLoading(true);
    try {
      const { data: enrollData, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaEnrollData({ factorId: enrollData.id, qrCode: enrollData.totp.qr_code, secret: enrollData.totp.secret });
      setMfaStatus('enrolling');
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfaEnrollment = async (e) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaEnrollData.factorId,
        code: mfaVerifyCode.replace(/\s/g, ''),
      });
      if (error) throw error;
      setMfaStatus('enabled');
      setMfaVerifyCode('');
      toast.success('Authentification à deux facteurs activée');
    } catch {
      setMfaError('Code incorrect — réessayez');
      setMfaVerifyCode('');
    } finally {
      setMfaLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!mfaEnrollData?.factorId) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaEnrollData.factorId });
      if (error) throw error;
      setMfaStatus('disabled');
      setMfaEnrollData(null);
      toast.success('Authentification à deux facteurs désactivée');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data)
  });

  useEffect(() => {
    if (data?.profile) {
      setProfileForm({
        company_name: data.profile.company_name || '',
        phone: data.profile.phone || '',
        address: data.profile.address || '',
        lawyer_email: data.profile.lawyer_email || '',
        automation_level: data.profile.automation_level || 1,
        notifications_email: data.profile.notifications_email ?? true,
        notifications_inapp: data.profile.notifications_inapp ?? true,
        notifications_sms: data.profile.notifications_sms ?? false,
        notification_frequency: data.profile.notification_frequency || 'immediate',
        renewal_alert_days: data.profile.renewal_alert_days ?? 30
      });
      setResendForm({
        resend_api_key: data.profile.resend_api_key || '',
        resend_sender_name: data.profile.resend_sender_name || 'DIPpro',
        resend_sender_email: data.profile.resend_sender_email || ''
      });
      setCopilotForm({
        copilot_addressing_name: data.profile.copilot_addressing_name || '',
        copilot_formality: data.profile.copilot_formality || 'vous',
        copilot_memory_notes: data.profile.copilot_memory_notes || ''
      });
    }
  }, [data]);

  const updateProfileMutation = useMutation({
    mutationFn: (d) => api.put('/settings/profile', d),
    onSuccess: () => {
      toast.success('Paramètres enregistrés');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // Mutations dédiées par section — le formulaire Profil, les préférences
  // Copilot, le niveau d'automatisation et les notifications partageaient
  // tous la même mutation : cliquer "Enregistrer" sur une seule section
  // affichait le spinner et désactivait les 3 autres boutons sans rapport.
  const copilotMutation = useMutation({
    mutationFn: (d) => api.put('/settings/profile', d),
    onSuccess: () => { toast.success('Préférences enregistrées'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (err) => toast.error(err.message)
  });

  const automationMutation = useMutation({
    mutationFn: (d) => api.put('/settings/profile', d),
    onSuccess: () => { toast.success('Niveau d\'automatisation enregistré'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (err) => toast.error(err.message)
  });

  const notificationsMutation = useMutation({
    mutationFn: (d) => api.put('/settings/profile', d),
    onSuccess: () => { toast.success('Préférences de notification enregistrées'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (err) => toast.error(err.message)
  });

  const saveResendMutation = useMutation({
    mutationFn: (d) => api.put('/settings/profile', d),
    onSuccess: () => { toast.success('Configuration email enregistrée'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (err) => toast.error(err.message)
  });

  const inviteAvocatMutation = useMutation({
    mutationFn: (lawyer_email) => api.post('/avocat/invite', { lawyer_email }),
    onSuccess: (res) => {
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setLastInviteUrl(res.data?.url || null);
      setInviteEmail('');
    },
    onError: (err) => toast.error(err.message),
  });

  const copyLastInviteUrl = () => {
    if (!lastInviteUrl) return;
    navigator.clipboard.writeText(lastInviteUrl).then(() => toast.success('Lien copié dans le presse-papiers'));
  };

  const testEmailMutation = useMutation({
    mutationFn: () => api.post('/notifications/test', { channel: 'email', target: data?.profile?.email }),
    onSuccess: (res) => {
      if (res.data.ok) toast.success('Email de test envoyé !');
      else toast.error('Échec : ' + (res.data.error || 'Vérifiez votre clé Resend'));
    },
    onError: (err) => toast.error(err.message)
  });

  const addSourceMutation = useMutation({
    mutationFn: (d) => api.post('/settings/sources', d),
    onSuccess: () => {
      toast.success('Source ajoutée');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setShowSourceForm(false);
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (id) => api.delete('/settings/sources/' + id),
    onSuccess: () => {
      toast.success('Source supprimée');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }) => {
      const { data: pwnedCheck } = await api.post('/auth/check-password', { password: newPassword });
      if (pwnedCheck?.pwned) {
        throw new Error(`Ce mot de passe a été trouvé dans ${pwnedCheck.count.toLocaleString('fr-FR')} fuites de données connues. Choisissez un mot de passe différent.`);
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mot de passe modifié');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    },
    onError: (err) => toast.error(err.message)
  });

  const sources = data?.data_sources || [];

  const handleSave = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    changePasswordMutation.mutate({ newPassword: passwordForm.newPassword });
  };

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* Statut d'essai — concept franchiseur, sans objet côté avocat */}
      {profile && !profile.appointment_booked && !isAvocat && (
        <div className={`card border ${isTrialExpired ? 'border-danger/40 bg-danger/5' : 'border-gold/30 bg-gold/5'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isTrialExpired ? 'bg-danger/10' : 'bg-gold/10'}`}>
              {isTrialExpired ? <AlertCircle className="w-5 h-5 text-danger" /> : <Calendar className="w-5 h-5 text-gold" />}
            </div>
            <div className="flex-1">
              <h3 className="font-dm-sans text-sm font-semibold text-text-primary mb-1">
                {isTrialExpired ? 'Période d\'essai expirée' : `Période d'essai — ${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''} restant${trialDaysLeft > 1 ? 's' : ''}`}
              </h3>
              <p className="font-dm-sans text-xs text-text-secondary mb-3">
                {isTrialExpired
                  ? 'Votre accès est suspendu. Prenez rendez-vous avec Iralink pour activer votre compte.'
                  : 'Profitez de toutes les fonctionnalités pendant votre essai. Un rendez-vous est requis pour continuer après l\'essai.'
                }
              </p>
              {CAL_URL && (
                <a
                  href={CAL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary inline-flex items-center gap-2 text-sm py-2"
                >
                  <Calendar className="w-4 h-4" />
                  Prendre rendez-vous
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apparence */}
      <div className="card">
        <h2 className="font-cormorant text-xl mb-5">{t('settings.sections.appearance')}</h2>
        <p className="font-dm-sans text-sm text-text-primary">{t('settings.theme.label')}</p>
        <p className="font-dm-sans text-xs text-text-secondary mt-0.5 mb-4">{t('settings.theme.description')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {themes.map(({ id, label, icon }) => {
            const Icon = icon === 'moon' ? Moon : icon === 'sun' ? Sun : Sparkles;
            const active = theme === id;
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex flex-col items-center gap-2 py-3 sm:py-4 rounded-xl border transition-all duration-200 ${active ? 'border-gold bg-gold/10' : 'border-border-default hover:border-border-subtle hover:bg-bg-elevated'}`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-gold' : 'text-text-secondary'}`} />
                <span className={`font-dm-sans text-xs ${active ? 'text-gold' : 'text-text-secondary'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sécurité */}
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl">{t('settings.sections.security')}</h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">{t('settings.password.label')}</p>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">{t('settings.password.new')}</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showNewPwd ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNewPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">{t('settings.password.confirm')}</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showConfirmPwd ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirmPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8 && (
            <p className="font-dm-sans text-xs text-danger">Au moins 8 caractères requis</p>
          )}
          {passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword && (
            <p className="font-dm-sans text-xs text-danger">Les mots de passe ne correspondent pas</p>
          )}
          <button
            type="submit"
            disabled={changePasswordMutation.isPending || !passwordForm.newPassword || !passwordForm.confirmPassword}
            className="btn-primary flex items-center gap-2"
          >
            {changePasswordMutation.isPending ? <LoadingSpinner size="sm" /> : <Lock className="w-4 h-4" />}
            Modifier le mot de passe
          </button>
        </form>
      </div>

      {/* A2F */}
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl">Authentification à deux facteurs</h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Protégez votre compte avec une application d'authentification (Google Authenticator, Authy…)
          </p>
        </div>

        {mfaStatus === 'loading' && <LoadingSpinner />}

        {mfaStatus === 'enabled' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg p-3 border border-success/25 bg-success/5">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <div>
                <p className="font-dm-sans text-sm font-medium text-text-primary">A2F activée</p>
                <p className="font-dm-sans text-xs text-text-secondary">Votre compte est protégé par un code TOTP</p>
              </div>
            </div>
            <button
              type="button"
              onClick={disableMfa}
              disabled={mfaLoading}
              className="btn-secondary flex items-center gap-2"
              style={{ color: 'rgb(var(--danger))', borderColor: 'rgb(var(--danger) / 0.30)' }}
            >
              {mfaLoading ? <LoadingSpinner size="sm" /> : <Key className="w-4 h-4" />}
              Désactiver l'A2F
            </button>
          </div>
        )}

        {mfaStatus === 'disabled' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg p-3 border border-border-subtle bg-bg-elevated">
              <Key className="w-5 h-5 text-text-muted flex-shrink-0" />
              <div>
                <p className="font-dm-sans text-sm text-text-primary">A2F non activée</p>
                <p className="font-dm-sans text-xs text-text-secondary">Activez pour renforcer la sécurité de votre compte</p>
              </div>
            </div>
            {mfaError && (
              <p className="font-dm-sans text-xs text-danger">{mfaError}</p>
            )}
            <button
              type="button"
              onClick={startMfaEnrollment}
              disabled={mfaLoading}
              className="btn-liquid-glass flex items-center gap-2"
            >
              {mfaLoading ? <LoadingSpinner size="sm" /> : <Key className="w-4 h-4" />}
              Activer l'authentification à deux facteurs
            </button>
          </div>
        )}

        {mfaStatus === 'enrolling' && mfaEnrollData?.qrCode && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="font-dm-sans text-sm text-text-primary mb-3">
                Scannez ce QR code avec votre application d'authentification
              </p>
              <div className="inline-block p-3 bg-white rounded-xl">
                <img src={mfaEnrollData.qrCode} alt="QR Code A2F" className="w-40 h-40" />
              </div>
            </div>

            {mfaError && (
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-dm-sans text-sm"
                style={{ background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.25)', color: '#F87171' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {mfaError}
              </div>
            )}

            <form onSubmit={verifyMfaEnrollment} className="space-y-3">
              <div>
                <label className="label">Code de vérification</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  value={mfaVerifyCode}
                  onChange={e => setMfaVerifyCode(e.target.value)}
                  placeholder="123 456"
                  required
                  autoFocus
                  className="input-field text-center tracking-widest"
                  style={{ fontSize: 20, letterSpacing: '0.25em' }}
                />
              </div>
              <button
                type="submit"
                disabled={mfaLoading || mfaVerifyCode.replace(/\s/g, '').length < 6}
                className="btn-primary flex items-center gap-2"
              >
                {mfaLoading ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                Confirmer et activer
              </button>
              <button
                type="button"
                onClick={() => { setMfaStatus('disabled'); setMfaEnrollData(null); setMfaVerifyCode(''); setMfaError(''); }}
                className="w-full font-dm-sans text-xs text-center text-text-muted hover:text-text-secondary transition-colors py-1"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Annuler
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Copilot IA */}
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl">Copilot IA</h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Personnalisez la façon dont l'assistant IA s'adresse à vous. Ces préférences sont mémorisées d'une conversation à l'autre.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Comment l'IA doit-elle vous appeler ?</label>
            <input
              className="input-field"
              value={copilotForm.copilot_addressing_name}
              onChange={e => setCopilotForm(f => ({ ...f, copilot_addressing_name: e.target.value }))}
              placeholder="Ex : Théo"
              maxLength={80}
            />
          </div>
          <div>
            <label className="label">Formule d'adresse</label>
            <div className="flex gap-2">
              {[['vous', 'Vouvoiement'], ['tu', 'Tutoiement']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCopilotForm(f => ({ ...f, copilot_formality: value }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-dm-sans transition-all border ${
                    copilotForm.copilot_formality === value
                      ? 'bg-gold/15 border-gold/40 text-gold'
                      : 'border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes pour l'IA (mémoire)</label>
            <textarea
              className="input-field resize-none min-h-24"
              value={copilotForm.copilot_memory_notes}
              onChange={e => setCopilotForm(f => ({ ...f, copilot_memory_notes: e.target.value.slice(0, 2000) }))}
              placeholder="Ex : Je gère un réseau de 40 franchisés dans la restauration rapide. Je préfère des réponses courtes et directes."
            />
            <p className="font-dm-mono text-xs text-text-muted mt-1">{copilotForm.copilot_memory_notes.length}/2000</p>
          </div>
          <button
            type="button"
            onClick={() => copilotMutation.mutate(copilotForm)}
            disabled={copilotMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {copilotMutation.isPending ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
            Enregistrer les préférences
          </button>
        </div>
      </div>

      {/* Profil — champs entreprise franchiseur, sans objet pour un avocat */}
      {!isAvocat && (
      <div className="card">
        <h2 className="font-cormorant text-xl mb-5">{t('settings.sections.profile')}</h2>
        {isLoading ? <LoadingSpinner /> : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">{t('settings.profile.company')}</label>
              <input className="input-field" value={profileForm.company_name}
                onChange={e => setProfileForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('settings.profile.phone')}</label>
              <input className="input-field" value={profileForm.phone}
                onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+33 1 23 45 67 89" />
            </div>
            <div>
              <label className="label">{t('settings.profile.address')}</label>
              <textarea className="input-field resize-none min-h-20" value={profileForm.address}
                onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
                placeholder="123 rue de la Paix, 75001 Paris" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field opacity-60" value={data?.profile?.email || ''} readOnly />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gold" />
                Email de votre avocat (optionnel)
              </label>
              <input
                className="input-field"
                type="email"
                value={profileForm.lawyer_email}
                onChange={e => setProfileForm(f => ({ ...f, lawyer_email: e.target.value }))}
                placeholder="avocat@cabinet.fr"
              />
              <p className="font-dm-sans text-xs text-text-muted mt-1">
                Permet de pré-remplir le champ d'invitation dans Mon DIP.
              </p>
            </div>
            <button type="submit" disabled={updateProfileMutation.isPending}
              className="btn-primary flex items-center gap-2">
              {updateProfileMutation.isPending ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              Enregistrer le profil
            </button>
          </form>
        )}
      </div>
      )}

      {/* Partage avocat — le franchiseur invite son avocat, sans objet côté avocat */}
      {!isAvocat && (
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gold" /> Partager avec mon avocat
          </h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Indiquez son email — il reçoit un accès direct à votre DIP et votre contrat, sans compte à créer ni mot de passe à définir.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            className="input-field text-sm flex-1 py-2"
            type="email"
            placeholder="avocat@cabinet.fr"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inviteEmail.trim() && inviteAvocatMutation.mutate(inviteEmail.trim())}
          />
          <button
            onClick={() => inviteAvocatMutation.mutate(inviteEmail.trim())}
            disabled={inviteAvocatMutation.isPending || !inviteEmail.trim()}
            className="btn-liquid-glass-prominent flex items-center gap-2 text-sm py-2 px-3 whitespace-nowrap"
          >
            {inviteAvocatMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
            Inviter
          </button>
        </div>

        {lastInviteUrl && (
          <div className="mb-6 space-y-2">
            <p className="font-dm-sans text-xs text-text-secondary">
              Lien d'accès direct — conservez-le, il reste valable même si l'email n'arrive pas :
            </p>
            <div className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2">
              <Link2 className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
              <span className="font-dm-mono text-xs text-text-primary truncate flex-1">{lastInviteUrl}</span>
              <button onClick={copyLastInviteUrl} className="btn-ghost p-1 flex-shrink-0" title="Copier le lien">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Niveau d'automatisation — décision du franchiseur, sans objet côté avocat */}
      {!isAvocat && (
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl">{t('settings.sections.automation')}</h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Définit comment DIPpro gère les changements détectés dans votre DIP
          </p>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="space-y-3">
            {AUTOMATION_LEVELS.map(({ level, title, description, badge }) => {
              const isSelected = profileForm.automation_level === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setProfileForm(f => ({ ...f, automation_level: level }))}
                  className={`w-full text-left rounded-lg p-4 border transition-all duration-200 ${
                    isSelected
                      ? 'border-gold/50 bg-gold/5'
                      : 'border-border-subtle bg-bg-elevated hover:border-border-default'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isSelected ? 'border-gold bg-gold' : 'border-border-default'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-bg-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-dm-sans text-sm font-medium text-text-primary">
                          Niveau {level} — {title}
                        </span>
                        <span className={`font-dm-mono text-xs px-2 py-0.5 rounded border ${
                          level === 1 ? 'bg-danger/10 text-danger border-danger/20' :
                          level === 2 ? 'bg-gold/10 text-gold border-gold/20' :
                          'bg-success/10 text-success border-success/20'
                        }`}>
                          {badge}
                        </span>
                      </div>
                      <p className="font-dm-sans text-xs text-text-secondary leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => automationMutation.mutate({ automation_level: profileForm.automation_level })}
              disabled={automationMutation.isPending}
              className="btn-liquid-glass w-full mt-2"
            >
              {automationMutation.isPending ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
              Enregistrer le niveau d'automatisation
            </button>
          </div>
        )}
      </div>
      )}

      {/* Notifications — rappel de renouvellement DIP, propre au franchiseur */}
      {!isAvocat && (
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl">{t('settings.sections.notifications')}</h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Choisissez comment et quand être alerté des changements
          </p>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="space-y-6">
            {/* Canaux */}
            <div>
              <p className="font-dm-sans text-sm text-text-primary mb-3">{t('settings.notifications.channels')}</p>
              <div className="space-y-3">
                {[
                  { key: 'notifications_email', label: t('settings.notifications.email'), desc: 'Reçu à votre adresse de connexion' },
                  { key: 'notifications_inapp', label: t('settings.notifications.inApp'), desc: 'Cloche et toasts dans l\'interface' },
                  { key: 'notifications_sms', label: t('settings.notifications.sms'), desc: 'Alertes critiques uniquement (bientôt)' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={profileForm[key]}
                        onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.checked }))}
                      />
                      <div className={`w-10 h-6 rounded-full transition-all duration-200 ${
                        profileForm[key] ? 'bg-gold' : 'bg-border-default'
                      }`} />
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-bg-primary transition-all duration-200 ${
                        profileForm[key] ? 'left-5' : 'left-1'
                      }`} />
                    </div>
                    <div>
                      <p className="font-dm-sans text-sm text-text-primary">{label}</p>
                      <p className="font-dm-sans text-xs text-text-secondary">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Fréquence */}
            <div>
              <p className="font-dm-sans text-sm text-text-primary mb-3">{t('settings.notifications.frequency')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'immediate', label: t('settings.notifications.immediate') },
                  { value: 'daily', label: t('settings.notifications.dailyDigest') },
                  { value: 'weekly', label: t('settings.notifications.weeklyDigest') },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProfileForm(f => ({ ...f, notification_frequency: value }))}
                    className={`py-2 px-3 rounded text-xs font-dm-sans transition-all duration-200 border ${
                      profileForm.notification_frequency === value
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-border-subtle bg-bg-elevated text-text-secondary hover:border-border-default'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seuil de renouvellement annuel */}
            <div className="pt-2 border-t border-border-subtle">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-gold" />
                <p className="font-dm-sans text-sm text-text-primary">Rappel de renouvellement DIP</p>
              </div>
              <p className="font-dm-sans text-xs text-text-secondary mb-3">
                Déclenche un rappel X jours avant la date anniversaire annuelle du DIP (Loi Doubin, mise à jour obligatoire).
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="input-field w-24 text-center"
                  value={profileForm.renewal_alert_days}
                  onChange={e => setProfileForm(f => ({ ...f, renewal_alert_days: parseInt(e.target.value, 10) || 30 }))}
                />
                <span className="font-dm-sans text-sm text-text-secondary">jours avant l'anniversaire</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => notificationsMutation.mutate({
                notifications_email: profileForm.notifications_email,
                notifications_inapp: profileForm.notifications_inapp,
                notifications_sms: profileForm.notifications_sms,
                notification_frequency: profileForm.notification_frequency,
                renewal_alert_days: profileForm.renewal_alert_days
              })}
              disabled={notificationsMutation.isPending}
              className="btn-liquid-glass w-full"
            >
              {notificationsMutation.isPending ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              Enregistrer les notifications
            </button>
          </div>
        )}
      </div>
      )}

      {/* Configuration email Resend — envoi aux franchisés, sans objet côté avocat */}
      {!isAvocat && (
      <div className="card">
        <div className="mb-5">
          <h2 className="font-cormorant text-xl">{t('settings.sections.emailService')}</h2>
          <p className="font-dm-sans text-xs text-text-secondary mt-1">
            Configurez votre compte Resend pour envoyer des emails à vos franchisés. Obtenez une clé API gratuite sur{' '}
            <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-gold hover:underline">resend.com</a>.
          </p>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="space-y-4">
            <div>
              <label className="label">Clé API Resend</label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showResendKey ? 'text' : 'password'}
                  value={resendForm.resend_api_key}
                  onChange={e => setResendForm(f => ({ ...f, resend_api_key: e.target.value }))}
                  placeholder="re_..."
                />
                <button
                  type="button"
                  onClick={() => setShowResendKey(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Nom de l'expéditeur</label>
              <input
                className="input-field"
                value={resendForm.resend_sender_name}
                onChange={e => setResendForm(f => ({ ...f, resend_sender_name: e.target.value }))}
                placeholder="DIPpro"
              />
            </div>
            <div>
              <label className="label">Email de l'expéditeur</label>
              <input
                className="input-field"
                type="email"
                value={resendForm.resend_sender_email}
                onChange={e => setResendForm(f => ({ ...f, resend_sender_email: e.target.value }))}
                placeholder="contact@monenseigne.fr"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => saveResendMutation.mutate(resendForm)}
                disabled={saveResendMutation.isPending}
                className="btn-liquid-glass flex items-center gap-2"
              >
                {saveResendMutation.isPending ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => testEmailMutation.mutate()}
                disabled={testEmailMutation.isPending || !resendForm.resend_api_key}
                className="btn-secondary flex items-center gap-2"
              >
                {testEmailMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                Tester
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Aide & présentation */}
      <div className="card">
        <h2 className="font-cormorant text-xl mb-4">Aide</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-dm-sans text-sm text-text-primary">Revoir la présentation de DIPpro</p>
            <p className="font-dm-sans text-xs text-text-muted mt-0.5">Relance le tutoriel de démarrage complet.</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('dippro-onboarding-seen');
              localStorage.removeItem('dippro-tour-v1');
              navigate('/');
            }}
            className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-gold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rejouer
          </button>
        </div>
      </div>

    </div>
  );
}
