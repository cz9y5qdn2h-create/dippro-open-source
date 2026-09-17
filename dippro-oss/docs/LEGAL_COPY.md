# LEGAL_COPY — Libellés juridiques DIPpro

Ce document liste tous les libellés de l'interface qui touchent à la portée légale de
l'analyse de conformité, en un seul endroit, pour qu'un avocat puisse les valider en un
seul passage plutôt que de devoir relire chaque page qui affiche un score ou un statut.

**Règle absolue, appliquée partout dans ce produit** : la nullité d'un contrat de
franchise n'est **jamais automatique** en droit français (Cass. com., 20 mars 2007,
n°06-11.290). Aucun texte de l'interface, du prompt IA ou d'un document exporté ne doit
affirmer "rend le DIP invalide", "entraîne la nullité" ou "contrat nul" comme une
conséquence certaine — toujours au conditionnel, sous réserve d'un vice du consentement
démontré par le franchisé.

## Source de vérité côté code

- **Frontend** : `frontend/src/lib/legalCopy.js` — importé par toute page qui affiche un
  score, un `compliance_level`, ou une mention d'avertissement.
- **Backend (prompt IA)** : `backend/src/config/claude.js` — `parseDIPSections` et
  `generateDIPFromForm` portent la grille de conformité et les mêmes règles de wording.
- **Backend (export PDF)** : `backend/src/routes/export.js` — le disclaimer de score est
  dupliqué en dur (pas de code partagé entre les deux apps du monorepo), à garder
  identique à `SCORE_DISCLAIMER` en cas de modification.

## 1. Niveaux de conformité (`compliance_level`)

| Valeur backend | Libellé UI | Où il s'affiche |
|---|---|---|
| `CONFORME` | Conforme à la grille R.330-1 | `/conformite`, onglet Conformité avocat |
| `RÉVISIONS_MINEURES` | Révisions mineures recommandées | idem |
| `RÉVISIONS_MAJEURES` | Révisions majeures nécessaires | idem |
| `BLOQUANT_NON_ENVOYABLE` | Risque juridique élevé — remise déconseillée en l'état | idem |

Jamais "Bloquant — non envoyable" (ancien libellé, trop absolu) ni "juridiquement
inattaquable" pour `CONFORME` — la conformité à la grille R.330-1 n'immunise pas contre
la réticence dolosive (voir section 9 ci-dessous).

## 2. Disclaimer de score

Affiché à côté de tout score de conformité (`conformity_score`) :

> Score indicatif d'aide à la préparation — ne constitue pas un avis juridique et ne
> remplace pas la validation par votre avocat.

Présent sur : `/conformite`, onglet Conformité avocat, tableau de bord (via
`AIDisclaimer`), page Mon DIP (via `AIDisclaimer`), rapport PDF exporté
(`GET /export/:dipId/pdf`).

## 3. Mention "ne remplace pas un avocat"

> DIPpro prépare et structure le travail de conformité ; il ne remplace pas la
> validation par un avocat.

Présent sur : landing page (FAQ "DIPpro remplace-t-il un avocat ?"), et partout où
`AIDisclaimer` est utilisé (mutualise avec le disclaimer de score dans l'UI, texte
identique).

## 4. Section 9 — Litiges (wording distinct)

La section 9 ne repose pas sur la checklist R.330-1 mais sur le devoir général
d'information (art. 1112-1 C. civ.) et le dol. Elle doit toujours être présentée
différemment des sections 1-8 :

> Risque de réticence dolosive (Cass. com., 26 juin 2024, n°23-14.085)

**Rappel exact de l'arrêt** (souvent mal cité) : le franchiseur avait remis un DIP par
ailleurs **conforme**, mais a été condamné pour avoir **tu des procédures collectives
survenues entre la remise du DIP et la signature** du contrat. Ce n'est donc pas une
règle générale "DIP inexact → nullité", mais la confirmation que l'obligation
d'information **court jusqu'à la signature**, et qu'un DIP conforme au moment de sa
remise n'immunise pas contre ce risque spécifique.

Corollaire à rappeler dans tout rapport qui évoque cet arrêt : *un DIP conforme ne
protège pas d'une condamnation si une information déterminante survenue avant signature
n'est pas transmise.*

## 5. "Certifié" / "Attestation"

- **Réservé** à l'horodatage SHA-256 de la remise (fait technique vérifiable) :
  "attestation de remise horodatée (empreinte SHA-256)".
- **Jamais** appliqué au jugement de conformité IA (non déterministe) — pas de "DIP
  certifié conforme" ou équivalent nulle part dans le produit.

## 6. Base légale exacte par section (grille de conformité)

À reporter systématiquement en `legal_reference` — jamais "R.330-1" seul, toujours la
sous-disposition (vérifié contre le texte en vigueur au 01/01/2024, décret n°2023-1394
du 30/12/2023) :

| # | Section | Base légale exacte |
|---|---|---|
| 1 | Identité du franchiseur | Art. R.330-1, 1° + 2° + 3° C. com. |
| 2 | Historique dirigeant/enseigne | Art. R.330-1, 4° al. 1-2 C. com. |
| 3 | État du réseau | Art. R.330-1, 5° a) à d) C. com. |
| 4 | Comptes annuels | Art. R.330-1, 4° al. 3 C. com. |
| 5 | Marque et propriété intellectuelle | Art. R.330-1, 2° C. com. |
| 6 | Informations financières | Art. R.330-1, dernier alinéa C. com. + pratique de place |
| 7 | Territoire exclusif | Art. R.330-1, 6°, "champ des exclusivités" C. com. |
| 8 | Contrat | Art. R.330-1, 6° C. com. (durée, renouvellement, résiliation, cession) |
| 9 | Litiges | Art. 1112-1 Code civil (hors périmètre R.330-1) |
| 10 | Prévisionnels | Jurisprudence (hors périmètre R.330-1) |

## 7. Historique des corrections

- **2026-08-09** — Correction de la mauvaise attribution de Cass. com., 26 juin 2024,
  n°23-14.085 (landing page, FAQ, 2 articles de blog) qui présentait l'arrêt comme
  confirmant une nullité générale pour DIP incomplet/inexact, alors qu'il porte sur la
  dissimulation d'une information postérieure à la remise. Correction complète du
  wording produit suite à relecture juridique détaillée (sous-dispositions R.330-1
  exactes, interdiction du wording "nullité automatique", libellés `compliance_level`,
  disclaimer de score, distinction section 9).
- **2026-08-19** — Ajout de l'art. L.341-2 C. com. (plafond légal d'un an pour la clause
  de non-concurrence post-contractuelle) : absent du prompt d'analyse de contrat alors
  que la clause 7 (non-concurrence) était déjà vérifiée sans base légale précise pour
  juger sa durée. Ajouté dans `claude.js` (sections DIP 8, analyse de contrat, prompt
  système contrat) et dans `legalLibrary.js`. Correction en parallèle d'une citation
  incertaine (Cass. 1re civ. 25 janv. 2017, n°15-28.064) recyclée à tort dans le tableau
  des sanctions de `legalLibrary.js` pour un point sans rapport (prévisionnels) —
  retirée, conformément à la règle « si on n'est pas sûr, on ne met pas ».
