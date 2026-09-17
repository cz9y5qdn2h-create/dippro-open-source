import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, FileText, Upload, Bell, History,
  Users, Settings, Download, FolderSync, Sparkles, ClipboardCheck,
  Search, ArrowRight, ArrowUp, ArrowDown, CornerDownLeft
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Tableau de bord',  to: '/dashboard',    icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Mon DIP',          to: '/dip',          icon: FileText,        group: 'Navigation' },
  { label: 'Nouvelle version', to: '/dip/upload',   icon: Upload,          group: 'Actions' },
  { label: 'Générer un DIP',   to: '/dip/generate', icon: Sparkles,        group: 'Actions' },
  { label: 'Conformité',       to: '/conformite',   icon: ClipboardCheck,  group: 'Navigation' },
  { label: 'Alertes',          to: '/alerts',       icon: Bell,            group: 'Navigation' },
  { label: 'Historique',       to: '/history',      icon: History,         group: 'Navigation' },
  { label: 'Franchisés',       to: '/franchisees',  icon: Users,           group: 'Navigation' },
  { label: 'Export',           to: '/export',       icon: Download,        group: 'Navigation' },
  { label: 'Surveillance docs',to: '/monitoring',    icon: FolderSync,      group: 'Navigation' },
  { label: 'Paramètres',       to: '/settings',     icon: Settings,        group: 'Navigation' },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === 'sombre';

  const panelBg = dark ? 'rgba(18,26,44,0.92)' : 'rgba(255,255,255,0.82)';
  const divider = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const inputColor = dark ? 'rgb(241,245,249)' : 'rgb(15,23,42)';
  const groupColor = dark ? 'rgb(71,85,105)' : 'rgb(148,163,184)';
  const labelDefault = dark ? 'rgb(148,163,184)' : 'rgb(71,85,105)';
  const labelActive = 'rgb(15,23,42)';
  const iconBgDefault = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const kbdBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const kbdColor = dark ? 'rgb(148,163,184)' : 'rgb(71,85,105)';

  const filtered = query.trim()
    ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS;

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flat = filtered;

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const go = useCallback((to) => {
    navigate(to);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, flat.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && flat[activeIndex]) {
        go(flat[activeIndex].to);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, activeIndex, go, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden animate-slide-up shadow-2xl"
        style={{ background: panelBg, backdropFilter: 'blur(40px) saturate(220%)', WebkitBackdropFilter: 'blur(40px) saturate(220%)', border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'}`, boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: divider }}>
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(184,147,87)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher ou naviguer…"
            className="flex-1 bg-transparent outline-none font-dm-sans text-base"
            style={{ color: inputColor }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs font-dm-mono px-2 py-0.5 rounded" style={{ background: kbdBg, color: kbdColor }}>
              Esc
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {flat.length === 0 ? (
            <p className="text-center py-8 font-dm-sans text-sm" style={{ color: groupColor }}>
              Aucun résultat pour « {query} »
            </p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="px-5 py-1.5 font-dm-mono text-xs uppercase tracking-wider" style={{ color: groupColor }}>
                  {group}
                </p>
                {items.map(item => {
                  const idx = flat.indexOf(item);
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.to}
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => go(item.to)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 transition-all duration-100 group"
                      style={{
                        background: isActive ? 'rgba(156,65,65,0.12)' : 'transparent',
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: isActive ? 'rgba(156,65,65,0.18)' : iconBgDefault, border: isActive ? '1px solid rgba(156,65,65,0.35)' : '1px solid transparent' }}>
                        <item.icon className="w-4 h-4" style={{ color: isActive ? 'rgb(184,147,87)' : labelDefault }} />
                      </div>
                      <span className="flex-1 text-left font-dm-sans text-sm" style={{ color: isActive ? (dark ? 'rgb(241,245,249)' : labelActive) : labelDefault, fontWeight: isActive ? 500 : 400 }}>
                        {item.label}
                      </span>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(184,147,87)' }} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-5 py-3 border-t" style={{ borderColor: divider }}>
          {[
            { keys: ['↑', '↓'], label: 'naviguer' },
            { keys: ['↵'], label: 'ouvrir' },
            { keys: ['Esc'], label: 'fermer' },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              {keys.map(k => (
                <kbd key={k} className="font-dm-mono text-xs px-1.5 py-0.5 rounded" style={{ background: kbdBg, color: kbdColor, border: `1px solid ${divider}` }}>
                  {k}
                </kbd>
              ))}
              <span className="font-dm-sans text-xs" style={{ color: groupColor }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
