# Déploiement DIPpro sur Vercel

## Architecture

Un seul projet Vercel déployé depuis la **racine** du repo.
- Frontend React → servi en statique
- Backend Express → `/api/*` en serverless function
- Pas besoin de `VITE_API_URL` : tout est sur le même domaine

---

## 1. Prérequis : Supabase

Le projet Supabase est déjà configuré :
- **URL** : `<votre URL Supabase>`
- **Anon key** : voir `frontend/.env.example`

Récupérer la `service_role key` :
→ Supabase Dashboard > Settings > API > **service_role** (secret)

Appliquer les migrations SQL si ce n'est pas fait :
→ Supabase Dashboard > SQL Editor > coller et exécuter dans l'ordre :
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_add_profile_fields.sql`
3. `supabase/migrations/003_automation_settings.sql`

---

## 2. Déploiement Vercel (projet unique)

### Étape 1 — Importer le repo

1. Aller sur **https://vercel.com/new**
2. Sélectionner le repo `cz9y5qdn2h-create/app-dpi`
3. **Root Directory** : laisser **vide** (racine du repo)
4. **Framework Preset** : `Other`
5. Cliquer **Deploy** (il va lire le `vercel.json` à la racine)

### Étape 2 — Variables d'environnement

Dans Vercel > Project > Settings > **Environment Variables**, ajouter :

| Variable | Valeur | Obligatoire |
|---|---|---|
| `SUPABASE_URL` | `<votre URL Supabase>` | ✅ |
| `SUPABASE_ANON_KEY` | voir `frontend/.env.example` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role Supabase | ✅ |
| `ANTHROPIC_API_KEY` | `sk-ant-...` depuis console.anthropic.com | ✅ |
| `VITE_SUPABASE_URL` | `<votre URL Supabase>` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | voir `frontend/.env.example` | ✅ |
| `VITE_CAL_COM_URL` | `https://cal.com/votre-identifiant` | ✅ |
| `VITE_CONTACT_EMAIL` | `contact@example.com` | ✅ |
| `VITE_CONTACT_PHONE` | numéro optionnel | ❌ |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | ❌ |
| `RESEND_API_KEY` | clé Resend pour emails franchisés | ❌ |
| `RESEND_SENDER_EMAIL` | `contact@dippro.business` | ❌ |

> ⚠️ **Ne pas** ajouter `VITE_API_URL` — le backend est sur le même domaine.

### Étape 3 — Redéployer

Après avoir ajouté les variables :
- Vercel > Deployments > cliquer les 3 points > **Redeploy**

---

## 3. Développement local

```bash
# Cloner
git clone https://github.com/cz9y5qdn2h-create/app-dpi
cd app-dpi
git checkout claude/build-dippro-mvp-SZEtW

# Backend
cd backend
cp .env.example .env
# Remplir SUPABASE_SERVICE_ROLE_KEY et ANTHROPIC_API_KEY dans .env
npm install
npm run dev          # démarre sur http://localhost:3001

# Frontend (nouvel onglet terminal)
cd frontend
cp .env.example .env.local
# Vérifier que VITE_API_URL=http://localhost:3001 est dans .env.local
npm install
npm run dev          # démarre sur http://localhost:5173
```

Accéder à l'app : **http://localhost:5173**

---

## 4. Compte admin

Aucun mot de passe par défaut n'est fourni : `ADMIN_EMAIL` et `ADMIN_PASSWORD`
doivent être définis dans l'environnement avant d'exécuter le script de seed
(`backend/src/scripts/seed_admin.js`), qui refuse de s'exécuter sans eux.

---

## 5. Dépannage courant

| Symptôme | Cause | Solution |
|---|---|---|
| Page blanche / erreur réseau | `VITE_API_URL` configuré sur mauvais domaine | Supprimer la variable sur Vercel |
| "FATAL: SUPABASE_SERVICE_ROLE_KEY manquant" | Variable manquante | L'ajouter dans Vercel Settings |
| Login échoue | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` manquants | Les ajouter dans Vercel Settings |
| Upload DIP échoue | `ANTHROPIC_API_KEY` invalide ou manquant | Vérifier la clé sur console.anthropic.com |
| Cal.com ne s'ouvre pas | `VITE_CAL_COM_URL` manquant | L'ajouter dans Vercel Settings |
