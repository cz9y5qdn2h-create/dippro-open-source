# INVARIANTS — ce qu'il ne faut jamais casser

Règles structurantes de DIPpro. Chacune existe parce que sa violation a
**déjà** produit un incident en production. Avant toute modification touchant
une de ces zones, relire la règle concernée.

Voir aussi : [BUG_JOURNAL.md](BUG_JOURNAL.md) (incidents détaillés),
[LEGAL_COPY.md](LEGAL_COPY.md) (libellés juridiques), [CHANGELOG.md](CHANGELOG.md).

---

## 1. Juridique — formulations interdites

| Interdit | Pourquoi | À écrire à la place |
|---|---|---|
| « entraîne la nullité », « rend le DIP invalide », « contrat nul » | La nullité n'est **jamais** automatique en droit français (Cass. com., 20 mars 2007, n°06-11.290) | « expose à un risque de nullité si le franchisé démontre que le manquement a vicié son consentement » |
| Présenter Cass. com. 26 juin 2024 comme confirmant une nullité pour DIP incomplet | L'arrêt porte sur la **dissimulation d'un fait postérieur à la remise**, sur un DIP par ailleurs conforme | « l'obligation d'information court jusqu'à la signature » |
| « DIP certifié conforme » | « Certifié » est réservé à l'horodatage SHA-256 (fait technique vérifiable), jamais au jugement IA | « attestation de remise horodatée (empreinte SHA-256) » |
| Citer « R.330-1 » seul | Un avocat doit pouvoir relier chaque statut au texte exact | « Art. R.330-1, 5° c) C. com. » |
| « Décret n°91-337 du 4 avril 1991 » comme base actuelle | Ce décret n'est plus la version en vigueur depuis le décret n°2023-1394 du 30/12/2023 — cité seul, il expose le site à une incohérence interne visible en trois clics par un avocat | « R.330-1 C. com. dans sa version en vigueur au 1er janvier 2024, modifiée par le décret n°2023-1394 du 30 décembre 2023 » |
| Une citation de jurisprudence sans lien Légifrance vérifiable, ou un chiffre commercial (coût moyen d'un litige, ROI, taux de succès) sans source | Trouvé le 17/08/2026 : une citation fabriquée (« Cass. com., 4 déc. 2024, Lady Moving/Fitness Park Development ») avait survécu jusque dans le prompt système de l'IA et la bibliothèque avocat | Supprimer plutôt que nuancer — règle du fondateur : « si on n'est pas sûr, on ne met pas » |

**Trois endroits doivent rester synchronisés** sur le référentiel légal :
`backend/src/config/claude.js` (prompts du moteur), `frontend/src/lib/legalLibrary.js`
(bibliothèque avocat), `docs/LEGAL_COPY.md` (revue avocat). Modifier l'un sans
les autres crée une divergence entre ce que l'outil applique et ce qu'il affiche.
**Un audit du 17/08/2026 a montré que cette divergence s'étend aussi au marketing**
(landing page, blog, `llms.txt`, `index.html`, onboarding in-app) : toute correction
juridique doit être répercutée sur ces surfaces aussi, pas seulement sur les 3 fichiers
de référence.

---

## 2. Base de données

- **Une migration écrite n'est pas une migration appliquée.** La 022 a vécu des
  mois dans le dépôt sans être en production → 11 h d'échecs d'écriture
  silencieux. La 049 a reproduit l'erreur le 20/08/2026 (committée avec le
  code Resend qui en dépend, jamais donnée à l'utilisateur). **Toute
  migration doit être donnée en SQL complet dans le message même où elle est
  créée, jamais reportée.** Après toute migration, vérifier `/api/health` →
  `database_schema`.
- **Toute nouvelle colonne dont le code dépend** doit être ajoutée à
  `backend/src/config/schemaCheck.js`, sinon la dérive redevient invisible.
- **Vérifier les index existants** avant d'en créer un (un doublon a déjà été
  créé sous un autre nom).
- **Les valeurs de `status` sont contraintes par CHECK** : `dip_certificates.status`
  n'accepte que `pending | generated | ready | error`. Écrire une valeur hors
  liste fait échouer l'`UPDATE` **silencieusement** (le client Supabase ne lève
  pas) — les certificats restaient bloqués en « pending » pour toujours.
- **JAMAIS `.catch()` sur une requête Supabase.** Le query builder n'implémente
  que `.then()` — `.catch` vaut `undefined`, donc l'appeler lève une
  `TypeError` qui fait planter toute la route en 500. C'est ce qui cassait la
  sauvegarde d'une section corrigée par l'assistant IA (le texte généré
  contient des `[À COMPLÉTER]`, ce qui déclenchait le chemin fautif).
  Écrire `.then(({ error }) => { if (error) console.error(...) })`, ou tester
  `error` sur le résultat awaité. `.catch()` reste valide sur une **fonction
  async** (`createCertificate(...).catch(...)` est correct).
- **Numérotation des attestations** : jamais de `MAX(numero)+1`. Le trigger
  `assign_certificate_number` utilise un compteur atomique — un `MAX+1` sous
  insertions concurrentes attribue deux fois le même numéro ou crée un trou,
  ce qui détruit la valeur probatoire de la série.
- **Protection « mot de passe compromis » (HaveIBeenPwned) — indisponible sur
  le plan Supabase actuel.** Cette option (Auth → Policies → Leaked password
  protection) nécessite le **plan Pro** de Supabase. Ne plus la reproposer
  comme un simple réglage à activer tant que le plan n'a pas changé.

---

## 3. Rôles et accès

- **`req.user` ne contient jamais `role`** — seulement `{ id, email, user_metadata }`.
  Tester `req.user.role` compare à `undefined` et passe toujours. Toujours relire
  le rôle en base (voir `middleware/avocatScope.js`).
- **Un cache de rôle qui refuse ne doit jamais bloquer sans revérification.**
  Un rôle corrigé en base laissait sinon l'utilisateur verrouillé 5 minutes.
- **Un admin ne peut pas changer son propre rôle** depuis la console : basculer
  son compte principal en `avocat` fait disparaître toutes ses données de la vue
  et lui retire l'accès admin — vécu comme une perte de données.
- **Le profil frontend doit se replier sur `/auth/me`** (service role,
  autoritaire) si la lecture directe RLS échoue, sinon l'interface diverge de
  ce que le backend autorise réellement.
- **Pour tester un rôle, utiliser un compte séparé** (`theo+avocat@…`), jamais
  le compte principal.

---

## 3bis. Validation avocat des éditions franchiseur (pivot avocat-payeur)

Le modèle économique s'est inversé : l'avocat est le client payeur et l'autorité
de conformité, plus le franchiseur. Deux sens de confirmation coexistent :

- **Avocat propose → franchiseur valide** (`dip_section_proposals` /
  `contract_clause_proposals`, migration 017/030) — inchangé, pour quand
  l'avocat rédige lui-même une reformulation.
- **Franchiseur édite → avocat valide** (`avocat_validation_status` sur
  `dip_sections`/`contract_clauses`, migration 045) — chaque édition directe du
  franchiseur repasse en `pending` ; configurable par relation
  (`avocat_franchiseurs.validation_mode`) :
  - `strict` : le score de conformité live (`computeLiveCompliance`) ne compte
    plus une section « conforme mais non confirmée » comme conforme tant que
    l'avocat n'a pas validé.
  - `alerte` (défaut) : la modification s'applique et compte immédiatement ;
    l'avocat est simplement notifié via `GET /avocat/pending-validations`.
- **Toute édition change de contenu remet le statut à `pending`** — un contenu
  déjà validé qui change à nouveau redevient non confirmé, jamais validé par
  défaut.
- C'est l'**avocat** qui choisit le mode par client (`PATCH
  /avocat/franchiseur/:id/validation-mode`), pas le franchiseur — cohérent
  avec le contrôle total désormais du côté avocat.

---

## 4. Certificats — chemins à couvrir

Toute route qui **modifie le contenu** d'un DIP ou d'un contrat doit appeler
`createCertificate` (non bloquant, en `.catch`). Chemins couverts aujourd'hui :

- `PUT /dip/:id/sections/:sectionId` — édition de section
- `PUT /contracts/:id/clauses/:clauseId` — édition de clause (via `linked_dip_id`)
- `PATCH /alerts/:id/validate` — validation d'une correction IA
- `PUT /avocat/proposals/:id/accept` et `/clause-proposals/:id/accept`
- `POST /dip/create-from-agent` — attestation INITIALE
- `POST /certificates` — flux de réimport (déclenché par le frontend)

**Ajouter un nouveau chemin de modification sans certificat = trou dans la
chaîne de preuve.**

---

## 4bis. Annexes — niveau document, jamais par section

Depuis la migration 048, une annexe se rattache au **DIP ou au contrat entier**
(`dip_id`/`contract_id`), jamais à une section ou une clause précise — comme
sur un acte juridique réel, où les annexes s'énumèrent à la fin, dans l'ordre
d'ajout (`position`). Les routes `POST /avocat/sections/:id/annexes` et
`/avocat/clauses/:id/annexes` n'existent plus ; utiliser
`POST /avocat/dip/:dipId/annexes` et `/avocat/contract/:contractId/annexes`.
**Ne pas réintroduire de rattachement par section** — c'est un choix
délibéré, pas un oubli.

---

## 5. Extraction de documents

- **Ne jamais revenir à `pdf-parse`** : ses quatre moteurs pdf.js (2017-2018)
  échouent tous en « bad XRef entry » sous Node 22, y compris sur des PDF
  valides. Utiliser `backend/src/config/textExtract.js` (pdfjs-dist v4).
- **Après toute montée de version Node** (locale ou Vercel), retester un upload
  PDF réel — c'est la dépendance la plus fragile du projet.

---

## 6. DNS du domaine de production

`iralink-agency.dippro.business` est servi par un **CNAME** vers Vercel. La norme DNS
interdit qu'un CNAME coexiste avec **tout autre enregistrement du même nom**.

- **Ne jamais ajouter de TXT, A, MX, CNAME ou autre sur le nom `iralink-agency`.**
  Incident #1 (10/08/2026) : un TXT de vérification Google posé à cet endroit a écrasé
  le CNAME → site entièrement hors ligne (résolution DNS en échec, HTTP 000).
  Incident #2 (21/08/2026) : la configuration du domaine d'envoi Resend a **remplacé**
  le CNAME par `links1.resend-dns.com` (infrastructure de tracking de liens Resend) →
  site inaccessible, certificat SSL Amazon/CloudFront au lieu de Vercel, 400 Bad Request
  sur toute requête. Même cause racine que l'incident #1 : un enregistrement tiers posé
  sur le nom `iralink-agency` plutôt que sur la racine `dippro.business` ou un
  sous-domaine dédié.
- **Vérification Google Search Console** : utiliser la **balise HTML** dans `index.html`
  (`<meta name="google-site-verification">`), jamais la méthode par enregistrement DNS.
- **Configuration Resend (SPF/DKIM/tracking)** : toujours sur `dippro.business` (racine)
  ou un sous-domaine dédié à l'email (ex. `mail.dippro.business`) — **jamais** sur
  `iralink-agency`, qui doit rester exclusivement le CNAME vers Vercel.
- Enregistrement correct : `CNAME iralink-agency → d0e3e4d5e9f7f4a2.vercel-dns-017.com.`
- Domaine de secours toujours valide en cas de panne DNS : `app-dpi.vercel.app`.
- **Diagnostic rapide en cas de panne** : `curl "https://cloudflare-dns.com/dns-query?name=iralink-agency.dippro.business&type=CNAME" -H "accept: application/dns-json"`
  (préférer Cloudflare à Google DNS pour le diagnostic — Google sert parfois une valeur
  encore en cache plusieurs dizaines de minutes après correction).

---

## 7. URLs générées

- **Toujours passer par `getAppUrl()`** (`backend/src/config/appUrl.js`), qui
  filtre les hostnames `*.vercel.app`. Une URL en dur a déjà envoyé des liens
  d'attestation vers `dippro.fr`, un domaine qui n'est pas celui de
  l'application — un juge suivant le lien imprimé n'aurait rien trouvé.

---

## 8. Frontend

- **Pas de déplacement au survol** (`translateY`/`translateX`) sur les cartes,
  lignes et boutons : le reflet supérieur et l'ombre glissent hors du cadre,
  donnant l'impression que le contenu « sort » de sa case. Retour visuel par
  la bordure et l'ombre uniquement.
- **`<ErrorBoundary>` sur toutes les routes**, y compris publiques — assuré par
  le wrapper `S()` dans `App.jsx`. Ne pas contourner `S()`.
- **Les gardes de route doivent attendre `loading`** avant de décider d'une
  redirection, sinon la page s'affiche brièvement et une action peut partir
  avant la redirection (403 confus côté backend).
- **Aucun `console.log`** en production (règle projet, vérifiée à chaque passe).
- **Toute route ajoutée dans `App.jsx` doit avoir son premier segment de
  chemin ajouté à `ALLOWED_PREFIXES` dans `middleware.js`** (racine du dépôt),
  sinon le Routing Middleware Vercel la bloque en 404 avant même qu'elle
  atteigne React Router.
- **Le fichier doit s'appeler `middleware.js` (ou `.ts`), jamais `.mjs`** —
  Vercel Routing Middleware ne reconnaît que ces deux extensions à la racine
  du dépôt. Un `middleware.mjs` est un fichier parfaitement valide qui ne
  sera **jamais exécuté**, silencieusement (pas d'erreur de build, pas
  d'avertissement) : c'est la vraie cause du soft-404 resté actif plusieurs
  jours malgré une logique de blocage correcte (trouvé le 25/08/2026).

---

## 9. Conformité affichée

- **Ne jamais afficher `compliance_level` / `conformity_score` stockés** : ils
  sont nuls pour les DIP générés par IA et périmés après toute édition
  manuelle. Recalculer en direct depuis les statuts des sections
  (`computeLiveCompliance` dans `backend/src/routes/compliance.js`).
- **Le score doit toujours être accompagné du disclaimer** (`SCORE_DISCLAIMER`
  dans `frontend/src/lib/legalCopy.js`).
