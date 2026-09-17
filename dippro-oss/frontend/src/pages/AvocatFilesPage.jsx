import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Folder, FolderOpen, Building2, FileText, Award, Paperclip,
  ChevronRight, Download, ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function TreeRow({ depth = 0, icon: Icon, label, sub, onClick, expanded, hasChildren, iconColor }) {
  return (
    <button
      onClick={onClick}
      disabled={!hasChildren && !onClick}
      className="w-full flex items-center gap-2.5 py-2 px-2 rounded-lg text-left transition-colors"
      style={{ paddingLeft: 8 + depth * 22, cursor: hasChildren ? 'pointer' : 'default' }}
      onMouseEnter={e => hasChildren && (e.currentTarget.style.background = 'var(--v2-surface)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {hasChildren && (
        <ChevronRight
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ color: 'rgb(var(--text-muted))', transform: expanded ? 'rotate(90deg)' : 'none' }}
        />
      )}
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor || 'var(--v2-gold)', marginLeft: hasChildren ? 0 : 20 }} />
      <span className="font-dm-sans text-sm truncate flex-1" style={{ color: 'rgb(var(--text-primary))' }}>{label}</span>
      {sub && <span className="font-dm-mono text-xs flex-shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>{sub}</span>}
    </button>
  );
}

function FranchiseurNode({ relation }) {
  const franchiseurId = relation.franchiseur_id;
  const [openDip, setOpenDip] = useState(false);
  const [openCerts, setOpenCerts] = useState(false);
  const [openAnnexes, setOpenAnnexes] = useState(false);

  const { data: dipData, isLoading: dipLoading } = useQuery({
    queryKey: ['avocat', 'files-dip', franchiseurId],
    queryFn: () => api.get(`/avocat/franchiseur/${franchiseurId}/dip`).then(r => r.data),
    enabled: openDip || openAnnexes,
  });

  const { data: certsData, isLoading: certsLoading } = useQuery({
    queryKey: ['avocat', 'files-certs', franchiseurId],
    queryFn: () => api.get(`/certificates?franchiseur_id=${franchiseurId}&limit=100`).then(r => r.data),
    enabled: openCerts,
  });

  const sections = dipData?.dip?.dip_sections?.slice().sort((a, b) => a.section_number - b.section_number) || [];
  const annexes = dipData?.dip?.annexes || [];
  const certs = certsData?.certificates || [];

  return (
    <div>
      <TreeRow
        depth={1}
        icon={Building2}
        label={relation.franchiseur?.company_name || relation.franchiseur_id}
        hasChildren
        expanded={openDip || openCerts || openAnnexes}
      />
      <div style={{ marginLeft: 0 }}>
        {/* DIP */}
        <TreeRow
          depth={2}
          icon={openDip ? FolderOpen : Folder}
          label="DIP"
          hasChildren
          expanded={openDip}
          onClick={() => setOpenDip(v => !v)}
        />
        {openDip && (
          <div>
            {dipLoading ? (
              <div className="py-3" style={{ paddingLeft: 90 }}><LoadingSpinner size="sm" /></div>
            ) : !dipData?.dip ? (
              <p className="font-dm-sans text-xs py-2" style={{ paddingLeft: 90, color: 'rgb(var(--text-muted))' }}>Aucun DIP actif</p>
            ) : (
              sections.map(section => (
                <TreeRow
                  key={section.id}
                  depth={3}
                  icon={FileText}
                  label={`Section ${section.section_number} — ${section.section_title}`}
                  sub={section.avocat_validation_status === 'pending' ? 'en attente' : section.status}
                  iconColor={section.avocat_validation_status === 'pending' ? 'rgb(241 124 124)' : undefined}
                />
              ))
            )}
          </div>
        )}

        {/* Annexes — au niveau du document entier, énumérées dans l'ordre d'ajout */}
        <TreeRow
          depth={2}
          icon={openAnnexes ? FolderOpen : Folder}
          label="Annexes"
          hasChildren
          expanded={openAnnexes}
          onClick={() => setOpenAnnexes(v => !v)}
        />
        {openAnnexes && (
          <div>
            {dipLoading ? (
              <div className="py-3" style={{ paddingLeft: 90 }}><LoadingSpinner size="sm" /></div>
            ) : annexes.length === 0 ? (
              <p className="font-dm-sans text-xs py-2" style={{ paddingLeft: 90, color: 'rgb(var(--text-muted))' }}>Aucune annexe</p>
            ) : (
              annexes.map((a, i) => (
                <TreeRow
                  key={a.id}
                  depth={3}
                  icon={Paperclip}
                  label={`Annexe ${i + 1} — ${a.file_name}`}
                  sub={a.size_bytes ? `${Math.round(a.size_bytes / 1024)} Ko` : null}
                />
              ))
            )}
          </div>
        )}

        {/* Certificats */}
        <TreeRow
          depth={2}
          icon={openCerts ? FolderOpen : Folder}
          label="Certificats"
          hasChildren
          expanded={openCerts}
          onClick={() => setOpenCerts(v => !v)}
        />
        {openCerts && (
          <div>
            {certsLoading ? (
              <div className="py-3" style={{ paddingLeft: 90 }}><LoadingSpinner size="sm" /></div>
            ) : certs.length === 0 ? (
              <p className="font-dm-sans text-xs py-2" style={{ paddingLeft: 90, color: 'rgb(var(--text-muted))' }}>Aucun certificat</p>
            ) : (
              certs.map(c => (
                <div key={c.id} className="flex items-center gap-2.5 py-2" style={{ paddingLeft: 90 }}>
                  <Award className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--v2-gold)' }} />
                  <span className="font-dm-sans text-sm truncate flex-1" style={{ color: 'rgb(var(--text-primary))' }}>
                    N° {String(c.certificate_number ?? '?').padStart(4, '0')} — {c.certificate_title || c.certificate_type}
                  </span>
                  <span className="font-dm-mono text-xs flex-shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>
                    {formatDistanceToNow(new Date(c.generated_at), { addSuffix: true, locale: fr })}
                  </span>
                  {c.public_url && (
                    <a href={c.public_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" style={{ color: 'var(--v2-gold)' }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvocatFilesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['avocat', 'dashboard'],
    queryFn: () => api.get('/avocat/dashboard').then(r => r.data),
  });

  const franchiseurs = data?.franchiseurs || [];

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'rgb(var(--bg-primary))' }}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <p className="mono-label-v2">Espace avocat</p>
          <p className="display-v2" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Fichiers</p>
          <p className="font-dm-sans text-sm mt-1" style={{ color: 'rgb(var(--text-secondary))' }}>
            Tous vos clients, leurs DIP section par section et leurs certificats — au même endroit.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : franchiseurs.length === 0 ? (
          <div className="card-v2 text-center py-16">
            <Folder className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--v2-gold)' }} />
            <p className="display-v2 mb-2" style={{ fontSize: 22 }}>Aucun réseau suivi</p>
            <p className="font-dm-sans text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              Vos clients apparaîtront ici dès qu'ils vous auront invité.
            </p>
          </div>
        ) : (
          <div className="card-v2">
            <TreeRow depth={0} icon={FolderOpen} label="Mes franchiseurs" hasChildren expanded />
            <div>
              {franchiseurs.map(r => <FranchiseurNode key={r.id} relation={r} />)}
            </div>
          </div>
        )}

        <Link to="/dashboard" className="font-dm-mono text-xs inline-block" style={{ color: 'rgb(var(--text-muted))' }}>
          ← Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
