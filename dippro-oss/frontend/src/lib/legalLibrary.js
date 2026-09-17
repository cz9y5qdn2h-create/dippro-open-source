// Référentiel juridique de la franchise — source unique consultable depuis
// l'espace avocat. Contenu aligné sur celui qui pilote réellement le moteur
// d'analyse (backend/src/config/claude.js) et sur docs/LEGAL_COPY.md, pour
// qu'un avocat lise exactement les mêmes règles que celles appliquées aux
// DIP de ses clients. Toute évolution doit être répercutée aux trois
// endroits — voir docs/INVARIANTS.md.

export const LEGAL_ENTRIES = [
  // ── Socle légal ────────────────────────────────────────────────────────
  {
    id: 'l330-3',
    category: 'Socle légal',
    ref: 'Art. L.330-3 C. com.',
    title: 'Obligation d\'information précontractuelle (Loi Doubin)',
    summary: "Impose la remise d'un document d'information sincère au moins 20 jours avant la signature ou tout versement de somme, à toute personne mettant à disposition un nom commercial, une marque ou une enseigne en exigeant un engagement d'exclusivité ou de quasi-exclusivité.",
    body: [
      "Codifie la loi n°89-1008 du 31 décembre 1989. Le champ d'application dépasse la franchise : concession exclusive, licence de marque avec quasi-exclusivité, certaines formes d'affiliation et de coopération commerciale y sont soumises.",
      "Le document ET le projet de contrat doivent être communiqués au moins 20 jours avant la signature ou, si elle est antérieure, avant le versement de toute somme (droit d'entrée, acompte, dépôt de garantie, frais de dossier ou d'étude).",
      "Dispositions d'ordre public : toute clause visant à exonérer le franchiseur de sa responsabilité en cas d'information défaillante est réputée non écrite.",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006231936',
    keywords: ['doubin', 'information précontractuelle', '20 jours', 'exclusivité', 'quasi-exclusivité', 'ordre public'],
  },
  {
    id: 'r330-1',
    category: 'Socle légal',
    ref: 'Art. R.330-1 C. com.',
    title: 'Contenu obligatoire du DIP — les 6 alinéas',
    summary: "Fixe la liste exhaustive des mentions du DIP, en six catégories. Version en vigueur au 1er janvier 2024 (décret n°2023-1394 du 30 décembre 2023).",
    body: [
      "1° — Identité et structure : adresse du siège, nature des activités, forme juridique, identité du chef d'entreprise ou des dirigeants, montant du capital social le cas échéant.",
      "2° — Marque ou enseigne : date et numéro d'enregistrement. En cas d'acquisition par cession ou licence : date et numéro d'inscription au registre national des marques, et durée de la licence consentie.",
      "3° — Domiciliations bancaires de l'entreprise — l'information peut être limitée aux cinq principales.",
      "4° — Historique, marché et comptes : date de création et principales étapes ; expérience professionnelle des dirigeants (limitable aux 5 dernières années) ; état général ET LOCAL du marché avec perspectives de développement ; comptes annuels des deux derniers exercices annexés.",
      "5° — Présentation du réseau : a) liste des membres et mode d'exploitation ; b) adresses des entreprises françaises sous contrat de même nature avec dates (limitable aux 50 plus proches si le réseau dépasse 50 exploitants) ; c) nombre d'entreprises ayant quitté le réseau l'année précédente, en distinguant expiration / résiliation / annulation ; d) présence d'un établissement concurrent autorisé par le franchiseur dans la zone.",
      "6° — Durée du contrat proposé, conditions de renouvellement, de résiliation et de cession, champ des exclusivités.",
      "Dernier alinéa — Nature et montant des dépenses et investissements spécifiques à l'enseigne ou à la marque à engager avant le début d'exploitation.",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006266469',
    keywords: ['contenu', 'mentions obligatoires', 'réseau', 'comptes annuels', 'marché local', 'inpi', 'domiciliation'],
  },
  {
    id: 'r330-2',
    category: 'Socle légal',
    ref: 'Art. R.330-2 C. com.',
    title: 'Sanction pénale du non-respect du délai',
    summary: "Ne pas communiquer le DIP et le projet de contrat au moins 20 jours avant la signature (ou tout versement) est puni de l'amende des contraventions de 5e classe.",
    body: [
      "Jusqu'à 1 500 € pour une personne physique, 3 000 € en cas de récidive ; montant multiplié par cinq pour une personne morale.",
      "Le délai court à compter de la remise effective et complète du DIP et du projet de contrat — la charge de la preuve pèse sur le franchiseur, d'où l'usage d'un accusé de réception daté.",
      "En cas de remise fragmentée ou incomplète puis complétée, le délai recommence à courir à compter de la dernière communication.",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006266481',
    keywords: ['sanction', 'pénal', 'amende', 'contravention', 'délai', '20 jours'],
  },

  // ── Code civil ─────────────────────────────────────────────────────────
  {
    id: 'civ-1112-1',
    category: 'Code civil',
    ref: 'Art. 1112-1 C. civ.',
    title: 'Devoir général d\'information précontractuelle',
    summary: "Se cumule avec le Code de commerce et couvre des informations déterminantes absentes du R.330-1 (difficultés du réseau, restructurations, données économiques défavorables).",
    body: [
      "« Celle des parties qui connaît une information dont l'importance est déterminante pour le consentement de l'autre doit l'en informer dès lors que, légitimement, cette dernière ignore cette information ou fait confiance à son cocontractant. »",
      "INTERPRÉTATION RESTRICTIVE depuis Cass. com., 14 mai 2025 (n°23-17.948, 23-18.049, 23-18.082) : la Cour exige la preuve cumulative de DEUX conditions autonomes — un lien direct entre l'information omise et le consentement, ET son caractère déterminant. Une omission ne suffit donc jamais à elle seule à caractériser le manquement.",
    ],
    keywords: ['1112-1', 'devoir information', 'déterminant', 'omission', 'restrictive'],
  },
  {
    id: 'civ-vices',
    category: 'Code civil',
    ref: 'Art. 1130 et s. C. civ.',
    title: 'Vices du consentement — erreur, dol, violence',
    summary: "Fondement de l'action en nullité du contrat de franchise en cas de DIP défaillant. La nullité n'est jamais automatique : elle suppose un vice du consentement démontré.",
    body: [
      "L'erreur : une information manquante ou fausse a conduit le franchisé à se tromper sur un élément essentiel.",
      "Le dol (art. 1137) : réticence dolosive — le franchiseur a sciemment tu une information déterminante.",
      "Art. 1231-1 : responsabilité contractuelle, fondement d'une demande de dommages-intérêts, alternative à la nullité souvent privilégiée quand le contrat a déjà été exécuté plusieurs années. Art. 1240 : responsabilité délictuelle.",
    ],
    keywords: ['nullité', 'dol', 'erreur', 'vice du consentement', 'dommages-intérêts', '1137'],
  },

  // ── Jurisprudence ──────────────────────────────────────────────────────
  {
    id: 'cass-2007',
    category: 'Jurisprudence',
    ref: 'Cass. com., 20 mars 2007, n°06-11.290',
    title: 'Principe fondateur — pas de nullité automatique',
    summary: "Les juges ne peuvent pas déduire un vice du consentement du seul manquement à l'obligation d'information précontractuelle.",
    body: [
      "Le candidat doit démontrer que l'absence ou l'insuffisance d'information a provoqué une erreur, un dol ou une violence ayant déterminé son consentement.",
      "CONSÉQUENCE PRATIQUE : ne jamais présenter un DIP incomplet comme entraînant automatiquement la nullité du contrat. Toute formulation doit rester au conditionnel, sous réserve d'un vice du consentement démontré.",
    ],
    keywords: ['nullité automatique', 'principe', 'vice du consentement', '2007'],
  },
  {
    id: 'cass-2024-06',
    category: 'Jurisprudence',
    ref: 'Cass. com., 26 juin 2024, n°23-14.085',
    title: 'L\'obligation d\'information court jusqu\'à la signature',
    summary: "Un franchiseur dont le DIP était par ailleurs CONFORME a été condamné pour avoir tu des procédures collectives survenues entre la remise du DIP et la signature.",
    body: [
      "Il revient aux juges du fond de vérifier si le franchiseur n'a pas gardé intentionnellement le silence sur des faits déterminants survenus après la remise du DIP et avant la signature, et si cette information n'aurait pas dissuadé le franchisé de contracter.",
      "ATTENTION AUX CITATIONS ERRONÉES : cet arrêt ne pose PAS une règle générale « DIP inexact = nullité ». Son apport est que l'obligation d'information ne s'arrête pas à la remise du document.",
      "COROLLAIRE : un DIP conforme n'immunise pas contre une condamnation si une information déterminante survenue avant la signature n'est pas transmise.",
    ],
    url: 'https://www.legifrance.gouv.fr/juri/id/JURITEXT000049857380',
    keywords: ['actualisation', 'réticence dolosive', 'procédure collective', '2024', 'signature'],
  },
  {
    id: 'cass-2025-03',
    category: 'Jurisprudence',
    ref: 'Cass. com., 19 mars 2025, n°23-22.925 et n°24-13.066',
    title: 'Non-concurrence — les actes préparatoires restent licites',
    summary: "Un franchisé peut accomplir des actes préparatoires à une future activité concurrente sans violer sa clause de non-concurrence, tant que l'activité ne débute pas avant l'expiration du contrat.",
    body: [
      "Deux arrêts jumeaux distinguant les actes préparatoires licites (études, démarches, prises de contact) de la concurrence effective fautive.",
      "POINT DE VIGILANCE EN RÉVISION DE CONTRAT : une clause de non-concurrence rédigée pour interdire ces actes préparatoires eux-mêmes excède ce que la jurisprudence reconnaît comme licite.",
    ],
    keywords: ['non-concurrence', 'actes préparatoires', '2025', 'clause', 'post-contractuelle'],
  },
  {
    id: 'cass-2025-05',
    category: 'Jurisprudence',
    ref: 'Cass. com., 14 mai 2025, n°23-17.948 e.a.',
    title: 'Interprétation restrictive du devoir d\'information général',
    summary: "Exige la preuve cumulative d'un lien direct entre l'information omise et le consentement, ET du caractère déterminant de cette information.",
    body: [
      "Rendu en matière de cession de parts sociales, hors franchise stricto sensu, mais sur le fondement identique de l'art. 1112-1 invoqué en matière de litiges non listés au R.330-1.",
      "Ne plus présumer qu'une omission suffit à caractériser le manquement.",
    ],
    keywords: ['1112-1', 'restrictive', '2025', 'preuve cumulative'],
  },
  {
    id: 'cass-previsionnels',
    category: 'Jurisprudence',
    ref: 'Cass. com., 1er déc. 2021 (n°18-26.572) — 1er juin 2022 (n°21-16.481)',
    title: 'Prévisionnels grossièrement erronés',
    summary: "La communication de prévisionnels grossièrement erronés peut caractériser un dol. Les chiffres portent « sur la substance même du contrat de franchise ».",
    body: [
      "L'espérance de gain est déterminante du consentement du candidat.",
      "Aucune obligation légale de fournir un prévisionnel — mais s'il est fourni, il doit être sérieux, sincère, préciser ses hypothèses, comporter un avertissement explicite sur son caractère non garanti, et rester cohérent avec la performance réelle du réseau.",
    ],
    keywords: ['prévisionnel', 'dol', 'business plan', 'projections', 'chiffre d\'affaires'],
  },
  {
    id: 'cass-rupture',
    category: 'Jurisprudence',
    ref: 'Cass. com., 22 juin 2022, n°21-14.230',
    title: 'Rupture brutale d\'une relation commerciale établie',
    summary: "L'article L.442-1, II s'applique aux relations de franchise et de réseau rompues sans préavis suffisant.",
    body: [
      "Applicable après plusieurs années de relation. Un préavis insuffisant ouvre droit à indemnisation du préjudice lié au préavis manquant.",
    ],
    keywords: ['rupture brutale', 'préavis', 'L442-1', 'résiliation'],
  },

  // ── Champ d'application ────────────────────────────────────────────────
  {
    id: 'quasi-exclusivite',
    category: 'Champ d\'application',
    ref: 'Règl. UE 2022/720',
    title: 'Quasi-exclusivité : le seuil de 80 % n\'est qu\'indicatif',
    summary: "Un montage en-deçà de 80 % d'achats peut rester soumis à l'obligation de DIP si les circonstances de fait le justifient.",
    body: [
      "Le seuil de 80 % du règlement d'exemption par catégorie des accords verticaux n'est qu'un indicateur économique.",
      "La quasi-exclusivité au sens de l'art. L.330-3 reste une notion factuelle, appréciée au cas par cas par les juges du fond.",
      "Ne jamais conclure qu'un montage échappe au DIP sur la seule base d'un taux d'achat inférieur à 80 %.",
    ],
    keywords: ['quasi-exclusivité', '80%', 'champ application', 'concession', 'exemption'],
  },
  {
    id: 'l442-1',
    category: 'Champ d\'application',
    ref: 'Art. L.442-1 C. com.',
    title: 'Déséquilibre significatif et rupture brutale',
    summary: "Actions complémentaires mobilisables en cours d'exécution du contrat, indépendamment du DIP.",
    body: [
      "I, 2° — Déséquilibre significatif : clauses créant un déséquilibre manifeste au détriment du franchisé (exclusivité territoriale avec réserves cachées, résiliation unilatérale sans contrepartie, redevances indexées sans plafond). Sanction : suppression de la clause + dommages-intérêts.",
      "II — Rupture brutale d'une relation commerciale établie : indemnisation du préjudice lié au préavis manquant.",
    ],
    keywords: ['déséquilibre significatif', 'L442-1', 'clause abusive', 'rupture'],
  },
  {
    id: 'l341-2',
    category: "Champ d'application",
    ref: 'Art. L.341-2 C. com.',
    title: 'Clause de non-concurrence post-contractuelle — plafond légal',
    summary: "Une clause de non-concurrence après la fin du contrat n'est valable que si elle cumule quatre conditions, dont une durée maximale d'un an.",
    body: [
      "Conditions cumulatives : elle doit concerner des biens et services en concurrence avec ceux du réseau ; se limiter aux lieux d'exploitation prévus au contrat ; être indispensable à la protection du savoir-faire substantiel, spécifique et secret transmis ; et ne pas excéder un an après l'échéance ou la résiliation.",
      "Une clause qui dépasse un an, ou qui manque l'une des trois autres conditions, est nulle pour cette partie — à distinguer de la clause de non-concurrence PENDANT le contrat, non soumise à ce plafond.",
      "Point de vigilance en révision de contrat : une durée de 2 ans ou une zone géographique dépassant les lieux d'exploitation contractuels expose la clause à être réputée non écrite dans son intégralité.",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006236792',
    keywords: ['non-concurrence', 'post-contractuelle', 'un an', 'L341-2', 'savoir-faire', 'clause'],
  },

  // ── Droit commercial connexe ──────────────────────────────────────────────
  // Textes hors périmètre direct de la Loi Doubin mais régulièrement mobilisés
  // en révision de contrat de franchise. Contrairement aux sections précédentes,
  // ces articles ne sont pas (encore) vérifiés par le moteur d'analyse IA de
  // DIPpro — à traiter comme une référence documentaire, pas comme une
  // extension du périmètre contrôlé automatiquement.
  {
    id: 'l341-1',
    category: 'Droit commercial connexe',
    ref: 'Art. L.341-1 C. com.',
    title: "Champ d'application des art. L.341-1 à L.341-3 — contrats de distribution",
    summary: "Définit les contrats concernés par les plafonds de non-concurrence post-contractuelle (L.341-2) : franchise, licence de marque, distribution exclusive ou quasi-exclusive.",
    body: [
      "S'applique aux contrats par lesquels une personne met à disposition d'une autre un nom commercial, une marque ou une enseigne, en exigeant d'elle un engagement d'exclusivité ou de quasi-exclusivité pour l'exercice de son activité — le même périmètre matériel que celui de l'art. L.330-3.",
      "Utile pour vérifier, avant d'invoquer le plafond d'un an de l'art. L.341-2, que le contrat examiné entre bien dans ce périmètre (attention aux montages de distribution simple sans exclusivité, hors champ).",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006236790',
    keywords: ['L341-1', 'champ application', 'distribution', 'exclusivité', 'quasi-exclusivité'],
  },
  {
    id: 'l330-1',
    category: 'Droit commercial connexe',
    ref: 'Art. L.330-1 C. com.',
    title: "Durée maximale d'une clause d'exclusivité d'achat",
    summary: "Toute clause par laquelle un acheteur, cessionnaire ou locataire de biens meubles s'engage vis-à-vis de son vendeur, cédant ou bailleur à ne pas faire usage d'objets similaires provenant d'un autre fournisseur est nulle si elle est conclue pour une durée supérieure à 10 ans.",
    body: [
      "S'applique aux clauses d'approvisionnement exclusif souvent adossées aux contrats de franchise (obligation d'acheter exclusivement auprès du franchiseur ou de fournisseurs référencés).",
      "Une clause d'exclusivité d'achat de durée indéterminée ou supérieure à 10 ans encourt la nullité — distincte du plafond d'un an de la clause de non-concurrence POST-contractuelle (art. L.341-2), qui vise un objet différent (l'activité concurrente après la fin du contrat, pas l'obligation d'achat pendant le contrat).",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006229723',
    keywords: ['exclusivité d\'achat', 'approvisionnement', '10 ans', 'L330-1', 'fournisseur'],
  },
  {
    id: 'l420-1',
    category: 'Droit commercial connexe',
    ref: 'Art. L.420-1 C. com.',
    title: 'Prohibition des ententes anticoncurrentielles',
    summary: "Interdit les actions concertées ayant pour objet ou pour effet d'empêcher, de restreindre ou de fausser le jeu de la concurrence — notamment la fixation de prix de revente imposés dans un réseau de franchise.",
    body: [
      "Point de vigilance en révision de contrat : le franchiseur peut recommander un prix de vente mais ne peut pas l'imposer contractuellement au franchisé — un « prix de revente imposé » (hors prix maximum ou prix conseillé non contraignant) est une restriction caractérisée (« hardcore restriction ») au sens du règlement d'exemption UE 2022/720, qui prive l'ensemble du réseau du bénéfice de l'exemption.",
      "Distinct du contrôle DIP : ce texte sanctionne une pratique contractuelle, pas un défaut d'information précontractuelle.",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006241546',
    keywords: ['entente', 'concurrence', 'prix imposé', 'L420-1', 'restriction caractérisée'],
  },
  {
    id: 'l714-1',
    category: 'Droit commercial connexe',
    ref: 'Art. L.714-1 CPI',
    title: 'Licence de marque — cadre de la mise à disposition',
    summary: "La marque peut faire l'objet d'une licence pour tout ou partie des produits ou services désignés dans l'enregistrement — fondement de la mise à disposition de l'enseigne dans un contrat de franchise.",
    body: [
      "À vérifier en révision de contrat : la licence de marque doit être formalisée (souvent une clause dédiée du contrat de franchise, parfois un acte séparé), et son inscription au registre national des marques conditionne son opposabilité aux tiers.",
      "À croiser avec l'art. R.330-1, 2° C. com. (obligation de mentionner dans le DIP la date et le numéro d'enregistrement de la marque) — un défaut d'inscription de la licence n'est pas la même chose qu'un défaut de mention dans le DIP, les deux doivent être vérifiés séparément.",
    ],
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006279799',
    keywords: ['marque', 'licence', 'enseigne', 'L714-1', 'CPI', 'INPI'],
  },
  {
    id: 'civ-1104',
    category: 'Droit commercial connexe',
    ref: 'Art. 1104 et 1194 C. civ.',
    title: 'Bonne foi contractuelle et suites du contrat',
    summary: "Les contrats doivent être négociés, formés et exécutés de bonne foi (art. 1104) ; ils obligent à ce qui est exprimé et à toutes les suites que leur donnent l'équité, l'usage ou la loi (art. 1194).",
    body: [
      "Fondement résiduel régulièrement invoqué en franchise à côté de l'art. 1112-1 (devoir d'information) — notamment pour l'exécution loyale de l'assistance et de la formation promises par le franchiseur pendant toute la durée du contrat, pas seulement à sa signature.",
      "Art. 1104 est d'ordre public — une clause qui prétendrait écarter contractuellement l'exigence de bonne foi est réputée non écrite.",
    ],
    keywords: ['bonne foi', '1104', '1194', 'exécution du contrat', 'assistance', 'formation'],
  },
];

// Tableau récapitulatif des sanctions — vue de synthèse demandée en premier
// par un avocat qui évalue un dossier.
export const SANCTIONS = [
  { manquement: 'DIP non remis ou hors délai de 20 jours', sanction: 'Amende contraventionnelle (5e classe)', fondement: 'Art. R.330-2 C. com.' },
  { manquement: 'DIP incomplet/insincère ayant vicié le consentement', sanction: 'Nullité du contrat + restitution des sommes versées', fondement: 'Art. 1130 s. C. civ. sur la base de L.330-3' },
  { manquement: 'Information déterminante dissimulée intentionnellement', sanction: 'Dol → nullité et/ou dommages-intérêts', fondement: 'Art. 1137 C. civ. ; Cass. com. 26 juin 2024' },
  { manquement: 'Prévisionnels grossièrement erronés', sanction: 'Dommages-intérêts ; clauses d\'exonération réputées non écrites', fondement: 'Cass. com. 1er déc. 2021, n°18-26.572' },
  { manquement: 'Clause de non-concurrence post-contractuelle non conforme', sanction: 'Clause réputée non écrite dans son intégralité', fondement: 'Art. L.341-2 C. com.' },
  { manquement: 'Manquement sans vice du consentement démontré', sanction: 'Responsabilité civile, sans nullité', fondement: 'Art. 1112-1 et 1231-1 C. civ. ; Cass. com. 20 mars 2007' },
  { manquement: 'Clause créant un déséquilibre significatif', sanction: 'Suppression de la clause + dommages-intérêts', fondement: 'Art. L.442-1, I, 2° C. com.' },
  { manquement: 'Rupture brutale de la relation', sanction: 'Indemnisation du préavis manquant', fondement: 'Art. L.442-1, II C. com.' },
];

export const CATEGORIES = ['Socle légal', 'Code civil', 'Jurisprudence', 'Champ d\'application', 'Droit commercial connexe'];

export function searchLegalEntries(query) {
  const q = query.trim().toLowerCase();
  if (!q) return LEGAL_ENTRIES;
  return LEGAL_ENTRIES.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.ref.toLowerCase().includes(q) ||
    e.summary.toLowerCase().includes(q) ||
    e.body.some(p => p.toLowerCase().includes(q)) ||
    e.keywords.some(k => k.includes(q))
  );
}
