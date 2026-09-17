import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import LoadingSpinner from './ui/LoadingSpinner';
import { Check, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import RedlineView from './RedlineView';

// target = { type: 'dip', id } ou { type: 'contract', id } — le panel s'adapte
// aux endpoints avocat correspondants (sections DIP ou clauses de contrat).
export default function ProposalsPanel({ target }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [comment, setComment] = useState('');

  const isContract = target?.type === 'contract';
  const listPath = isContract ? `/avocat/contract/${target.id}/proposals` : `/avocat/dip/${target?.id}/proposals`;
  const actionBase = isContract ? '/avocat/clause-proposals' : '/avocat/proposals';
  const invalidateKey = isContract ? ['contracts'] : ['dips'];

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', target?.type, target?.id],
    queryFn: () => api.get(listPath).then(r => r.data),
    enabled: !!target?.id,
    refetchInterval: 30000,
  });

  const acceptMutation = useMutation({
    mutationFn: (proposalId) =>
      api.put(`${actionBase}/${proposalId}/accept`, { reviewer_comment: comment }),
    onSuccess: () => {
      toast.success(isContract ? 'Proposition acceptée — clause mise à jour' : 'Proposition acceptée — section mise à jour');
      queryClient.invalidateQueries({ queryKey: ['proposals', target?.type, target?.id] });
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      setExpanded(null);
      setComment('');
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId) =>
      api.put(`${actionBase}/${proposalId}/reject`, { reviewer_comment: comment }),
    onSuccess: () => {
      toast.success('Proposition rejetée');
      queryClient.invalidateQueries({ queryKey: ['proposals', target?.type, target?.id] });
      setExpanded(null);
      setComment('');
    },
    onError: (err) => toast.error(err.message),
  });

  const proposals = data?.proposals || [];
  const pending = proposals.filter(p => p.status === 'pending');
  const reviewed = proposals.filter(p => p.status !== 'pending');

  if (isLoading) return null;
  if (proposals.length === 0) return null;

  return (
    <div className="card border-gold/20">
      <div className="lg-card-header">
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gold" />
          Propositions de l'avocat
          {pending.length > 0 && <span className="lg-badge lg-badge-gold">{pending.length} en attente</span>}
        </span>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3 mb-4">
          {pending.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              comment={expanded === p.id ? comment : ''}
              onCommentChange={setComment}
              onAccept={() => acceptMutation.mutate(p.id)}
              onReject={() => rejectMutation.mutate(p.id)}
              isBusy={acceptMutation.isPending || rejectMutation.isPending}
            />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <details className="group">
          <summary className="font-dm-sans text-xs text-text-muted cursor-pointer select-none list-none flex items-center gap-1 hover:text-text-secondary transition-colors">
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            {reviewed.length} proposition{reviewed.length > 1 ? 's' : ''} traitée{reviewed.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-3 space-y-2">
            {reviewed.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-elevated">
                <span className={`font-dm-mono text-xs flex-shrink-0 mt-0.5 ${p.status === 'accepted' ? 'text-success' : 'text-danger'}`}>
                  {p.status === 'accepted' ? '✓' : '✗'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-dm-sans text-xs text-text-secondary truncate">
                    {p.proposer?.company_name || 'Avocat'} • {isContract ? 'Clause' : 'Section'} {(p.section_id || p.clause_id)?.slice(0, 6)}…
                  </p>
                  <p className="font-dm-mono text-xs text-text-muted">
                    {formatDistanceToNow(new Date(p.reviewed_at || p.created_at), { addSuffix: true, locale: fr })}
                    {p.reviewer_comment && ` — ${p.reviewer_comment}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ProposalCard({ proposal, expanded, onToggle, comment, onCommentChange, onAccept, onReject, isBusy }) {
  return (
    <div className="rounded-xl border border-gold/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gold/5 hover:bg-gold/10 transition-colors text-left"
      >
        <div className="min-w-0">
          <p className="font-dm-sans text-sm font-medium text-text-primary">
            {proposal.proposer?.company_name || 'Avocat'} — modification proposée
          </p>
          <p className="font-dm-mono text-xs text-text-muted">
            {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Suivi des modifications — ajouts soulignés, suppressions barrées */}
          <div>
            <p className="font-dm-mono text-xs text-text-muted mb-1.5">Suivi des modifications</p>
            <div className="bg-bg-elevated border border-gold/15 rounded-lg p-3">
              <RedlineView before={proposal.content_before ?? ''} after={proposal.content_proposed} className="text-xs" />
            </div>
          </div>

          {/* Commentaire optionnel */}
          <div>
            <label className="font-dm-sans text-xs text-text-secondary block mb-1.5">
              Commentaire (optionnel)
            </label>
            <input
              type="text"
              value={comment}
              onChange={e => onCommentChange(e.target.value)}
              placeholder="Motif du refus ou note…"
              className="input-field w-full text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              disabled={isBusy}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              {isBusy ? <LoadingSpinner size="sm" /> : <Check className="w-3.5 h-3.5" />}
              Accepter et appliquer
            </button>
            <button
              onClick={onReject}
              disabled={isBusy}
              className="btn-ghost flex items-center gap-2 text-sm py-2 text-danger hover:text-danger/80"
            >
              <X className="w-3.5 h-3.5" /> Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
