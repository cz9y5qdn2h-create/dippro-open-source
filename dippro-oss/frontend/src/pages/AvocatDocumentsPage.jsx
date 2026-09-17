import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import AvocatClientShell from '../components/avocat/AvocatClientShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle, Circle, FileText, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';

export default function AvocatDocumentsPage() {
  const { franchiseurId } = useParams();
  const [expandedType, setExpandedType] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['avocat-documents', franchiseurId],
    queryFn: () => api.get(`/documents?franchiseur_id=${franchiseurId}`).then(r => r.data),
  });

  const checklist = data?.checklist || [];
  const completeness = data?.completeness || { required_present: 0, required_total: 0 };

  return (
    <AvocatClientShell franchiseurId={franchiseurId} active="documents">
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Pièces sources</p>
          <p className="display-v2" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Documents</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            <div className="card-v2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>Pièces obligatoires fournies</span>
                <span className="font-dm-mono text-sm" style={{ color: 'var(--v2-gold)' }}>{completeness.required_present}/{completeness.required_total}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--v2-surface)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${completeness.required_total ? (completeness.required_present / completeness.required_total) * 100 : 0}%`, background: 'var(--v2-gold)' }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {checklist.map(type => (
                <div key={type.key} className="card-v2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {type.present ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(91 216 154)' }} />
                      ) : (
                        <Circle className="w-5 h-5 flex-shrink-0" style={{ color: type.required ? 'rgb(241 124 124 / 0.6)' : 'rgb(var(--text-muted))' }} />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{type.label}</span>
                          {type.required && !type.present && (
                            <span className="font-dm-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(241,124,124,0.1)', color: 'rgb(241 124 124)', border: '1px solid rgba(241,124,124,0.2)' }}>
                              Obligatoire
                            </span>
                          )}
                        </div>
                        {type.documents.length > 0 && (
                          <button
                            onClick={() => setExpandedType(expandedType === type.key ? null : type.key)}
                            className="font-dm-mono text-xs mt-0.5 flex items-center gap-1 transition-colors"
                            style={{ color: 'rgb(var(--text-muted))' }}
                          >
                            {type.documents.length} fichier{type.documents.length > 1 ? 's' : ''}
                            {expandedType === type.key ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedType === type.key && type.documents.length > 0 && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--v2-border)' }}>
                      {type.documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 min-w-0">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--text-muted))' }} />
                          <span className="font-dm-sans text-sm truncate" style={{ color: 'rgb(var(--text-secondary))' }}>{doc.file_name}</span>
                          {doc.extraction_status === 'pending' && (
                            <span className="font-dm-mono text-xs flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--v2-gold)' }}><Clock className="w-3 h-3" /> Analyse…</span>
                          )}
                          {doc.extraction_status === 'failed' && (
                            <span className="font-dm-mono text-xs flex items-center gap-1 flex-shrink-0" style={{ color: 'rgb(241 124 124)' }}><AlertTriangle className="w-3 h-3" /> Échec</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AvocatClientShell>
  );
}
