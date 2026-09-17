import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import {
  Users, FileText, AlertTriangle, TrendingUp, Shield,
  Edit3, Trash2, Plus, Key, X, Check, Eye, ChevronDown, ChevronUp, Activity, Unlock,
  Clock, MessageSquare, Mail, PhoneCall, Bug, CheckCircle, Circle,
  Briefcase, Copy, RefreshCw, Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [createForm, setCreateForm] = useState({ email: '', password: '', company_name: '', role: 'franchiseur' });
  const [editUser, setEditUser] = useState(null);
  const [waitlistFilter, setWaitlistFilter] = useState('all');
  const [waitlistNotes, setWaitlistNotes] = useState({});
  const [showCreateAvocat, setShowCreateAvocat] = useState(false);
  const [createAvocatForm, setCreateAvocatForm] = useState({ email: '', company_name: '', franchiseur_ids: [] });
  const [linkingAvocatId, setLinkingAvocatId] = useState(null);
  const [linkFranchiseurId, setLinkFranchiseurId] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data)
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    enabled: activeTab === 'users' || activeTab === 'avocats'
  });

  const { data: avocatsData, isLoading: avocatsLoading } = useQuery({
    queryKey: ['admin-avocats'],
    queryFn: () => api.get('/admin/avocats').then(r => r.data),
    enabled: activeTab === 'avocats'
  });

  const { data: dipsData } = useQuery({
    queryKey: ['admin-dips'],
    queryFn: () => api.get('/admin/dips').then(r => r.data),
    enabled: activeTab === 'dips'
  });

  const { data: activityData } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => api.get('/admin/activity').then(r => r.data),
    enabled: activeTab === 'activity'
  });

  const { data: waitlistData, isLoading: waitlistLoading } = useQuery({
    queryKey: ['admin-waitlist', waitlistFilter],
    queryFn: () => api.get('/waitlist?status=' + waitlistFilter).then(r => r.data),
    enabled: activeTab === 'waitlist'
  });

  const { data: waitlistCountData } = useQuery({
    queryKey: ['admin-waitlist-count'],
    queryFn: () => api.get('/waitlist?status=pending').then(r => r.data)
  });

  const [bugStatusFilter, setBugStatusFilter] = useState('ouvert');
  const [bugNote, setBugNote] = useState({});

  const { data: bugsData, isLoading: bugsLoading } = useQuery({
    queryKey: ['admin-bugs', bugStatusFilter],
    queryFn: () => api.get('/bugs?status=' + bugStatusFilter).then(r => r.data),
    enabled: activeTab === 'bugs'
  });

  const { data: openBugsCount } = useQuery({
    queryKey: ['admin-bugs-count'],
    queryFn: () => api.get('/bugs?status=ouvert&limit=1').then(r => r.data)
  });

  const updateBugMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.patch('/bugs/' + id, d),
    onSuccess: () => {
      toast.success('Bug mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-bugs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bugs-count'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user', selectedUser],
    queryFn: () => api.get('/admin/users/' + selectedUser).then(r => r.data),
    enabled: !!selectedUser
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/users', d),
    onSuccess: () => {
      toast.success('Compte créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowCreateUser(false);
      setCreateForm({ email: '', password: '', company_name: '', role: 'franchiseur' });
    },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.put('/admin/users/' + id, d),
    onSuccess: () => {
      toast.success('Utilisateur mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, password }) => api.post('/admin/users/' + id + '/reset-password', { password }),
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
      setShowResetPwd(null);
      setNewPwd('');
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete('/admin/users/' + id),
    onSuccess: () => {
      toast.success('Compte supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedUser(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const unlockMutation = useMutation({
    mutationFn: (id) => api.post('/auth/mark-appointment/' + id),
    onSuccess: () => {
      toast.success('Accès débloqué — rendez-vous confirmé');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const updateWaitlistMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.patch('/waitlist/' + id, d),
    onSuccess: () => {
      toast.success('Mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist-count'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteWaitlistMutation = useMutation({
    mutationFn: (id) => api.delete('/waitlist/' + id),
    onSuccess: () => {
      toast.success('Supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist-count'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const createAvocatMutation = useMutation({
    mutationFn: (d) => api.post('/admin/avocats', d),
    onSuccess: (res) => {
      toast.success('Compte avocat créé');
      queryClient.invalidateQueries({ queryKey: ['admin-avocats'] });
      setShowCreateAvocat(false);
      setCreateAvocatForm({ email: '', company_name: '', franchiseur_ids: [] });
      copyToClipboard(res.data.access_url, 'Lien d\'accès copié — envoyez-le à l\'avocat');
    },
    onError: (err) => toast.error(err.message)
  });

  const regenerateLinkMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/avocats/${id}/regenerate-link`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-avocats'] });
      copyToClipboard(res.data.access_url, 'Nouveau lien copié — l\'ancien ne fonctionne plus');
    },
    onError: (err) => toast.error(err.message)
  });

  const linkFranchiseurMutation = useMutation({
    mutationFn: ({ avocatId, franchiseurId }) => api.post(`/admin/avocats/${avocatId}/franchiseurs`, { franchiseur_id: franchiseurId }),
    onSuccess: () => {
      toast.success('Franchiseur lié');
      queryClient.invalidateQueries({ queryKey: ['admin-avocats'] });
      setLinkingAvocatId(null);
      setLinkFranchiseurId('');
    },
    onError: (err) => toast.error(err.message)
  });

  const unlinkFranchiseurMutation = useMutation({
    mutationFn: ({ avocatId, franchiseurId }) => api.delete(`/admin/avocats/${avocatId}/franchiseurs/${franchiseurId}`),
    onSuccess: () => {
      toast.success('Franchiseur délié');
      queryClient.invalidateQueries({ queryKey: ['admin-avocats'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const copyToClipboard = (text, message) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success(message || 'Copié'),
      () => toast.error('Copie impossible — copiez le lien manuellement')
    );
  };

  const pendingWaitlist = waitlistCountData?.pending || 0;
  const openBugs = openBugsCount?.total || 0;
  const franchiseurOptions = (usersData?.users || []).filter(u => u.role === 'franchiseur');

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { key: 'users', label: 'Franchiseurs', icon: Users },
    { key: 'avocats', label: 'Avocats', icon: Briefcase },
    { key: 'dips', label: 'Tous les DIPs', icon: FileText },
    { key: 'activity', label: 'Activité', icon: Activity },
    { key: 'waitlist', label: 'Liste d\'attente', icon: Clock, badge: pendingWaitlist },
    { key: 'bugs', label: 'Bugs', icon: Bug, badge: openBugs, badgeColor: 'bg-danger' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Console Administrateur"
        subtitle="Gestion globale de la plateforme DIPpro"
        action={
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded px-3 py-1.5">
            <Shield className="w-3.5 h-3.5 text-danger" />
            <span className="font-dm-mono text-xs text-danger">Accès Admin</span>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-bg-elevated rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-dm-sans transition-all ${
              activeTab === t.key ? 'bg-gold text-bg-primary font-medium' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-dm-mono bg-danger text-white font-bold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {statsLoading ? <LoadingSpinner size="lg" /> : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Franchiseurs', value: stats?.totalUsers || 0, icon: Users, color: 'text-gold' },
                  { label: 'DIPs analysés', value: stats?.totalDips || 0, icon: FileText, color: 'text-text-primary' },
                  { label: 'Franchisés', value: stats?.totalFranchisees || 0, icon: Users, color: 'text-success' },
                  { label: 'Alertes en attente', value: stats?.pendingAlerts || 0, icon: AlertTriangle, color: 'text-danger' },
                  { label: 'Score moyen', value: `${stats?.avgScore || 0}%`, icon: TrendingUp, color: 'text-gold' }
                ].map((s, i) => (
                  <div key={i} className="card">
                    <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                    <p className={`font-cormorant text-3xl ${s.color}`}>{s.value}</p>
                    <p className="font-dm-sans text-xs text-text-secondary mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="card">
                <h2 className="font-cormorant text-xl text-text-primary mb-4">Activité récente</h2>
                <div className="space-y-2">
                  {stats?.recentActivity?.slice(0, 8).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                      <span className="font-dm-mono text-xs text-gold/60 w-32 flex-shrink-0">{a.action}</span>
                      <span className="font-dm-sans text-xs text-text-secondary flex-1">{a.user_id?.substring(0, 8)}...</span>
                      <span className="font-dm-mono text-xs text-text-muted">
                        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateUser(true)} className="btn-liquid-glass">
              <Plus className="w-4 h-4" /> Créer un compte
            </button>
          </div>

          {/* Create modal */}
          {showCreateUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreateUser(false)} />
              <div className="relative card w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-cormorant text-xl text-text-primary">Créer un compte</h3>
                  <button onClick={() => setShowCreateUser(false)}><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="label">Email</label>
                    <input className="input-field" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="email@franchise.fr" /></div>
                  <div><label className="label">Mot de passe</label>
                    <input className="input-field" type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 caractères" /></div>
                  <div><label className="label">Société</label>
                    <input className="input-field" value={createForm.company_name} onChange={e => setCreateForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Ma Franchise SAS" /></div>
                  <div><label className="label">Rôle</label>
                    <select className="input-field" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="franchiseur">Franchiseur</option>
                      <option value="avocat">Avocat</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending} className="btn-liquid-glass-prominent w-full">
                    {createMutation.isPending ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                    Créer le compte
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset password modal */}
          {showResetPwd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70" onClick={() => setShowResetPwd(null)} />
              <div className="relative card w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-cormorant text-xl text-text-primary">Réinitialiser le mot de passe</h3>
                  <button onClick={() => setShowResetPwd(null)}><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
                <input className="input-field mb-4" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe (min. 8 car.)" />
                <button
                  onClick={() => resetPwdMutation.mutate({ id: showResetPwd, password: newPwd })}
                  disabled={newPwd.length < 8 || resetPwdMutation.isPending}
                  className="btn-liquid-glass-prominent w-full"
                >
                  {resetPwdMutation.isPending ? <LoadingSpinner size="sm" /> : <Key className="w-4 h-4" />}
                  Réinitialiser
                </button>
              </div>
            </div>
          )}

          {/* Users list */}
          {usersLoading ? <LoadingSpinner size="lg" /> : (
            <div className="space-y-2">
              {(usersData?.users || []).map(u => (
                <div key={u.id} className={`card transition-all ${selectedUser === u.id ? 'border-gold/40' : ''}`}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-cormorant text-lg text-gold">{(u.company_name || u.email)[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-dm-sans text-sm font-medium text-text-primary">{u.company_name || '—'}</p>
                      <p className="font-dm-mono text-xs text-text-secondary">{u.email}</p>
                    </div>
                    <span className={`font-dm-mono text-xs px-2 py-0.5 rounded border ${
                      u.role === 'admin' ? 'text-danger border-danger/30 bg-danger/10' : 'text-gold border-gold/20 bg-gold/5'
                    }`}>{u.role}</span>
                    {u.role !== 'admin' && u.role !== 'avocat' && (
                      <span className={`font-dm-mono text-xs px-2 py-0.5 rounded border ${
                        u.appointment_booked
                          ? 'text-success border-success/30 bg-success/10'
                          : u.trial_expires_at && new Date() > new Date(u.trial_expires_at)
                          ? 'text-danger border-danger/30 bg-danger/10'
                          : 'text-text-secondary border-border-subtle bg-bg-elevated'
                      }`}>
                        {u.appointment_booked ? 'Actif' : u.trial_expires_at && new Date() > new Date(u.trial_expires_at) ? 'Expiré' : 'Essai'}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.role !== 'admin' && u.role !== 'avocat' && !u.appointment_booked && (
                        <button
                          onClick={() => { if (confirm(`Débloquer l'accès de ${u.email} ?`)) unlockMutation.mutate(u.id); }}
                          title="Débloquer l'accès (RDV confirmé)"
                          disabled={unlockMutation.isPending}
                          className="p-1.5 rounded hover:bg-success/10 text-text-secondary hover:text-success transition-colors"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)} title="Voir détails"
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditUser(u)} title="Modifier"
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowResetPwd(u.id)} title="Réinitialiser mot de passe"
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors">
                        <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`Supprimer ${u.email} ?`)) deleteMutation.mutate(u.id); }} title="Supprimer"
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Edit inline */}
                  {editUser?.id === u.id && (
                    <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="label">Société</label>
                        <input className="input-field" value={editUser.company_name || ''} onChange={e => setEditUser(f => ({ ...f, company_name: e.target.value }))} /></div>
                      <div><label className="label">Rôle</label>
                        <select className="input-field" value={editUser.role} onChange={e => setEditUser(f => ({ ...f, role: e.target.value }))}>
                          <option value="franchiseur">Franchiseur</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <button onClick={() => updateMutation.mutate(editUser)} className="btn-liquid-glass flex-1">
                          <Check className="w-4 h-4" /> Enregistrer
                        </button>
                        <button onClick={() => setEditUser(null)} className="btn-secondary">Annuler</button>
                      </div>
                    </div>
                  )}

                  {/* Detail panel */}
                  {selectedUser === u.id && userDetail && (
                    <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-dm-mono text-xs text-gold mb-2">DIPs ({userDetail.dips?.length || 0})</p>
                        {userDetail.dips?.map(d => (
                          <p key={d.id} className="font-dm-sans text-xs text-text-secondary py-1 border-b border-border-subtle">
                            {d.title} — <span className="text-gold">{d.conformity_score}%</span>
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="font-dm-mono text-xs text-gold mb-2">Franchisés ({userDetail.franchisees?.length || 0})</p>
                        {userDetail.franchisees?.map(f => (
                          <p key={f.id} className="font-dm-sans text-xs text-text-secondary py-1 border-b border-border-subtle">{f.name} — {f.email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AVOCATS */}
      {activeTab === 'avocats' && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="font-dm-sans text-xs text-text-secondary max-w-md leading-relaxed">
              Un compte avocat n'a pas de mot de passe — l'accès se fait uniquement via le lien
              permanent ci-dessous, à transmettre par n'importe quel canal. Il reste valable tant
              qu'il n'est pas régénéré.
            </p>
            <button onClick={() => setShowCreateAvocat(true)} className="btn-liquid-glass flex-shrink-0">
              <Plus className="w-4 h-4" /> Créer un compte avocat
            </button>
          </div>

          {showCreateAvocat && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreateAvocat(false)} />
              <div className="relative card w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-cormorant text-xl text-text-primary">Créer un compte avocat</h3>
                  <button onClick={() => setShowCreateAvocat(false)}><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="label">Email</label>
                    <input className="input-field" type="email" value={createAvocatForm.email}
                      onChange={e => setCreateAvocatForm(f => ({ ...f, email: e.target.value }))} placeholder="avocat@cabinet.fr" /></div>
                  <div><label className="label">Nom du cabinet</label>
                    <input className="input-field" value={createAvocatForm.company_name}
                      onChange={e => setCreateAvocatForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Cabinet Dupont & Associés" /></div>
                  <div>
                    <label className="label">Lier immédiatement à des franchiseurs (optionnel)</label>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-border-subtle p-2">
                      {franchiseurOptions.length === 0 && (
                        <p className="font-dm-sans text-xs text-text-muted px-1 py-1">Aucun franchiseur pour le moment.</p>
                      )}
                      {franchiseurOptions.map(f => (
                        <label key={f.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-bg-elevated cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createAvocatForm.franchiseur_ids.includes(f.id)}
                            onChange={e => setCreateAvocatForm(fo => ({
                              ...fo,
                              franchiseur_ids: e.target.checked
                                ? [...fo.franchiseur_ids, f.id]
                                : fo.franchiseur_ids.filter(id => id !== f.id),
                            }))}
                          />
                          <span className="font-dm-sans text-xs text-text-secondary">{f.company_name || f.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => createAvocatMutation.mutate(createAvocatForm)}
                    disabled={createAvocatMutation.isPending || !createAvocatForm.email.trim() || !createAvocatForm.company_name.trim()}
                    className="btn-liquid-glass-prominent w-full"
                  >
                    {createAvocatMutation.isPending ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                    Créer et copier le lien d'accès
                  </button>
                </div>
              </div>
            </div>
          )}

          {avocatsLoading ? <LoadingSpinner size="lg" /> : (
            <div className="space-y-2">
              {(avocatsData?.avocats || []).length === 0 && (
                <div className="card text-center py-12">
                  <Briefcase className="w-8 h-8 mx-auto mb-3 text-text-muted" />
                  <p className="font-dm-sans text-sm text-text-secondary">Aucun compte avocat pour le moment.</p>
                </div>
              )}
              {(avocatsData?.avocats || []).map(a => (
                <div key={a.id} className="card">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-dm-sans text-sm font-medium text-text-primary">{a.company_name || '—'}</p>
                      <p className="font-dm-mono text-xs text-text-secondary">{a.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard(a.access_url, 'Lien d\'accès copié')}
                        title="Copier le lien d'accès"
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Régénérer le lien de ${a.email} ? L'ancien lien cessera de fonctionner.`)) regenerateLinkMutation.mutate(a.id); }}
                        title="Régénérer le lien"
                        disabled={regenerateLinkMutation.isPending}
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setLinkingAvocatId(linkingAvocatId === a.id ? null : a.id)}
                        title="Lier à un franchiseur"
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-gold transition-colors"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(a.franchiseurs || []).length === 0 ? (
                      <span className="font-dm-mono text-xs text-text-muted">Aucun franchiseur lié</span>
                    ) : a.franchiseurs.map(f => (
                      <span key={f.id} className="flex items-center gap-1.5 font-dm-mono text-xs px-2 py-0.5 rounded border border-border-subtle bg-bg-elevated text-text-secondary">
                        {f.company_name || f.id}
                        <button onClick={() => unlinkFranchiseurMutation.mutate({ avocatId: a.id, franchiseurId: f.id })} title="Délier">
                          <X className="w-3 h-3 hover:text-danger" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {linkingAvocatId === a.id && (
                    <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
                      <select className="input-field flex-1 min-w-[200px]" value={linkFranchiseurId} onChange={e => setLinkFranchiseurId(e.target.value)}>
                        <option value="">Choisir un franchiseur…</option>
                        {franchiseurOptions
                          .filter(f => !(a.franchiseurs || []).some(af => af.id === f.id))
                          .map(f => <option key={f.id} value={f.id}>{f.company_name || f.email}</option>)}
                      </select>
                      <button
                        onClick={() => linkFranchiseurMutation.mutate({ avocatId: a.id, franchiseurId: linkFranchiseurId })}
                        disabled={!linkFranchiseurId || linkFranchiseurMutation.isPending}
                        className="btn-liquid-glass"
                      >
                        <Check className="w-4 h-4" /> Lier
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DIPS */}
      {activeTab === 'dips' && (
        <div className="space-y-2">
          {(dipsData?.dips || []).map(d => (
            <div key={d.id} className="card flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-dm-sans text-sm font-medium text-text-primary truncate">{d.title}</p>
                <p className="font-dm-mono text-xs text-text-secondary">{d.users?.company_name || d.users?.email || '—'}</p>
              </div>
              <StatusBadge status={d.status} />
              <span className="font-cormorant text-xl text-gold">{d.conformity_score}%</span>
              <span className="font-dm-mono text-xs text-text-muted">
                {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="card">
          <h2 className="font-cormorant text-xl text-text-primary mb-4">Journal d'activité global</h2>
          <div className="space-y-2">
            {(activityData?.activity || []).map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border-subtle last:border-0">
                <span className="font-dm-mono text-xs text-gold/70 w-36 flex-shrink-0">{a.action}</span>
                <span className="font-dm-sans text-xs text-text-secondary flex-1">{a.users?.company_name || a.users?.email || a.user_id?.substring(0, 8)}</span>
                <span className="font-dm-mono text-xs text-text-muted flex-shrink-0">
                  {new Date(a.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WAITLIST */}
      {activeTab === 'waitlist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-cormorant text-xl text-text-primary">Liste d'attente</h2>
              {waitlistData?.pending > 0 && (
                <span className="font-dm-mono text-xs px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger">
                  {waitlistData.pending} en attente
                </span>
              )}
            </div>
            <span className="font-dm-sans text-sm text-text-secondary">{waitlistData?.total || 0} inscriptions</span>
          </div>

          {/* Filtres statut */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'pending', label: 'En attente' },
              { key: 'contacted', label: 'Contacté' },
              { key: 'converted', label: 'Converti' },
              { key: 'dismissed', label: 'Refusé' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setWaitlistFilter(f.key)}
                className={`px-3 py-1.5 rounded font-dm-sans text-xs transition-all ${
                  waitlistFilter === f.key ? 'bg-gold text-bg-primary font-medium' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {waitlistLoading ? <LoadingSpinner size="lg" /> : (
            <div className="space-y-3">
              {(waitlistData?.waitlist || []).length === 0 ? (
                <div className="card text-center py-12">
                  <Clock className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="font-dm-sans text-sm text-text-secondary">Aucune inscription{waitlistFilter !== 'all' ? ' dans cette catégorie' : ''}</p>
                </div>
              ) : (
                (waitlistData?.waitlist || []).map(w => (
                  <div key={w.id} className="card space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-cormorant text-lg text-gold">{(w.company_name || w.email)[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-dm-sans text-sm font-medium text-text-primary">{w.company_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <a href={`mailto:${w.email}`} className="font-dm-mono text-xs text-gold hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" />{w.email}
                          </a>
                          {w.phone && (
                            <a href={`tel:${w.phone}`} className="font-dm-mono text-xs text-text-secondary hover:text-text-primary flex items-center gap-1">
                              <PhoneCall className="w-3 h-3" />{w.phone}
                            </a>
                          )}
                        </div>
                        {w.message && (
                          <p className="font-dm-sans text-xs text-text-secondary mt-1 italic">" {w.message} "</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`font-dm-mono text-xs px-2 py-0.5 rounded border ${
                          w.status === 'pending' ? 'text-warning border-warning/30 bg-warning/5' :
                          w.status === 'contacted' ? 'text-blue-400 border-blue-400/30 bg-blue-400/5' :
                          w.status === 'converted' ? 'text-success border-success/30 bg-success/10' :
                          'text-text-muted border-border-subtle bg-bg-elevated'
                        }`}>{w.status}</span>
                        <span className="font-dm-mono text-xs text-text-muted">
                          {formatDistanceToNow(new Date(w.created_at), { addSuffix: true, locale: fr })}
                        </span>
                        <span className={`font-dm-mono text-xs px-1.5 py-0.5 rounded ${
                          w.source === 'trial_expired' ? 'bg-danger/10 text-danger/80' :
                          w.source === 'register' ? 'bg-bg-elevated text-text-muted' :
                          'bg-bg-elevated text-text-muted'
                        }`}>{w.source}</span>
                      </div>
                    </div>

                    {/* Actions statut */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border-subtle">
                      <span className="font-dm-sans text-xs text-text-muted mr-1">Statut :</span>
                      {['pending', 'contacted', 'converted', 'dismissed'].map(s => (
                        <button
                          key={s}
                          onClick={() => updateWaitlistMutation.mutate({ id: w.id, status: s })}
                          disabled={w.status === s || updateWaitlistMutation.isPending}
                          className={`px-2 py-1 rounded text-xs font-dm-sans transition-all ${
                            w.status === s
                              ? 'bg-gold text-bg-primary font-medium cursor-default'
                              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                      <div className="flex-1" />
                      <button
                        onClick={() => { if (confirm('Supprimer cette entrée ?')) deleteWaitlistMutation.mutate(w.id); }}
                        disabled={deleteWaitlistMutation.isPending}
                        className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-danger transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Notes */}
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <input
                        className="input-field flex-1 text-xs py-1.5"
                        placeholder="Note interne…"
                        value={waitlistNotes[w.id] ?? (w.notes || '')}
                        onChange={e => setWaitlistNotes(n => ({ ...n, [w.id]: e.target.value }))}
                        onBlur={() => {
                          const val = waitlistNotes[w.id];
                          if (val !== undefined && val !== w.notes) {
                            updateWaitlistMutation.mutate({ id: w.id, notes: val });
                          }
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Bugs ───────────────────────────────────────────────── */}
      {activeTab === 'bugs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-cormorant text-xl text-text-primary">Signalements de bugs</h2>
              {openBugs > 0 && (
                <span className="font-dm-mono text-xs px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger">
                  {openBugs} ouvert{openBugs > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <span className="font-dm-sans text-sm text-text-secondary">{bugsData?.total || 0} total</span>
          </div>

          {/* Filtres statut */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ouvert', label: 'Ouverts' },
              { key: 'en_cours', label: 'En cours' },
              { key: 'résolu', label: 'Résolus' },
              { key: 'ignoré', label: 'Ignorés' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setBugStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded font-dm-sans text-xs transition-all ${
                  bugStatusFilter === f.key ? 'bg-gold text-bg-primary font-medium' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {bugsLoading ? <LoadingSpinner size="lg" /> : (
            <div className="space-y-3">
              {(bugsData?.bugs || []).length === 0 ? (
                <div className="card text-center py-12">
                  <Bug className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="font-dm-sans text-sm text-text-secondary">Aucun bug dans cette catégorie</p>
                </div>
              ) : (
                (bugsData?.bugs || []).map(bug => (
                  <div key={bug.id} className="card space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Gravité */}
                      <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        bug.severity === 'bloquant' ? 'bg-danger' :
                        bug.severity === 'normal' ? 'bg-gold' : 'bg-success'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`font-dm-mono text-xs px-2 py-0.5 rounded border ${
                            bug.severity === 'bloquant' ? 'text-danger border-danger/30 bg-danger/5' :
                            bug.severity === 'normal' ? 'text-gold border-gold/30 bg-gold/5' :
                            'text-success border-success/30 bg-success/5'
                          }`}>
                            {bug.severity}
                          </span>
                          <span className="font-dm-sans text-xs text-text-muted">
                            {bug.user_company || bug.user_email || 'Visiteur'}
                          </span>
                          <span className="font-dm-mono text-xs text-text-muted">
                            {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        <p className="font-dm-sans text-sm text-text-primary whitespace-pre-wrap">{bug.description}</p>
                        {bug.page_url && (
                          <p className="font-dm-mono text-xs text-text-muted mt-1 truncate">{bug.page_url}</p>
                        )}
                        {bug.error_stack && (
                          <pre className="mt-2 p-2 rounded bg-bg-elevated font-dm-mono text-xs text-text-muted overflow-x-auto max-h-28">
                            {bug.error_stack.slice(0, 400)}
                          </pre>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <select
                          value={bug.status}
                          onChange={e => updateBugMutation.mutate({ id: bug.id, status: e.target.value })}
                          className="font-dm-sans text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary cursor-pointer"
                        >
                          <option value="ouvert">Ouvert</option>
                          <option value="en_cours">En cours</option>
                          <option value="résolu">Résolu</option>
                          <option value="ignoré">Ignoré</option>
                        </select>
                      </div>
                    </div>

                    {/* Note admin */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Note interne…"
                        value={bugNote[bug.id] ?? (bug.admin_note || '')}
                        onChange={e => setBugNote(n => ({ ...n, [bug.id]: e.target.value }))}
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (val !== (bug.admin_note || '')) {
                            updateBugMutation.mutate({ id: bug.id, admin_note: val });
                          }
                        }}
                        className="input-field flex-1 text-xs py-1.5"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
