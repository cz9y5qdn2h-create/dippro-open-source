import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import RedlineView from '../components/RedlineView';
import RichTextView from '../components/document/RichTextView';
import FormattingToolbar from '../components/document/FormattingToolbar';
import {
  Edit3, Check, X, AlertCircle,
  ArrowLeft, FileText, ScrollText, Download, Paperclip, Trash2,
  ChevronDown, Building2, Send, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const SECTION_DESCRIPTIONS = [
  '',
  'Raison sociale, forme juridique, capital, dirigeants, RCS, adresse du siège social, domiciliation bancaire.',
  'Date de création de l\'enseigne, historique du dirigeant sur les 5 dernières années, état général et LOCAL du marché avec perspectives de développement (R.330-1, 4°).',
  'Nombre de franchisés, implantations, ouvertures et fermetures des 2 dernières années, présence d\'un concurrent autorisé dans la zone, résultats réels des sites pilotes.',
  'Comptes annuels des 2 derniers exercices (bilan, compte de résultat).',
  'Marques déposées, brevets, savoir-faire protégé, durée de protection (ou durée de la licence si la marque est concédée et non cédée).',
  'Droits d\'entrée, redevances, CA moyen des franchisés, tableaux financiers.',
  'Zone d\'exclusivité territoriale, conditions de modification.',
  'Durée du contrat, conditions de renouvellement, de résiliation et clause de non-concurrence post-contractuelle.',
  'Litiges en cours et survenus dans les 5 dernières années.',
  'Comptes prévisionnels d\'un point de vente type.',
];

const STATUS_LABEL = { conforme: 'Conforme', a_verifier: 'À vérifier', non_conforme: 'Non conforme' };

async function downloadBlob(path, filename) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DIPAvocatPage() {
  const { franchiseurId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dip');
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { data: dipData, isLoading: dipLoading, isError: dipError } = useQuery({
    queryKey: ['avocat', 'dip', franchiseurId],
    queryFn: () => api.get(`/avocat/franchiseur/${franchiseurId}/dip`).then(r => r.data),
  });

  const { data: contractData, isLoading: contractLoading } = useQuery({
    queryKey: ['avocat', 'contract', franchiseurId],
    queryFn: () => api.get(`/avocat/franchiseur/${franchiseurId}/contract`).then(r => r.data),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['avocat', 'dashboard'],
    queryFn: () => api.get('/avocat/dashboard').then(r => r.data),
  });
  const clients = dashboardData?.franchiseurs || [];

  if (dipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-primary))' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dipError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center" style={{ background: 'rgb(var(--bg-primary))' }}>
        <AlertCircle className="w-10 h-10 text-danger/50" />
        <p className="display-v2" style={{ fontSize: 28 }}>Accès refusé</p>
        <Link to="/dashboard" className="btn-cta-glow">
          <ArrowLeft className="w-4 h-4" /> Retour au dashboard
        </Link>
      </div>
    );
  }

  const { dip, franchiseur } = dipData;
  const contract = contractData?.contract || null;

  return (
    <div className="min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8" style={{ background: 'rgb(var(--bg-primary))' }}>
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        {/* En-tête : retour + sélecteur de client */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            <ArrowLeft className="w-4 h-4" /> Tableau de bord
          </Link>

          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(v => !v)}
              className="card-v2 flex items-center gap-2 py-2 px-3"
              style={{ cursor: 'pointer' }}
            >
              <Building2 className="w-4 h-4" style={{ color: 'var(--v2-gold)' }} />
              <span className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{franchiseur?.company_name}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgb(var(--text-muted))' }} />
            </button>
            {switcherOpen && (
              <div className="absolute right-0 mt-2 w-64 card-v2 z-20 py-1" style={{ background: 'rgb(var(--bg-card))', maxWidth: 'calc(100vw - 32px)' }}>
                {clients.map(c => (
                  <button
                    key={c.franchiseur_id}
                    onClick={() => { setSwitcherOpen(false); navigate(`/dip/avocat/${c.franchiseur_id}`); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-dm-sans hover:bg-white/5 transition-colors flex items-center justify-between gap-2"
                    style={{ color: c.franchiseur_id === franchiseurId ? 'var(--v2-gold)' : 'rgb(var(--text-primary))' }}
                  >
                    <span className="truncate">{c.franchiseur?.company_name || c.franchiseur_id}</span>
                    {typeof c.latestDip?.conformity_score === 'number' && (
                      <span className="mono-label-v2" style={{ fontSize: 10 }}>{c.latestDip.conformity_score}%</span>
                    )}
                  </button>
                ))}
                {clients.length === 0 && (
                  <p className="px-3 py-2 text-xs font-dm-sans" style={{ color: 'rgb(var(--text-muted))' }}>Aucun autre client</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mono-label-v2">Espace avocat</p>
          <p className="display-v2" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>{franchiseur?.company_name || 'Dossier franchiseur'}</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-2">
          {[
            { key: 'dip', label: 'DIP', icon: FileText },
            { key: 'contrat', label: 'Contrat de franchise', icon: ScrollText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-dm-sans transition-all"
              style={tab === key
                ? { background: 'var(--v2-gold)', color: '#F4ECE9', fontWeight: 600 }
                : { background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'rgb(var(--text-secondary))' }}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === 'dip' && (
          dip
            ? <DocumentView mode="dip" dip={dip} franchiseurId={franchiseurId} franchiseur={franchiseur} />
            : <EmptyState label="Ce franchiseur n'a pas encore de DIP actif." />
        )}

        {tab === 'contrat' && (
          contractLoading
            ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            : contract
              ? <DocumentView mode="contract" contract={contract} franchiseurId={franchiseurId} franchiseur={franchiseur} />
              : <EmptyState label="Ce franchiseur n'a pas encore de contrat actif." />
        )}
      </div>
    </div>
  );
}

function HistoryItem({ proposal: p }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs font-dm-sans">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2 text-left">
        <ChevronDown className="w-3 h-3 flex-shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'rgb(var(--text-muted))' }} />
        <span style={{ color: p.status === 'accepted' ? 'rgb(91 216 154)' : 'rgb(241 124 124)' }}>
          {p.status === 'accepted' ? '✓ Acceptée' : '✗ Rejetée'}
        </span>
        <span style={{ color: 'rgb(var(--text-muted))' }}>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: fr })}</span>
      </button>
      {open && (
        <div className="mt-2 mb-1 ml-5 rounded-lg p-3" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)' }}>
          <RedlineView before={p.content_before ?? ''} after={p.content_proposed} className="text-xs" />
          {p.reviewer_comment && (
            <p className="mt-2 pt-2 italic" style={{ borderTop: '1px solid var(--v2-border)', color: 'rgb(var(--text-muted))' }}>
              « {p.reviewer_comment} »
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="card-v2 text-center py-16">
      <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: 'rgb(var(--text-muted))' }} />
      <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</p>
    </div>
  );
}

// Vue "document" continue (façon Word/Pages) : toutes les trames s'enchaînent
// dans un même scroll, chacune éditable sur place. Le pastille flottante
// (oval transparent) indique la position de lecture — mise à jour par
// IntersectionObserver, sans dépendre d'un état d'index unique par trame.
function DocumentView({ mode, dip, contract, franchiseurId, franchiseur }) {
  const isDip = mode === 'dip';
  const items = isDip
    ? (dip?.dip_sections || []).slice().sort((a, b) => a.section_number - b.section_number)
    : (contract?.contract_clauses || []).slice().sort((a, b) => a.clause_number - b.clause_number);

  const proposalsQueryKey = isDip ? ['avocat', 'dip', franchiseurId] : ['avocat', 'contract', franchiseurId];
  const { data } = useQuery({
    queryKey: proposalsQueryKey,
    queryFn: () => api.get(`/avocat/franchiseur/${franchiseurId}/${isDip ? 'dip' : 'contract'}`).then(r => r.data),
  });
  const proposals = data?.proposals || [];
  const globalScore = isDip ? dip.conformity_score : contract.conformity_score;

  const sectionRefs = useRef(new Map());
  const [activeId, setActiveId] = useState(items[0]?.id);
  const activeIndex = Math.max(0, items.findIndex(it => it.id === activeId));
  const activeItem = items[activeIndex] || items[0];

  const registerRef = useCallback((id, el) => {
    if (el) sectionRefs.current.set(id, el);
    else sectionRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('data-section-id');
        if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
        else visible.delete(id);
      });
      let bestId = null, bestRatio = -1;
      for (const it of items) {
        const ratio = visible.get(it.id);
        if (ratio !== undefined && ratio > bestRatio) { bestRatio = ratio; bestId = it.id; }
      }
      if (bestId) setActiveId(bestId);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    items.forEach(it => {
      const el = sectionRefs.current.get(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(it => it.id).join(',')]);

  const scrollToIndex = useCallback((i) => {
    if (i < 0 || i >= items.length) return;
    sectionRefs.current.get(items[i].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [items]);

  useEffect(() => {
    const onKey = (e) => {
      if (['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight') scrollToIndex(activeIndex + 1);
      if (e.key === 'ArrowLeft') scrollToIndex(activeIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, scrollToIndex]);

  const handleDownload = async () => {
    try {
      if (isDip) await downloadBlob(`/export/${dip.id}/document-pdf`, `DIP_${(dip.title || 'document').replace(/[^a-z0-9]/gi, '_')}.pdf`);
      else await downloadBlob(`/contracts/${contract.id}/pdf`, `Contrat_${(contract.title || 'franchise').replace(/[^a-z0-9]/gi, '_')}.pdf`);
      toast.success('PDF téléchargé');
    } catch {
      toast.error('Impossible de générer le PDF');
    }
  };

  const [sendModalOpen, setSendModalOpen] = useState(false);

  if (!items.length) return <EmptyState label="Aucune section disponible." />;

  return (
    <div className="space-y-4">
      {/* Barre de progression + score global */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-0.5">
            <p className="mono-label-v2">Document — {items.length} trames</p>
            <p className="mono-label-v2">Conformité globale — {globalScore}%</p>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--v2-border)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((activeIndex + 1) / items.length) * 100}%`, background: 'var(--v2-gold)' }} />
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleDownload} className="btn-cta-glow text-xs py-2 px-4 justify-center">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button onClick={() => setSendModalOpen(true)} className="btn-cta-glow text-xs py-2 px-4 justify-center">
            <Send className="w-3.5 h-3.5" /> Envoyer au client
          </button>
        </div>
      </div>

      {sendModalOpen && (
        <SendToClientModal
          isDip={isDip}
          documentId={isDip ? dip.id : contract.id}
          defaultEmail={franchiseur?.email}
          defaultName={franchiseur?.company_name}
          onClose={() => setSendModalOpen(false)}
        />
      )}

      {/* Navigation rapide — clique = scroll direct vers la trame */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {items.map((it, i) => {
          const status = it.status;
          return (
            <button
              key={it.id}
              onClick={() => scrollToIndex(i)}
              title={isDip ? it.section_title : it.clause_title}
              className="flex-shrink-0 w-8 h-8 rounded-lg text-xs font-dm-mono flex items-center justify-center transition-all"
              style={{
                background: i === activeIndex ? 'var(--v2-gold)' : 'var(--v2-surface)',
                border: `1px solid ${i === activeIndex ? 'var(--v2-gold)' : 'var(--v2-border)'}`,
                color: i === activeIndex ? '#F4ECE9' : status === 'non_conforme' ? 'rgb(241 124 124)' : status === 'a_verifier' ? 'var(--v2-gold)' : 'rgb(91 216 154)',
                fontWeight: i === activeIndex ? 700 : 400,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Document continu — une trame par bloc, éditable sur place */}
      <div className="space-y-6">
        {items.map((item, i) => (
          <DocumentSectionItem
            key={item.id}
            item={item}
            number={i + 1}
            isDip={isDip}
            dip={dip}
            contract={contract}
            franchiseur={franchiseur}
            proposals={proposals}
            proposalsQueryKey={proposalsQueryKey}
            registerRef={registerRef}
          />
        ))}
      </div>

      {/* Annexes du document entier — comme sur un acte juridique, énumérées
          à la fin, jamais éparpillées section par section. */}
      <div className="card-v2">
        <AnnexManager
          dipId={isDip ? dip.id : undefined}
          contractId={isDip ? undefined : contract.id}
          ownerId={franchiseur?.id}
        />
      </div>

      {/* Indicateur flottant de position — oval transparent, toujours visible */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Retour en haut du document"
        style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 18px', borderRadius: 999,
          background: 'rgba(20,20,22,0.55)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          border: '1px solid var(--v2-border-hot)', boxShadow: '0 14px 32px -14px rgba(0,0,0,0.65)',
          cursor: 'pointer', maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <span className="font-dm-mono" style={{ fontSize: 11, color: 'var(--v2-gold)', letterSpacing: '0.05em', flexShrink: 0 }}>
          {activeIndex + 1} / {items.length}
        </span>
        <span style={{ width: 1, height: 14, background: 'var(--v2-border)', flexShrink: 0 }} />
        <span
          className="font-dm-sans"
          style={{ fontSize: 12, color: 'rgb(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {isDip ? activeItem?.section_title : activeItem?.clause_title}
        </span>
      </button>
    </div>
  );
}

function SendToClientModal({ isDip, documentId, defaultEmail, defaultName, onClose }) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [name, setName] = useState(defaultName || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const sendPath = isDip ? `/avocat/dip/${documentId}/send-to-client` : `/avocat/contract/${documentId}/send-to-client`;

  const sendMutation = useMutation({
    mutationFn: () => api.post(sendPath, {
      recipient_email: email,
      recipient_name: name,
      subject: subject.trim() || undefined,
      message: message.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Document envoyé');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Échec de l\'envoi'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'rgb(var(--bg-primary))', border: '1px solid var(--v2-border-hot)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="display-v2 flex items-center gap-2" style={{ fontSize: 18 }}>
            <Mail className="w-4 h-4" style={{ color: 'var(--v2-gold)' }} /> Envoyer au client
          </p>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'rgb(var(--text-muted))' }} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mono-label-v2 mb-1 block">Destinataire</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="destinataire@exemple.fr"
              className="w-full font-dm-sans text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'rgb(var(--text-primary))' }} />
          </div>
          <div>
            <label className="mono-label-v2 mb-1 block">Nom <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full font-dm-sans text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'rgb(var(--text-primary))' }} />
          </div>
          <div>
            <label className="mono-label-v2 mb-1 block">Objet <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder={isDip ? "Document d'Information Précontractuelle" : 'Contrat de franchise'}
              className="w-full font-dm-sans text-sm px-3 py-2 rounded-lg outline-none"
              style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'rgb(var(--text-primary))' }} />
          </div>
          <div>
            <label className="mono-label-v2 mb-1 block">Message <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Bonjour, veuillez trouver ci-joint..."
              className="w-full font-dm-sans text-sm px-3 py-2 rounded-lg outline-none resize-none"
              style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', color: 'rgb(var(--text-primary))' }} />
          </div>
          <p className="font-dm-sans text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            Le PDF à jour est généré et joint automatiquement à l&apos;envoi.
          </p>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={!email.trim() || sendMutation.isPending}
            className="btn-cta-glow text-sm w-full justify-center"
          >
            {sendMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />} Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentSectionItem({ item, number, isDip, dip, contract, franchiseur, proposals, proposalsQueryKey, registerRef }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef(null);

  const itemProposals = isDip
    ? proposals.filter(p => p.section_id === item.id)
    : proposals.filter(p => p.clause_id === item.id);
  const pendingProposal = itemProposals.find(p => p.status === 'pending');
  const reviewedProposals = itemProposals.filter(p => p.status !== 'pending').slice(0, 3);

  const proposeMutation = useMutation({
    mutationFn: ({ content }) => isDip
      ? api.post(`/avocat/sections/${item.id}/propose`, { content, dip_id: dip.id })
      : api.post(`/avocat/clauses/${item.id}/propose`, { content, contract_id: contract.id }),
    onSuccess: () => {
      toast.success('Proposition envoyée au franchiseur');
      queryClient.invalidateQueries({ queryKey: proposalsQueryKey });
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const title = isDip ? item.section_title : item.clause_title;

  return (
    <motion.div
      ref={el => registerRef(item.id, el)}
      data-section-id={item.id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="slide-v2"
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="mono-label-v2 mb-1">{isDip ? 'Section' : 'Clause'} {number}</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{title}</p>
        </div>
        <span
          className="section-card-v2-label px-2.5 py-1 rounded-full flex-shrink-0"
          data-status={item.status}
          style={{ border: '1px solid currentColor' }}
        >
          {STATUS_LABEL[item.status] || item.status}
        </span>
      </div>

      {isDip && SECTION_DESCRIPTIONS[number] && (
        <p className="font-dm-sans text-xs italic mb-4 pl-3" style={{ color: 'rgb(var(--text-muted))', borderLeft: '2px solid var(--v2-border)' }}>
          {SECTION_DESCRIPTIONS[number]}
        </p>
      )}

      {pendingProposal && (
        <div className="mb-4 px-3 py-2 rounded-lg font-dm-mono text-xs" style={{ background: 'rgba(156,65,65,0.08)', border: '1px solid var(--v2-border-hot)', color: 'var(--v2-gold)' }}>
          Proposition en attente de validation par le franchiseur — suivi des modifications ci-dessous
        </div>
      )}

      {!isEditing ? (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--v2-surface)', minHeight: 120 }}>
            {pendingProposal ? (
              <RedlineView
                before={pendingProposal.content_before ?? item.content ?? ''}
                after={pendingProposal.content_proposed}
                className="font-dm-sans text-sm"
              />
            ) : (
              <RichTextView content={item.content} className="font-dm-sans text-sm leading-relaxed" style={{ color: 'rgb(var(--text-primary))' }} />
            )}
          </div>
          <button
            onClick={() => { setIsEditing(true); setEditContent(item.content || ''); }}
            disabled={!!pendingProposal}
            className="btn-cta-glow text-sm"
            style={pendingProposal ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            <Edit3 className="w-4 h-4" /> Modifier cette trame
          </button>
        </>
      ) : (
        <div className="space-y-3 mb-4">
          <div>
            <FormattingToolbar textareaRef={textareaRef} value={editContent} onChange={setEditContent} />
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full rounded-xl p-4 font-dm-sans text-sm resize-y"
              style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border-hot)', color: 'rgb(var(--text-primary))', minHeight: 180 }}
              autoFocus
            />
          </div>

          <div>
            <p className="mono-label-v2 mb-1.5">Aperçu</p>
            <div className="rounded-xl p-4" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', minHeight: 60 }}>
              <RichTextView content={editContent} className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }} emptyLabel="Commencez à rédiger pour voir l'aperçu." />
            </div>
          </div>

          <div>
            <p className="mono-label-v2 mb-1.5">Suivi des modifications</p>
            <div className="rounded-xl p-4" style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', minHeight: 80 }}>
              <RedlineView before={item.content || ''} after={editContent} className="font-dm-sans text-sm" emptyLabel="Commencez à rédiger pour voir l'aperçu." />
            </div>
          </div>

          <p className="font-dm-sans text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            Le franchiseur devra valider cette modification avant qu'elle s'applique au document.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => proposeMutation.mutate({ content: editContent })}
              disabled={!editContent.trim() || proposeMutation.isPending}
              className="btn-cta-glow text-sm"
            >
              {proposeMutation.isPending ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />} Envoyer la proposition
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-ghost flex items-center gap-2 text-sm font-dm-sans px-4 py-2" style={{ color: 'rgb(var(--text-secondary))' }}>
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        </div>
      )}

      {reviewedProposals.length > 0 && (
        <div className="pt-3 mb-4" style={{ borderTop: '1px solid var(--v2-border)' }}>
          <p className="mono-label-v2 mb-2">Historique</p>
          <div className="space-y-1.5">
            {reviewedProposals.map(p => <HistoryItem key={p.id} proposal={p} />)}
          </div>
        </div>
      )}

    </motion.div>
  );
}

function AnnexManager({ dipId, contractId, ownerId }) {
  const queryClient = useQueryClient();
  const annexPath = dipId ? `/avocat/dip/${dipId}/annexes` : `/avocat/contract/${contractId}/annexes`;
  const queryKey = ['annexes', dipId || contractId];

  const { data } = useQuery({
    queryKey,
    queryFn: () => api.get(annexPath).then(r => r.data),
  });
  const annexes = data?.annexes || [];

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const parentId = dipId || contractId;
      const storage_path = `${ownerId}/${parentId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('dip-annexes')
        .upload(storage_path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw new Error('Upload impossible : ' + uploadError.message);

      return api.post(annexPath, {
        file_name: file.name,
        storage_path,
        size_bytes: file.size,
      });
    },
    onSuccess: () => {
      toast.success('Annexe ajoutée');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/avocat/annexes/${id}`),
    onSuccess: () => {
      toast.success('Annexe supprimée');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.error(err.message),
  });

  const onDrop = useCallback((accepted) => {
    accepted.forEach(file => uploadMutation.mutate(file));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dipId, contractId, ownerId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 25 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      if (err?.code === 'file-too-large') toast.error('Fichier trop volumineux (max 25 Mo)');
      else toast.error('Format non supporté (PDF, DOCX, DOC, PNG, JPG)');
    },
  });

  const handleAnnexDownload = async (annexe) => {
    try {
      const { data: signed } = await supabase.storage.from('dip-annexes').createSignedUrl(annexe.storage_path, 300);
      if (signed?.signedUrl) window.open(signed.signedUrl, '_blank');
    } catch {
      toast.error('Téléchargement impossible');
    }
  };

  return (
    <div>
      <p className="mono-label-v2 mb-1 flex items-center gap-1.5"><Paperclip className="w-3 h-3" /> Annexes du document</p>
      <p className="font-dm-sans text-xs mb-3" style={{ color: 'rgb(var(--text-muted))' }}>
        Énumérées à la fin, dans l&apos;ordre d&apos;ajout — comme sur un acte juridique.
      </p>

      {annexes.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {annexes.map((a, i) => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-xs font-dm-sans px-3 py-2 rounded-lg" style={{ background: 'var(--v2-surface)' }}>
              <span className="font-dm-mono flex-shrink-0" style={{ color: 'var(--v2-gold)' }}>Annexe {i + 1}</span>
              <button onClick={() => handleAnnexDownload(a)} className="truncate flex-1 text-left hover:underline" style={{ color: 'rgb(var(--text-primary))' }}>
                {a.file_name}
              </button>
              <button onClick={() => deleteMutation.mutate(a.id)} title="Supprimer" style={{ color: 'rgb(var(--text-muted))' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div {...getRootProps()} className="dropzone-v2" data-active={isDragActive}>
        <input {...getInputProps()} />
        <p className="font-dm-sans text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
          {uploadMutation.isPending ? 'Envoi en cours…' : isDragActive ? 'Déposez ici…' : 'Glissez-déposez un fichier, ou cliquez pour parcourir'}
        </p>
      </div>
    </div>
  );
}
