# DIPpro

DIPpro — plateforme de conformité DIP (Loi Doubin) pour franchiseurs, avec
analyse IA (Claude) des documents précontractuels. Code source complet, à
self-hoster avec vos propres clés (Supabase, Anthropic).

## Stack
- Frontend : React + Tailwind CSS (Vite)
- Backend : Node.js + Express
- DB : Supabase (PostgreSQL + Auth + Storage)
- IA : Claude API (`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`)
- Email : Resend (optionnel)
- Déploiement : Vercel (monorepo)

## Structure
```
.
├── frontend/            # App React (Vite)
├── backend/             # API Express
├── supabase/migrations/ # Schéma SQL, à exécuter dans l'ordre
├── api/                 # Point d'entrée serverless Vercel
└── docs/                # INVARIANTS.md, LEGAL_COPY.md
```

## Installation

Voir [SETUP.md](SETUP.md) pour le guide complet (Supabase, variables
d'environnement, déploiement). Aucune clé n'est fournie — chaque
déploiement utilise son propre projet Supabase et sa propre clé Anthropic.

## Licence

[MIT](LICENSE)
