export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="lg-greeting">{title}</h1>
          {subtitle && <p className="lg-gsub">{subtitle}</p>}
        </div>
        {action && (
          <div className="hidden sm:flex items-center gap-2 flex-wrap flex-shrink-0">{action}</div>
        )}
      </div>
      {action && (
        <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {action}
        </div>
      )}
    </div>
  );
}
