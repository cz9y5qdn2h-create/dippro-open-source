import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { History, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => api.get('/history?limit=100').then(r => r.data)
  });

  const ACTION_LABELS = {
    upload_initial: { label: t('history.events.initialImport'), color: 'text-gold', bg: 'bg-gold/10 border-gold/20' },
    upload_nouvelle_version: { label: t('history.events.newVersionUploaded'), color: 'text-gold', bg: 'bg-gold/10 border-gold/20' },
    version_approved: { label: t('history.events.newVersionActivated'), color: 'text-success', bg: 'bg-success/10 border-success/20' },
    generated_by_agent: { label: t('history.events.aiGenerated'), color: 'text-gold', bg: 'bg-gold/10 border-gold/20' },
    section_update: { label: t('history.events.sectionModified'), color: 'text-text-primary', bg: 'bg-bg-elevated border-border-subtle' },
    alert_validated: { label: t('history.events.alertValidated'), color: 'text-success', bg: 'bg-success/10 border-success/20' },
    alert_ignored: { label: t('history.events.alertIgnored'), color: 'text-text-secondary', bg: 'bg-bg-elevated border-border-subtle' },
    alert_created: { label: t('history.events.alertCreated'), color: 'text-danger', bg: 'bg-danger/10 border-danger/20' },
    notification_sent: { label: t('history.events.notificationSent'), color: 'text-success', bg: 'bg-success/10 border-success/20' },
    admin_password_reset: { label: 'Mot de passe réinitialisé', color: 'text-text-secondary', bg: 'bg-bg-elevated border-border-subtle' },
  };

  const logs = data?.history || [];

  const grouped = logs.reduce((acc, log) => {
    const date = format(new Date(log.timestamp), 'dd MMMM yyyy', { locale: fr });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
      />

      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24">
          <History className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <p className="font-cormorant text-2xl text-text-primary">{t('history.empty.title')}</p>
          <p className="font-dm-sans text-sm text-text-secondary mt-2">
            {t('history.empty.desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="font-dm-mono text-xs text-text-secondary px-3">{date}</span>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              <div className="space-y-3">
                {entries.map(log => {
                  const cfg = ACTION_LABELS[log.action] || ACTION_LABELS.section_update;
                  return (
                    <div key={log.id} className={'card border ' + cfg.bg + ' animate-fade-in'}>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center flex-shrink-0">
                          <GitBranch className="w-3.5 h-3.5 text-text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                              <span className={'font-dm-sans text-sm font-medium ' + cfg.color}>{cfg.label}</span>
                              {log.dip_sections?.section_title && (
                                <span className="font-dm-mono text-xs text-text-secondary">
                                  {log.dip_sections.section_title}
                                </span>
                              )}
                            </div>
                            <span className="font-dm-mono text-xs text-text-secondary">
                              {format(new Date(log.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>
                          {log.dip_documents?.title && (
                            <p className="font-dm-sans text-xs text-text-secondary mt-0.5">{log.dip_documents.title}</p>
                          )}
                          {(log.old_content || log.new_content) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                              {log.old_content && (
                                <div className="bg-danger/5 border border-danger/15 rounded p-2">
                                  <p className="font-dm-mono text-xs text-danger mb-1">{t('history.before')}</p>
                                  <p className="font-dm-sans text-xs text-text-secondary line-clamp-3">{log.old_content.substring(0, 200)}</p>
                                </div>
                              )}
                              {log.new_content && (
                                <div className="bg-success/5 border border-success/15 rounded p-2">
                                  <p className="font-dm-mono text-xs text-success mb-1">{t('history.after')}</p>
                                  <p className="font-dm-sans text-xs text-text-secondary line-clamp-3">{log.new_content.substring(0, 200)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}