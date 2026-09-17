# Guide d'installation DIPpro

Ce projet n'inclut aucune clé API ni identifiant réel — chaque personne qui
le déploie utilise ses propres services (Supabase, Anthropic, Resend). Rien
ici ne dépend d'une infrastructure tierce déjà existante.

## 1. Supabase — base de données

### Créer le projet
1. Aller sur https://app.supabase.com/ et créer un nouveau projet.
2. Dans Settings > API, récupérer :
   - `Project URL` → `SUPABASE_URL`
   - `anon / public key` → `SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (jamais exposée au frontend)

### Appliquer le schéma
Dans le SQL Editor Supabase, exécuter **tous les fichiers numérotés** de
`supabase/migrations/` **dans l'ordre** (001 à 055 au moment de l'écriture) :
```bash
ls supabase/migrations/*.sql | sort -V
```
Ne pas exécuter `step1_tables.sql` / `step2_rls.sql` / `step3_trigger_admin.sql`
— ancienne version manuelle en 3 blocs, remplacée par les fichiers numérotés
(gardés uniquement comme référence historique dans `docs/`).

Ces migrations créent aussi les buckets Storage (`dip-files`, `contract-files`,
`franchisor-documents`, `dip-annexes`) en **privé**, avec leurs policies
d'accès — ne créez aucun bucket manuellement dans l'UI Supabase, la migration
055 le fait déjà correctement (RLS scopée au propriétaire, pas d'accès public).

### Créer le compte admin
Aucune valeur par défaut n'existe dans le code — définissez `ADMIN_EMAIL` et
`ADMIN_PASSWORD` (étape 2 ci-dessous) puis lancez :
```bash
cd backend && node src/scripts/seed_admin.js
```
Le script refuse de s'exécuter si l'une des deux variables est absente.

## 2. Backend — variables d'environnement

Copier `backend/.env.example` vers `backend/.env` et remplir les valeurs —
ce fichier est la référence à jour (chaque variable y est commentée : quand
elle est requise, ce qu'elle protège si absente). Au minimum pour démarrer :
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
Le reste (Resend, prospection sortante, chiffrement de la veille documentaire,
CORS) est optionnel — chaque fonctionnalité correspondante reste simplement
désactivée tant que sa variable n'est pas définie, plutôt que d'échouer.

## 3. Frontend — variables d'environnement

Copier `frontend/.env.example` vers `frontend/.env` — même principe, voir les
commentaires du fichier. Minimum : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
`VITE_CONTACT_EMAIL`, `VITE_WHATSAPP_NUMBER`, `VITE_CAL_COM_URL` pilotent les
options de contact affichées dans l'app — non définies, ces blocs restent
simplement masqués (pas de valeur par défaut vers un tiers).

## 4. Démarrage local

```bash
# Backend
cd backend && npm install && npm run dev
# API sur http://localhost:3001

# Frontend (autre terminal)
cd frontend && npm install && npm run dev
# App sur http://localhost:5173
```

## 5. Déploiement Vercel

Le projet est un monorepo à déployer en **un seul** projet Vercel (pas deux
déploiements séparés) :
1. Importer le dépôt dans Vercel — la configuration (`vercel.json` à la racine)
   définit déjà `installCommand`/`buildCommand`/`outputDirectory` et les
   rewrites vers `/api/index` pour le backend serverless.
2. Renseigner toutes les variables du backend (section 2) dans
   Vercel > Settings > Environment Variables, plus les `VITE_*` du frontend
   (elles sont injectées au build, donc nécessaires même si le backend
   tourne sur le même déploiement).
3. Déployer — `/api/*` sert le backend Express en serverless (timeout 60s),
   tout le reste sert le build frontend.

## 6. Clés/services nécessaires

| Service | Où l'obtenir | Requis pour |
|---------|-------------|-------------|
| Supabase | app.supabase.com | Base de données, auth, storage — toujours requis |
| Anthropic | console.anthropic.com | Analyse IA des DIP (`claude-opus-5`) — toujours requis |
| Resend | resend.com | Emails transactionnels — optionnel, fonctionnalités email désactivées sans clé |

## 7. Compte admin

Pas de compte par défaut : `ADMIN_EMAIL`/`ADMIN_PASSWORD` (étape 1) sont les
identifiants du compte créé par `seed_admin.js`, avec le rôle admin.
