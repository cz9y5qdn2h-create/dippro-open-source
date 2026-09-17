# DIPpro — Documentation Agent

## Projet
Application SaaS de gestion des Documents d'Information Précontractuelle (DIP) pour franchiseurs.
Développée par **Iralink** (theo@iralink-agency.com).

## Stack technique

### Frontend (`/frontend`)
- **React 18** + **Vite** + **TailwindCSS** (config CSS vars)
- **React Router v6** (SPA, routes protégées)
- **@tanstack/react-query** — cache serveur, refetch automatique
- **Supabase JS** — auth côté client
- **Lucide React** — icônes
- **Framer Motion** — animations
- **react-hot-toast** — notifications

### Backend (`/backend`)
- **Express.js** — API REST sur `/api/*`
- **Supabase** — BDD PostgreSQL + Auth (service role)
- **@anthropic-ai/sdk** — analyse IA des DIP (claude-opus-5)
- **pdf-parse + mammoth** — extraction texte PDF/DOCX
- **Helmet + express-rate-limit** — sécurité

### Infra
- **Vercel** — hébergement monorepo (frontend build + backend serverless)
- **Supabase** — votre propre projet (créé lors de l'installation, voir SETUP.md)

## Structure des fichiers clés

```
frontend/src/
  App.jsx                    — routes React
  main.jsx                   — providers (Query, Theme, Auth, Toaster)
  context/
    AuthContext.jsx           — Supabase auth + profil utilisateur
    ThemeContext.jsx           — 5 thèmes, localStorage
  components/
    Layout.jsx                — shell avec Sidebar
    Sidebar.jsx               — nav + theme switcher + logout
  pages/
    LoginPage / RegisterPage  — auth publique
    DashboardPage             — tableau de bord
    DIPPage                   — visualisation DIP analysé
    UploadDIPPage             — upload + analyse IA
    AlertsPage / HistoryPage
    FranchiseesPage / SettingsPage / ExportPage / AdminPage / ApiConfigPage

backend/src/
  server.js                   — Express app
  config/
    claude.js                 — fonctions IA (parseDIPSections, compareDIPVersions, etc.)
    supabase.js               — client Supabase service role
  routes/                     — auth, dip, alerts, franchisees, settings, export, admin, history, notifications
```

## Design system — Liquid Glass

5 thèmes sélectionnables par le franchiseur, persistés dans `localStorage('dippro-theme')` :
- `glass` — Iralink par défaut, clair
- `nuit` — sombre doré
- `azur` — marine glacé
- `nacre` — blanc épuré
- `emeraude` — forêt sombre

Le thème s'applique via `data-theme="<id>"` sur `document.documentElement`.
Toutes les couleurs sont des CSS custom properties — **ne jamais hardcoder de couleurs** dans les composants.

Classes CSS utiles : `.card`, `.btn-primary`, `.btn-ghost`, `.nav-link`, `.nav-link-active`, `.sidebar-panel`, `.input-field`, `.btn-liquid-glass-prominent`

## Variables d'environnement

### Frontend (Vite — baked au build)
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=<clé publique>
```
**Important** : les vars `VITE_*` sont injectées à la compilation. Sans elles, `frontend/src/lib/supabase.js` échoue explicitement au démarrage plutôt que de se rabattre sur un projet par défaut.

### Backend
```
ANTHROPIC_API_KEY=<clé API>
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<clé service role>
JWT_SECRET=<secret>
```

## IA — claude.js

Modèle : `claude-opus-5` (le plus puissant), `claude-sonnet-5` pour les tâches plus légères, `claude-haiku-4-5` pour la classification rapide. Effort `max` sur les fonctions qui déterminent la conformité légale (`parseDIPSections`, `compareDIPVersions`, `assessLitigationRisks`, `parseContractClauses`, `compareContractVersions`) — DIPagent (`routes/copilot.js`) tourne aussi sur `claude-opus-5`.
Prompt caching activé sur `SYSTEM_DIP_EXPERT` via `cache_control: { type: "ephemeral" }` → ~90% de réduction de coût.

4 fonctions principales :
- `parseDIPSections(rawText)` — extrait les 10 sections réglementaires Loi Doubin
- `compareDIPVersions(prev, new)` — détecte les changements à impact légal
- `detectChanges(section, newDoc, title)` — compare section vs nouveau document
- `generateUpdateSummary(sections)` — génère message de notification franchisés

## Git workflow

- Messages de commit en anglais, format : `type(scope): description`

## Règles de code

1. **Pas de commentaires inutiles** — le code doit se lire seul
2. **Pas de hardcode couleurs** — utiliser les classes Tailwind avec CSS vars (`text-gold`, `bg-bg-primary`, etc.)
3. **Pas de `console.log`** en production
4. **Réponses de l'agent en français** toujours
5. **Vérifier le build** après chaque modif frontend (`cd frontend && npm run build`)
6. **Pas de features non demandées** — rester scope exact de la tâche

## Déploiement Vercel

```
installCommand: npm install && cd frontend && npm install
buildCommand: cd frontend && npm run build
outputDirectory: frontend/dist
API: /api/index.js (serverless, timeout 60s)
```

Après chaque push → Vercel redéploie automatiquement depuis `main`.
Si build échoue → vérifier les vars d'env Vercel et les logs de build.
