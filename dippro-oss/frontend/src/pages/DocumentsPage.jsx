import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Upload, CheckCircle, Circle, Trash2, FileText, Clock, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

const BUCKET = 'franchisor-documents';
const ACCEPTED_TYPES = { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/msword': ['.doc'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState(null);
  const [expandedType, setExpandedType] = useState(null);
  const [dropQueue, setDropQueue] = useState([]); // fichiers déposés dans la zone générale, en cours de traitement

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then(r => r.data),
  });

  const checklist = data?.checklist || [];
  const completeness = data?.completeness || { required_present: 0, required_total: 0 };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session expirée, reconnectez-vous.');

      const storage_path = `${session.user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storage_path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw new Error("Upload impossible : " + uploadError.message);

      // documentType omis (zone de dépôt générale) : le backend le devine
      // depuis le contenu du document, un simple glisser-déposer suffit.
      return api.post('/documents', { document_type: documentType || undefined, file_name: file.name, storage_path });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setUploadingType(null),
  });

  const onDropGeneral = useCallback((accepted, rejected) => {
    if (rejected?.length) toast.error(`${rejected.length} fichier(s) refusé(s) — format non supporté (PDF, DOCX, DOC, PNG, JPG)`);
    if (!accepted?.length) return;
    setDropQueue(q => [...q, ...accepted.map(f => f.name)]);
    Promise.allSettled(accepted.map(file => uploadMutation.mutateAsync({ file, documentType: null }))).then((results) => {
      const ok = results.filter(r => r.status === 'fulfilled').length;
      if (ok > 0) toast.success(`${ok} document${ok > 1 ? 's' : ''} déposé${ok > 1 ? 's' : ''} — classement automatique en cours…`);
      setDropQueue(q => q.filter(name => !accepted.some(f => f.name === name)));
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropGeneral,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxSize: 25 * 1024 * 1024,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      toast.success('Document supprimé');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileSelect = (documentType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingType(documentType);
    uploadMutation.mutate({ file, documentType });
    e.target.value = '';
  };

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mes documents"
        subtitle="Bibliothèque de pièces sources — réutilisées automatiquement à chaque génération de DIP"
      />

      <div
        {...getRootProps()}
        className={`card border-2 border-dashed text-center py-10 cursor-pointer transition-all ${
          isDragActive ? 'border-gold bg-gold/5' : 'border-border-default hover:border-gold/40'
        }`}
      >
        <input {...getInputProps()} />
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gold/10 border border-gold/20 mb-4">
          <Upload className="w-6 h-6 text-gold" />
        </div>
        <p className="font-cormorant text-2xl text-text-primary mb-1">
          {isDragActive ? 'Déposez vos fichiers ici' : 'Glissez vos documents ici'}
        </p>
        <p className="font-dm-sans text-sm text-text-secondary mb-1">
          ou cliquez pour parcourir — plusieurs fichiers à la fois, aucun tri à faire au préalable
        </p>
        <p className="font-dm-sans text-xs text-text-muted flex items-center justify-center gap-1.5 mt-2">
          <Sparkles className="w-3.5 h-3.5 text-gold" /> L'IA reconnaît le type de chaque document et le classe automatiquement
        </p>
        {dropQueue.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-1.5">
            {dropQueue.map(name => (
              <span key={name} className="font-dm-mono text-xs text-gold flex items-center gap-2">
                <LoadingSpinner size="sm" /> {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card border-gold/15">
        <div className="flex items-center justify-between mb-2">
          <span className="font-dm-sans text-sm text-text-secondary">Pièces obligatoires fournies</span>
          <span className="font-dm-mono text-sm text-gold">{completeness.required_present}/{completeness.required_total}</span>
        </div>
        <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gold transition-all duration-700"
            style={{ width: `${completeness.required_total ? (completeness.required_present / completeness.required_total) * 100 : 0}%` }}
          />
        </div>
        <p className="font-dm-sans text-xs text-text-secondary mt-3">
          Chaque document est analysé par IA pour en extraire les données utiles (chiffres, dates, numéros) — cela réduit la saisie manuelle lors de la génération de votre DIP.
        </p>
      </div>

      <p className="font-dm-mono text-xs text-text-muted uppercase tracking-wide">
        Détail par pièce — classement automatique, ou ajout ciblé ici
      </p>

      <div className="space-y-3">
        {checklist.map(type => (
          <div key={type.key} className="card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {type.present ? (
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <Circle className={`w-5 h-5 flex-shrink-0 ${type.required ? 'text-danger/60' : 'text-text-muted'}`} />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-dm-sans text-sm font-medium text-text-primary">{type.label}</span>
                    {type.required && !type.present && (
                      <span className="px-2 py-0.5 rounded text-xs font-dm-sans bg-danger/10 text-danger border border-danger/20">Obligatoire</span>
                    )}
                    {type.section_number && (
                      <span className="px-2 py-0.5 rounded text-xs font-dm-mono bg-bg-elevated text-text-muted border border-border-subtle">Section {type.section_number}</span>
                    )}
                  </div>
                  {type.documents.length > 0 && (
                    <button
                      onClick={() => setExpandedType(expandedType === type.key ? null : type.key)}
                      className="font-dm-sans text-xs text-text-secondary hover:text-gold transition-colors mt-0.5 flex items-center gap-1"
                    >
                      {type.documents.length} fichier{type.documents.length > 1 ? 's' : ''}
                      {expandedType === type.key ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <label className="btn-secondary flex items-center gap-2 text-xs flex-shrink-0 cursor-pointer">
                {uploadingType === type.key ? <LoadingSpinner size="sm" /> : <Upload className="w-3.5 h-3.5" />}
                Ajouter
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  className="sr-only"
                  disabled={uploadingType === type.key}
                  onChange={e => handleFileSelect(type.key, e)}
                />
              </label>
            </div>

            {expandedType === type.key && type.documents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                {type.documents.map(doc => (
                  <div key={doc.id} className="lg-row justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="font-dm-sans text-sm text-text-secondary truncate">{doc.file_name}</span>
                      {doc.extraction_status === 'pending' && (
                        <span className="font-dm-sans text-xs text-gold flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" /> Analyse…</span>
                      )}
                      {doc.extraction_status === 'failed' && (
                        <span className="font-dm-sans text-xs text-danger flex items-center gap-1 flex-shrink-0"><AlertTriangle className="w-3 h-3" /> Échec</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="btn-ghost p-1 flex-shrink-0 text-danger hover:text-danger/80"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
