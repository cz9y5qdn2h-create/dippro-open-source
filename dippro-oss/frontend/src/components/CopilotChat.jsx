import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, CheckCircle, AlertTriangle, Loader2, Calendar, ArrowLeftRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../lib/api';

const CAL_URL = import.meta.env.VITE_CAL_COM_URL || '';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'contact@example.com';
const POSITION_KEY = 'dippro-copilot-position';

const SHORTCUTS = [
  { label: '🔍 Checkup complet', msg: 'Fais un checkup complet de mon DIP et dis-moi ce que je dois faire en priorité.' },
  { label: '⚠️ Mes alertes', msg: 'Liste mes alertes en attente et explique lesquelles sont prioritaires.' },
  { label: '📊 Mon score', msg: "Quel est mon score de conformité actuel et comment l'améliorer ?" },
  { label: '📝 Modifier le DIP', msg: "Je voudrais modifier une section de mon DIP. Montre-moi d'abord les sections disponibles." },
  { label: '📜 Modifier le contrat', msg: "Je voudrais modifier une clause de mon contrat. Montre-moi d'abord les clauses disponibles." },
  { label: '👥 Mes franchisés', msg: 'Combien ai-je de franchisés et quel est leur statut ?' },
  { label: '📋 Historique', msg: 'Montre-moi les 10 dernières modifications de mon DIP.' },
  { label: '⚖️ Loi Doubin', msg: "Explique-moi les obligations de la Loi Doubin pour mon DIP : délais, contenu obligatoire, sanctions." },
  { label: '📧 Notifier franchisés', msg: "Comment notifier mes franchisés d'une mise à jour de mon DIP ?" },
  { label: '❓ Aide DIPpro', msg: 'Comment fonctionne DIPpro ? Quelles sont les principales fonctionnalités ?' },
  { label: '📅 Voir la démo', booking: true },
];

const ACTION_LABELS = {
  get_dip_status: 'Consultation du DIP',
  get_pending_alerts: 'Récupération des alertes',
  validate_alert: "Validation d'une correction",
  ignore_alert: 'Alerte ignorée',
  get_franchisees: 'Consultation franchisés',
  get_history: "Lecture de l'historique",
  full_checkup: 'Checkup en cours…',
  get_contract_status: 'Consultation du contrat',
  update_dip_section: 'Section du DIP modifiée',
  update_contract_clause: 'Clause du contrat modifiée',
};

function ActionBadge({ action }) {
  const isError = action.result?.error;
  return (
    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-dm-mono"
      style={{
        background: isError ? 'rgba(220,38,38,0.08)' : 'rgba(76,175,128,0.08)',
        border: `0.5px solid ${isError ? 'rgba(220,38,38,0.20)' : 'rgba(76,175,128,0.20)'}`,
        color: isError ? 'rgb(220,38,38)' : 'rgb(76,175,128)',
      }}>
      {isError ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
      {ACTION_LABELS[action.tool] || action.tool}
    </div>
  );
}

export default function CopilotChat() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    try { return localStorage.getItem(POSITION_KEY) === 'left' ? 'left' : 'right'; } catch { return 'right'; }
  });
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Bonjour ! Je suis **DIPpro Copilot**, votre assistant IA franchise.\n\nJe peux :\n- 🔍 Analyser votre DIP et son score de conformité\n- 📝 Modifier directement une section de votre DIP ou une clause de votre contrat\n- ⚠️ Gérer vos alertes et corrections en attente\n- 👥 Consulter vos franchisés\n- ⚖️ Répondre à vos questions sur la Loi Doubin\n- ✅ Valider ou ignorer des corrections directement\n\nUtilisez les raccourcis ci-dessus ou posez-moi une question." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastActions, setLastActions] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const togglePosition = () => {
    setPosition(prev => {
      const next = prev === 'right' ? 'left' : 'right';
      try { localStorage.setItem(POSITION_KEY, next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const showBookingCard = () => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: '📅 Je voudrais voir / revoir la présentation DIPpro.' },
      { role: 'assistant', content: '', card: 'booking' }
    ]);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    setLastActions([]);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/copilot/chat', { messages: apiMessages });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.actions?.length > 0) setLastActions(data.actions);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Désolé, une erreur est survenue : ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${position === 'right' ? 'right-6' : 'left-6'}`}
        style={{
          background: 'linear-gradient(135deg, rgb(var(--gold)), rgb(var(--gold) / 0.7))',
          boxShadow: open
            ? '0 0 0 3px rgb(var(--gold) / 0.30), 0 8px 24px rgb(var(--gold) / 0.35)'
            : '0 4px 20px rgb(var(--gold) / 0.40), 0 8px 32px rgba(0,0,0,0.20)',
        }}
        title="DIPpro Copilot"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            : <motion.div key="sp" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
          }
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: 'rgb(var(--success))', borderColor: 'rgb(var(--bg-primary))' }} />
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`fixed bottom-24 z-50 flex flex-col ${position === 'right' ? 'right-6' : 'left-6'}`}
            style={{
              width: 380,
              maxWidth: 'calc(100vw - 24px)',
              height: 560,
              maxHeight: 'calc(100vh - 120px)',
              background: 'rgb(var(--bg-card) / 0.97)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              border: '1px solid rgb(var(--gold) / 0.28)',
              borderRadius: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 24px 64px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
              style={{ borderBottom: '0.5px solid rgb(var(--gold) / 0.18)', background: 'rgb(var(--gold) / 0.05)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgb(var(--gold)), rgb(var(--gold) / 0.7))' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-dm-sans text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                  DIPpro Copilot
                </p>
                <p className="font-dm-mono text-xs" style={{ color: 'rgb(var(--gold))' }}>
                  {loading ? 'Réfléchit…' : '● En ligne'}
                </p>
              </div>
              <button
                onClick={togglePosition}
                className="transition-opacity hover:opacity-60 p-1"
                title={position === 'right' ? 'Déplacer à gauche' : 'Déplacer à droite'}
              >
                <ArrowLeftRight className="w-4 h-4" style={{ color: 'rgb(var(--text-secondary))' }} />
              </button>
              <button onClick={() => setOpen(false)} className="transition-opacity hover:opacity-60 p-1">
                <X className="w-4 h-4" style={{ color: 'rgb(var(--text-secondary))' }} />
              </button>
            </div>

            {/* Shortcuts */}
            <div className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0"
              style={{ borderBottom: '0.5px solid rgb(var(--gold) / 0.10)', scrollbarWidth: 'none' }}>
              {SHORTCUTS.map(sc => (
                <button
                  key={sc.label}
                  onClick={() => sc.booking ? showBookingCard() : sendMessage(sc.msg)}
                  disabled={loading && !sc.booking}
                  className="whitespace-nowrap font-dm-sans text-xs px-3 py-1.5 rounded-full transition-all flex-shrink-0"
                  style={{
                    background: sc.booking ? 'rgb(var(--gold) / 0.16)' : 'rgb(var(--gold) / 0.08)',
                    border: `0.5px solid ${sc.booking ? 'rgb(var(--gold) / 0.40)' : 'rgb(var(--gold) / 0.22)'}`,
                    color: 'rgb(var(--gold))',
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 font-dm-sans text-sm leading-relaxed"
                    style={m.role === 'user'
                      ? { background: 'rgb(var(--gold) / 0.18)', border: '0.5px solid rgb(var(--gold) / 0.35)', color: 'rgb(var(--text-primary))', borderBottomRightRadius: 6 }
                      : { background: 'rgb(var(--bg-elevated))', border: '0.5px solid var(--border-subtle)', color: 'rgb(var(--text-primary))', borderBottomLeftRadius: 6 }
                    }
                  >
                    {m.card === 'booking' ? (
                      <div className="space-y-3">
                        <p className="font-dm-sans text-sm leading-relaxed" style={{ color: 'rgb(var(--text-primary))' }}>
                          Réservez une présentation DIPpro de <strong>30 min</strong> — démo complète, configuration en direct, réponses à toutes vos questions.
                        </p>
                        <a
                          href={CAL_URL ? CAL_URL : `mailto:${CONTACT_EMAIL}`}
                          target={CAL_URL ? '_blank' : undefined}
                          rel={CAL_URL ? 'noopener noreferrer' : undefined}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm-sans text-sm font-medium transition-all"
                          style={{
                            background: 'rgb(var(--gold) / 0.18)',
                            border: '0.5px solid rgb(var(--gold) / 0.45)',
                            color: 'rgb(var(--gold))',
                          }}
                        >
                          <Calendar className="w-4 h-4" />
                          {CAL_URL ? 'Choisir un créneau →' : 'Nous contacter par email →'}
                        </a>
                      </div>
                    ) : m.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mb-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mb-1.5">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{children}</strong>,
                          em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
                          code: ({ inline, children }) => inline
                            ? <code className="font-dm-mono text-xs px-1 py-0.5 rounded" style={{ background: 'rgb(var(--gold) / 0.12)', color: 'rgb(var(--gold))' }}>{children}</code>
                            : <pre className="font-dm-mono text-xs p-2 rounded mt-1 mb-1 overflow-x-auto" style={{ background: 'rgb(var(--bg-primary))', color: 'rgb(var(--text-primary))' }}><code>{children}</code></pre>,
                          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                          th: ({ children }) => <th className="text-left px-2 py-1 font-dm-mono font-semibold" style={{ borderBottom: '1px solid rgb(var(--gold) / 0.25)', color: 'rgb(var(--gold))' }}>{children}</th>,
                          td: ({ children }) => <td className="px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>{children}</td>,
                          h1: ({ children }) => <p className="font-semibold text-base mb-1" style={{ color: 'rgb(var(--text-primary))' }}>{children}</p>,
                          h2: ({ children }) => <p className="font-semibold text-sm mb-1 mt-2" style={{ color: 'rgb(var(--text-primary))' }}>{children}</p>,
                          h3: ({ children }) => <p className="font-medium text-sm mb-0.5 mt-1.5" style={{ color: 'rgb(var(--gold))' }}>{children}</p>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 pl-3 my-1" style={{ borderColor: 'rgb(var(--gold) / 0.4)', color: 'rgb(var(--text-secondary))' }}>{children}</blockquote>,
                          hr: () => <hr className="my-2" style={{ borderColor: 'rgb(var(--gold) / 0.15)' }} />,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Actions exécutées */}
              {lastActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-start pl-1">
                  {lastActions.map((a, i) => <ActionBadge key={i} action={a} />)}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
                    style={{ background: 'rgb(var(--bg-elevated))', border: '0.5px solid var(--border-subtle)', borderBottomLeftRadius: 6 }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgb(var(--gold))' }} />
                    <span className="font-dm-sans text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>DIPpro Copilot réfléchit…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 flex-shrink-0"
              style={{ borderTop: '0.5px solid rgb(var(--gold) / 0.12)' }}>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Posez une question ou donnez un ordre…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none font-dm-sans text-sm rounded-xl px-3 py-2.5 outline-none transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    border: '0.5px solid rgb(var(--gold) / 0.22)',
                    color: 'rgb(var(--text-primary))',
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: !input.trim() || loading ? 'rgb(var(--gold) / 0.15)' : 'rgb(var(--gold) / 0.90)',
                    border: '0.5px solid rgb(var(--gold) / 0.35)',
                    color: !input.trim() || loading ? 'rgb(var(--gold) / 0.40)' : 'white',
                    cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="font-dm-mono text-xs text-center mt-1.5" style={{ color: 'rgb(var(--text-muted))' }}>
                Entrée pour envoyer · Shift+Entrée pour saut de ligne
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
