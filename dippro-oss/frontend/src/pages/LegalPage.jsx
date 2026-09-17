import { Link, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import usePageBackground from '../lib/usePageBackground';

const LEGAL_BG = 'linear-gradient(145deg, #dde2f5 0%, #ebe7fa 40%, #dceaf8 70%, #e3e1f6 100%)';

const TODAY = '15 août 2026';
const IRALINK_EMAIL = 'theo@iralink-agency.com';
const PRIVACY_EMAIL = 'privacy@iralink-agency.com';

const LEGAL_CONTENT = {
  cgu: {
    title: "Conditions Générales d'Utilisation",
    lastUpdated: TODAY,
    sections: [
      {
        title: "1. Objet et champ d'application",
        content: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme DIPpro, service SaaS édité par Iralink Agency (ci-après « Iralink » ou « l'Éditeur »), accessible à l'adresse iralink-agency.dippro.business.

DIPpro est un outil d'aide à la gestion et à la conformité des Documents d'Information Précontractuelle (DIP) pour les franchiseurs, dans le cadre de la Loi Doubin (Loi n° 89-1008 du 31 décembre 1989, codifiée à l'article L.330-3 du Code de commerce et ses décrets d'application).

Les présentes CGU s'appliquent à toute personne physique ou morale qui accède à la plateforme et crée un compte utilisateur (ci-après « l'Utilisateur »).`
      },
      {
        title: "2. Acceptation des conditions",
        content: `L'accès à la plateforme est conditionné à l'acceptation expresse et sans réserve des présentes CGU, matérialisée par le cochage d'une case dédiée lors de la création du compte.

L'acceptation crée un contrat juridiquement contraignant entre l'Utilisateur et Iralink. La date et l'heure d'acceptation sont horodatées et conservées conformément au RGPD.

Iralink se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet dès leur publication. L'Utilisateur en sera informé par email. L'utilisation continue du service après notification vaut acceptation des nouvelles conditions. En cas de refus, l'Utilisateur doit cesser d'utiliser le service et contacter ${IRALINK_EMAIL}.`
      },
      {
        title: "3. ⚠️ Clause essentielle — Nature des analyses par intelligence artificielle",
        content: `AVERTISSEMENT IMPORTANT — À LIRE ATTENTIVEMENT

Les analyses, scores de conformité et recommandations produits par DIPpro sont générés par intelligence artificielle (modèle Claude d'Anthropic) à titre PUREMENT INDICATIF et d'aide à la décision.

Ces analyses NE CONSTITUENT PAS et NE SAURAIENT ÊTRE ASSIMILÉES à :
• Un conseil juridique au sens de la loi n° 71-1130 du 31 décembre 1971
• Une consultation d'avocat
• Une garantie de conformité légale du DIP analysé ou généré
• Une certification ou labellisation officielle

L'Utilisateur reconnaît expressément, en acceptant les présentes CGU, que :
1. Tout DIP destiné à être remis à un candidat-franchisé doit être vérifié et validé par un avocat spécialisé en droit de la franchise ou un expert-comptable
2. Iralink Agency ne peut en aucun cas être tenu responsable des conséquences juridiques, commerciales ou financières résultant de l'utilisation des analyses ou documents générés par DIPpro, avec ou sans intervention d'un professionnel du droit
3. La conformité légale effective du DIP relève de la seule et entière responsabilité du franchiseur-Utilisateur

Iralink recommande systématiquement de faire relire tout DIP par un professionnel du droit avant sa remise officielle.`
      },
      {
        title: "4. Description du service",
        content: `DIPpro propose les fonctionnalités suivantes dans la limite des droits accordés par l'abonnement souscrit :

• Analyse automatique de la conformité des DIP (upload PDF/DOCX) par IA
• Génération assistée de DIP complets via formulaire guidé
• Détection des changements entre versions successives de DIP
• Calcul d'un score de conformité indicatif (0–100%)
• Gestion d'un annuaire de franchisés
• Envoi de notifications de mise à jour aux franchisés
• Partage sécurisé du DIP via lien tokenisé
• Export des documents en format PDF et DOCX
• Alertes de renouvellement et de mise à jour annuelle

Iralink se réserve le droit de faire évoluer les fonctionnalités, d'en ajouter ou d'en retirer, sans que cela ouvre droit à indemnité pour l'Utilisateur, sous réserve de préavis raisonnable sauf maintenance d'urgence.`
      },
      {
        title: "5. Inscription, compte et accès",
        content: `La création d'un compte nécessite la fourniture d'informations exactes, complètes et à jour. L'Utilisateur s'engage à maintenir ces informations actualisées.

L'Utilisateur est seul responsable de la confidentialité de ses identifiants de connexion. Toute utilisation du compte par un tiers non autorisé doit être signalée immédiatement à ${IRALINK_EMAIL}.

Un compte est créé par entité juridique (société). Le partage de compte entre plusieurs entités distinctes est interdit.

Iralink se réserve le droit de refuser la création d'un compte ou de le suspendre sans préavis en cas de violation des présentes CGU ou de suspicion de fraude.`
      },
      {
        title: "6. Période d'essai",
        content: `DIPpro propose une période d'essai gratuite de cinq (5) jours calendaires à compter de la date d'inscription, sans engagement ni carte bancaire.

Durant cette période, l'Utilisateur bénéficie d'un accès complet à l'ensemble des fonctionnalités.

À l'issue de la période d'essai, l'accès est automatiquement suspendu. Pour continuer, l'Utilisateur doit prendre rendez-vous avec l'équipe Iralink via l'interface ou en contactant ${IRALINK_EMAIL}.

Les données créées durant l'essai sont conservées pendant 30 jours après expiration, sauf demande de suppression.`
      },
      {
        title: "7. Prix, conditions tarifaires et politique de non-remboursement",
        content: `Le tarif standard affiché sur le site (mise en place + abonnement mensuel) est confirmé par devis accepté lors de la prise de rendez-vous commerciale, qui peut également prévoir des conditions spécifiques pour un réseau ou un cabinet aux besoins particuliers.

Toute modification tarifaire fait l'objet d'une notification par email avec un préavis de 30 jours.

Les factures sont émises mensuellement ou annuellement selon la formule choisie. Le paiement s'effectue par prélèvement bancaire ou carte. Tout retard de paiement entraîne la suspension du service après mise en demeure restée sans effet sous 15 jours.

POLITIQUE DE NON-REMBOURSEMENT — L'Utilisateur reconnaît expressément, en acceptant les présentes CGU, que DIPpro est un service numérique à consommation immédiate, dans le cadre exclusif d'un contrat entre professionnels (B2B). Aucun remboursement ne sera accordé dans les cas suivants, sans que cette liste soit limitative :

• Toute période d'abonnement déjà entamée, même partiellement
• Insatisfaction concernant les analyses, scores ou recommandations générés par l'intelligence artificielle, celle-ci étant un outil d'aide à la décision fourni à titre indicatif (voir §3)
• Erreur, imprécision ou omission dans les résultats d'analyse IA
• Interruption ponctuelle de service d'une durée inférieure à 48 heures consécutives
• Changement de besoin, de stratégie commerciale ou de situation de l'Utilisateur
• Non-utilisation du service pendant la période facturée

En cas de contestation tarifaire, l'Utilisateur doit adresser une réclamation écrite à ${IRALINK_EMAIL} dans les 30 jours suivant la facturation contestée. Passé ce délai, la facture est réputée acceptée sans réserve.`
      },
      {
        title: "8. Obligations de l'Utilisateur",
        content: `L'Utilisateur s'engage à :

• Fournir des informations exactes lors de l'inscription et dans les documents créés
• Maintenir la confidentialité de ses identifiants
• Ne pas utiliser le service à des fins illicites, frauduleuses ou contraires à l'ordre public
• Ne pas tenter de contourner ou de compromettre les mesures de sécurité de la plateforme
• Ne pas reproduire, extraire, copier ou revendre tout ou partie du service
• Ne pas charger de contenus illicites, diffamatoires ou portant atteinte aux droits de tiers
• Vérifier les analyses IA auprès d'un professionnel du droit avant tout usage officiel
• Se conformer à la réglementation applicable, notamment la Loi Doubin

L'Utilisateur garantit être le représentant légal habilité de la société franchiseur pour laquelle il utilise DIPpro.`
      },
      {
        title: "9. Limitation de responsabilité d'Iralink",
        content: `Dans les limites autorisées par la loi applicable :

Iralink ne saurait être tenu responsable de :
• Toute erreur, omission ou imprécision dans les analyses IA
• Tout préjudice juridique, commercial ou financier résultant de l'utilisation du service
• Toute interruption ou indisponibilité du service, quelle qu'en soit la cause
• Toute perte de données résultant d'une suppression de compte ou d'un incident technique
• Tout acte d'un tiers ayant accédé frauduleusement au compte de l'Utilisateur
• Toute incompatibilité avec les équipements ou logiciels de l'Utilisateur
• Tout bug, anomalie logicielle, comportement inattendu ou résultat erroné inhérent à tout logiciel en exploitation
• Toute décision commerciale, juridique ou stratégique prise par l'Utilisateur sur la base des analyses produites par le service

INCIDENTS TECHNIQUES ISOLÉS — DIPpro est un logiciel SaaS (Software as a Service). Comme tout logiciel en exploitation, il peut présenter des anomalies techniques ponctuelles. La seule survenance d'un bug, d'une erreur d'affichage, d'une indisponibilité temporaire de moins de 48 heures consécutives ou d'un résultat d'analyse IA imprécis ne constitue pas, à elle seule, un manquement contractuel grave — sans préjudice du droit de l'Utilisateur de signaler l'incident, de saisir la Chambre de Commerce et d'Industrie, le Médiateur des entreprises ou tout autre organisme de médiation ou d'arbitrage compétent, ces voies de recours restant ouvertes en toutes circonstances.

PLAFOND ABSOLU DE RESPONSABILITÉ — En tout état de cause, la responsabilité totale d'Iralink, toutes causes confondues, est expressément limitée au montant des sommes effectivement perçues par Iralink au titre de l'abonnement de l'Utilisateur durant les 12 mois précédant l'événement générateur du dommage allégué.

Cette limitation de responsabilité s'applique quelle que soit la nature de la responsabilité invoquée (contractuelle, délictuelle, quasi-délictuelle) et quelle que soit l'instance ou la juridiction saisie.

DÉLAI DE RÉCLAMATION — Toute réclamation relative à un manquement d'Iralink doit être formulée par écrit à ${IRALINK_EMAIL} dans un délai de 30 jours calendaires à compter de la survenance du fait générateur. Passé ce délai, l'Utilisateur est réputé avoir renoncé à tout recours lié à cet événement.`
      },
      {
        title: "10. Force majeure",
        content: `Aucune des parties ne pourra être tenue responsable de l'inexécution de ses obligations en cas de survenance d'un événement de force majeure tel que défini à l'article 1218 du Code civil, incluant notamment : catastrophes naturelles, guerre, actes terroristes, pandémies, pannes d'infrastructure d'hébergement tiers, cyberattaques de grande envergure.

La partie touchée informera l'autre dans les meilleurs délais. Si l'événement se prolonge au-delà de 30 jours, chaque partie pourra résilier le contrat sans indemnité.`
      },
      {
        title: "11. Propriété intellectuelle",
        content: `La plateforme DIPpro, son code source, son design, ses algorithmes, sa base de données et ses fonctionnalités sont la propriété exclusive d'Iralink Agency, protégés par le droit d'auteur, le droit des bases de données et plus généralement par le droit de la propriété intellectuelle française et internationale.

Toute reproduction, représentation, modification, adaptation, traduction, extraction ou utilisation à des fins commerciales sans l'autorisation préalable et écrite d'Iralink est strictement interdite et constitue une contrefaçon.

Le contenu des DIP généré à partir des données saisies par l'Utilisateur appartient à l'Utilisateur. L'Utilisateur concède à Iralink une licence non exclusive et anonymisée aux fins d'amélioration du service, révocable à tout moment.`
      },
      {
        title: "12. Données personnelles",
        content: `Le traitement des données personnelles est décrit en détail dans la Politique de Confidentialité accessible à /privacy, qui fait partie intégrante des présentes CGU.

En acceptant les présentes CGU, l'Utilisateur reconnaît avoir pris connaissance de la Politique de Confidentialité.`
      },
      {
        title: "13. Résiliation",
        content: `L'Utilisateur peut résilier son abonnement à tout moment depuis les paramètres ou en contactant ${IRALINK_EMAIL}. La résiliation prend effet à la fin de la période de facturation en cours.

Iralink peut résilier ou suspendre l'accès sans préavis en cas de :
• Violation grave des présentes CGU
• Utilisation frauduleuse du service
• Non-paiement après mise en demeure
• Décision judiciaire

En cas de résiliation, les données sont conservées 30 jours avant suppression définitive. L'Utilisateur peut demander une exportation de ses données avant ce délai.`
      },
      {
        title: "14. Sous-traitants et partenaires tiers",
        content: `Pour fournir le service, Iralink fait appel aux prestataires suivants :

• Anthropic, Inc. (San Francisco, USA) — moteur d'intelligence artificielle (Claude). Les textes des DIP sont transmis à l'API Anthropic pour analyse. Les données ne sont pas conservées au-delà du traitement selon la politique d'Anthropic.
• Supabase, Inc. — base de données et authentification (hébergée AWS eu-west-1, Irlande)
• Vercel, Inc. (San Francisco, USA) — hébergement frontend et API serverless
• Vercel, Inc. — mesure d'audience (Vercel Analytics), sans cookie, données agrégées et anonymisées
• Resend, Inc. (San Francisco, USA) — envoi de tous les emails transactionnels (notifications aux franchisés, réinitialisation de mot de passe, invitations avocat/franchiseur, formulaire de contact), encadré par clauses contractuelles types (CCT)
• Cal.com, Inc. — prise de rendez-vous commerciaux

Ces sous-traitants traitent les données selon leurs propres politiques. Les transferts hors UE (Anthropic, Vercel) sont encadrés par des clauses contractuelles types (CCT) conformes au RGPD.`
      },
      {
        title: "15. Droit applicable, médiation préalable obligatoire et juridiction",
        content: `Les présentes CGU sont exclusivement régies par le droit français.

MÉDIATION PRÉALABLE OBLIGATOIRE — En cas de litige, désaccord ou réclamation de quelque nature que ce soit — y compris, sans limitation, tout différend relatif à la facturation, à la qualité des analyses IA, à un remboursement, à la résiliation, à un bug logiciel ou à tout manquement allégué d'Iralink — les parties s'engagent expressément et irrévocablement, PRÉALABLEMENT à toute action judiciaire ou à toute saisine d'un tiers (Chambre de Commerce et d'Industrie, Médiateur des entreprises, Médiateur de la consommation, organisme arbitral ou autre), à tenter de résoudre le différend à l'amiable de bonne foi dans un délai de trente (30) jours calendaires à compter de la notification écrite du litige adressée à ${IRALINK_EMAIL}.

Le non-respect de cette clause de médiation préalable est opposable à l'Utilisateur et constitue une fin de non-recevoir. Aucune action judiciaire ou procédure arbitrale engagée en violation de cette clause ne pourra prospérer.

JURIDICTION EXCLUSIVE — À défaut d'accord amiable à l'issue du délai de 30 jours susvisé, le litige sera soumis à la compétence exclusive des Tribunaux de Paris (France), toutes matières confondues.

Pour les Utilisateurs agissant à titre professionnel (B2B — personnes morales ou entrepreneurs), le recours à la médiation de la consommation (art. L.616-1 Code de la consommation) n'est pas applicable.`
      }
    ]
  },

  privacy: {
    title: 'Politique de Confidentialité & Protection des Données',
    lastUpdated: TODAY,
    sections: [
      {
        title: '1. Identité du responsable du traitement',
        content: `Iralink Agency (ci-après « Iralink »)
Adresse : France
Email du responsable : ${IRALINK_EMAIL}
Contact données personnelles / DPO : ${PRIVACY_EMAIL}

Iralink est responsable du traitement de vos données personnelles au sens du Règlement (UE) 2016/679 (RGPD) et de la Loi Informatique et Libertés modifiée (Loi n° 78-17 du 6 janvier 1978).`
      },
      {
        title: '2. Données collectées',
        content: `Nous collectons et traitons les catégories de données suivantes :

Données d'identification et de compte
• Nom de société, forme juridique, SIRET
• Adresse email, numéro de téléphone
• Mot de passe (stocké sous forme hachée — jamais en clair)
• Rôle et statut du compte

Données contractuelles et de consentement
• Date et heure d'acceptation des CGU
• Version des CGU acceptées
• Consentement ou refus aux communications marketing
• Confirmation de prise de connaissance du disclaimer IA

Données de contenu professionnel
• Documents DIP uploadés (texte extrait du PDF/DOCX)
• Données saisies dans les formulaires de génération
• Contenu des sections du DIP généré ou analysé

Données de gestion des franchisés
• Nom, email, téléphone des franchisés renseignés par l'Utilisateur

Données du formulaire de contact public
• Nom, email, société (optionnelle) et message soumis via /formulaire de contact
• Transmises à Resend, Inc. pour l'envoi de l'email vers l'équipe Iralink — non conservées en base de données par DIPpro

Données de demande de ressource (formulaire "Base des litiges DIP")
• Nom, prénom, email professionnel, téléphone, cabinet/structure (optionnelle) soumis via /ressources/litiges-dip
• Horodatage du consentement donné lors de la soumission
• Conservées en base de données par DIPpro en tant que prospect (lead), distinctement de tout compte client

Email saisi sans finalisation d'un formulaire d'inscription
• Si vous renseignez votre email dans le formulaire d'inscription (page d'accueil ou /waitlist) sans le soumettre jusqu'au bout, cet email seul peut être conservé pour vous permettre de reprendre votre inscription
• Un seul email de relance est envoyé, jamais renvoyé à la même adresse ensuite

Données de prospection B2B (avocats en droit de la franchise)
• Nom, email professionnel, cabinet — constituées par Iralink à partir de sources publiques ou professionnelles, sans démarche de votre part
• Utilisées pour un email de présentation de DIPpro, avec lien de désinscription immédiate et permanente dans chaque message

Données techniques et de navigation
• Adresse IP (logs de connexion, conservée 90 jours)
• Navigateur et système d'exploitation
• Horodatage des actions (journal d'audit)

Nous ne collectons aucune donnée sensible au sens de l'article 9 du RGPD (origine raciale, santé, opinions politiques, etc.).`
      },
      {
        title: '3. Finalités et bases légales du traitement',
        content: `Chaque traitement repose sur une base légale RGPD identifiée :

Exécution du contrat (art. 6.1.b RGPD)
• Création et gestion du compte
• Fourniture des analyses IA
• Génération et stockage des DIP
• Envoi d'emails transactionnels (confirmation, alertes, notifications)

Obligation légale (art. 6.1.c RGPD)
• Conservation des données de facturation (durée légale : 10 ans)
• Réponse aux réquisitions des autorités compétentes

Intérêt légitime (art. 6.1.f RGPD)
• Amélioration de la qualité du service (données anonymisées)
• Sécurisation de la plateforme (logs, détection de fraudes)
• Preuve de l'acceptation des CGU (protection juridique d'Iralink)
• Mesure d'audience du site (Vercel Analytics — pages consultées, sans cookie ni identifiant individuel, données agrégées)
• Réponse aux demandes soumises via le formulaire de contact public
• Envoi de la ressource demandée et prospection commerciale B2B relative à DIPpro auprès des avocats ayant sollicité une ressource via /ressources/litiges-dip — le numéro de téléphone collecté n'est utilisé que pour un contact manuel et personnalisé, jamais pour de la prospection téléphonique automatisée (SVI, appels robotisés)
• Envoi d'un unique email de relance si vous avez renseigné votre email dans le formulaire d'inscription sans le finaliser
• Prospection commerciale B2B par email auprès d'avocats en droit de la franchise (art. L.34-5 CPCE — régime d'opt-out applicable entre professionnels, sans consentement préalable requis dès lors que le message concerne l'activité professionnelle du destinataire) — désinscription immédiate et permanente, jamais recontacté après désinscription

Consentement (art. 6.1.a RGPD)
• Envoi de communications commerciales et newsletters
• Ce consentement peut être retiré à tout moment via les paramètres ou en écrivant à ${PRIVACY_EMAIL}`
      },
      {
        title: '4. Destinataires et sous-traitants',
        content: `Vos données ne sont jamais vendues à des tiers.

Elles peuvent être transmises aux sous-traitants suivants dans la stricte mesure nécessaire à la fourniture du service :

• Supabase, Inc. — stockage base de données (AWS eu-west-1 / Europe) — hébergement des données
• Anthropic, Inc. (USA) — analyse IA des textes DIP — encadrée par clauses contractuelles types (CCT)
• Vercel, Inc. (USA) — hébergement applicatif — encadré par CCT
• Vercel, Inc. (USA) — mesure d'audience (Vercel Analytics) — sans cookie, sans identifiant individuel, données agrégées uniquement — encadrée par CCT
• Resend, Inc. (USA) — envoi de tous les emails transactionnels et de prospection (notifications franchisés, réinitialisation de mot de passe, invitations, formulaire de contact, envoi des ressources demandées, prospection B2B avocats) — encadrée par CCT
• Cal.com, Inc. (USA) — prise de rendez-vous — encadrée par CCT

Tous les transferts hors Union européenne sont encadrés par des clauses contractuelles types (CCT) adoptées par la Commission européenne (décision 2021/914), garantissant un niveau de protection adéquat.

Iralink peut être amené à communiquer vos données aux autorités compétentes (police, justice, CNIL) en réponse à une injonction légale.`
      },
      {
        title: '5. Durée de conservation',
        content: `Données de compte et de profil : durée de l'abonnement actif + 12 mois après résiliation (pour les demandes de réactivation et obligations légales)

Documents DIP et contenus : durée de l'abonnement actif + 30 jours après résiliation (puis suppression définitive)

Données de consentement (acceptation CGU) : 5 ans à compter de la date d'acceptation (preuve de consentement)

Logs techniques et d'audit : 90 jours glissants

Données de facturation : 10 ans à compter de la date de facturation (obligation comptable, art. L.123-22 Code de commerce)

Données de franchise (franchisés renseignés) : durée de l'abonnement actif + 30 jours

Données de demande de ressource (leads "Base des litiges DIP") : 3 ans à compter du dernier contact (durée standard recommandée par la CNIL pour la prospection commerciale)

Email saisi sans finalisation du formulaire d'inscription : 30 jours, sauf finalisation de l'inscription entre-temps

Données de prospection B2B (avocats) : 3 ans à compter du dernier contact, suppression immédiate et définitive en cas de désinscription

Communications marketing : jusqu'au retrait du consentement`
      },
      {
        title: '6. Vos droits',
        content: `Conformément au RGPD (articles 15 à 22) et à la loi Informatique et Libertés, vous disposez des droits suivants :

• Droit d'accès (art. 15) : obtenir une copie de vos données personnelles
• Droit de rectification (art. 16) : corriger des données inexactes
• Droit à l'effacement / « droit à l'oubli » (art. 17) : supprimer vos données sous réserve des obligations légales de conservation
• Droit à la limitation du traitement (art. 18) : suspendre temporairement un traitement
• Droit à la portabilité (art. 20) : recevoir vos données dans un format structuré et lisible
• Droit d'opposition (art. 21) : vous opposer à un traitement fondé sur l'intérêt légitime
• Droit de retrait du consentement (art. 7.3) : applicable aux traitements basés sur votre consentement (marketing)

Pour exercer ces droits, contactez : ${PRIVACY_EMAIL}
Délai de réponse : 30 jours maximum (art. 12 RGPD).

Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : www.cnil.fr — 3 place de Fontenoy, 75007 Paris.`
      },
      {
        title: '7. Sécurité des données',
        content: `Iralink met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, divulgation, altération ou destruction :

• Chiffrement des communications (TLS 1.3)
• Authentification par token JWT sécurisé (Supabase Auth)
• Hachage des mots de passe (bcrypt)
• Contrôle d'accès par Row Level Security (RLS) sur la base de données
• Limitation du débit d'appels API (rate limiting)
• Journal d'audit des actions sensibles
• Secrets d'API stockés dans des variables d'environnement chiffrées (Vercel)

En cas de violation de données présentant un risque pour vos droits et libertés, Iralink s'engage à notifier la CNIL dans les 72 heures (art. 33 RGPD) et les personnes concernées sans délai injustifié si le risque est élevé (art. 34 RGPD).`
      },
      {
        title: '8. Cookies et traceurs',
        content: `Pour les détails complets sur les cookies utilisés, consultez notre Politique de Cookies accessible à /cookies.

En résumé : DIPpro n'utilise que des cookies strictement nécessaires au fonctionnement du service. Aucun cookie publicitaire ou de profilage n'est utilisé. Aucun bandeau de consentement aux cookies n'est requis pour ces cookies essentiels.`
      },
      {
        title: '9. Mineurs',
        content: `La plateforme DIPpro est destinée exclusivement aux professionnels (B2B). Elle n'est pas accessible aux mineurs de moins de 18 ans. En créant un compte, vous déclarez avoir au moins 18 ans et agir en qualité de représentant habilité d'une personne morale.`
      }
    ]
  },

  'mentions-legales': {
    title: 'Mentions Légales',
    lastUpdated: TODAY,
    sections: [
      {
        title: '⚠️ Entreprise en cours de création — Informations légales provisoires',
        content: `AVIS IMPORTANT — À LIRE AVANT TOUTE UTILISATION

Iralink Agency est actuellement en cours d'immatriculation au Registre du Commerce et des Sociétés (RCS). À la date de publication de ces mentions légales, la société n'est PAS encore formellement constituée en tant que personne morale.

Raison sociale : Iralink Agency
Statut actuel : En cours d'immatriculation — non encore immatriculée au RCS
Forme juridique envisagée : [À compléter avant immatriculation — décision en cours]
Numéro SIREN / SIRET : Non encore attribué par l'INSEE
Capital social : [À définir lors de l'immatriculation]
Adresse du siège social : [À compléter], France
Fondateur et responsable : Théo [Nom de famille à compléter]
Email de contact : ${IRALINK_EMAIL}
Directeur de la publication : Théo [Nom de famille à compléter]

ENGAGEMENT FORMEL : Les présentes mentions légales seront intégralement et définitivement complétées dès l'immatriculation officielle d'Iralink Agency auprès du RCS, et en tout état de cause AVANT toute ouverture commerciale payante de la plateforme DIPpro.

PHASE ACTUELLE : DIPpro est en phase de démonstration (bêta fermée). Aucune transaction commerciale n'est réalisée, aucune facturation n'est émise tant que la société n'est pas régulièrement immatriculée et que les présentes mentions ne sont pas complétées.

DIPpro est une marque en cours de dépôt auprès de l'INPI (Institut National de la Propriété Industrielle).`
      },
      {
        title: 'Hébergement',
        content: `Application web et API serverless
Vercel, Inc.
340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
Site : vercel.com

Base de données et authentification
Supabase, Inc.
970 Toa Payoh North, Singapour
Données hébergées sur infrastructure AWS eu-west-1 (Europe — Irlande)
Site : supabase.com

Intelligence artificielle
Anthropic, PBC
548 Market St, PMB 90375, San Francisco, CA 94104, États-Unis
Site : anthropic.com`
      },
      {
        title: 'Propriété intellectuelle',
        content: `L'ensemble du contenu du site DIPpro — textes, graphismes, logos, icônes, images, logiciels et code source — est la propriété exclusive d'Iralink Agency ou de ses ayants droit, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle (Code de la propriété intellectuelle, L. 111-1 et suivants).

Toute reproduction totale ou partielle, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est strictement interdite sans l'autorisation préalable et écrite d'Iralink Agency.

Toute exploitation non autorisée du site ou de son contenu sera considérée comme constitutive d'une contrefaçon et poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de la propriété intellectuelle.`
      },
      {
        title: 'Limitation de responsabilité',
        content: `Les analyses produites par l'intelligence artificielle DIPpro sont des outils d'aide à la décision fournis à titre indicatif. Elles ne constituent pas un conseil juridique au sens de la loi n° 71-1130 du 31 décembre 1971 et ne sauraient engager la responsabilité d'Iralink Agency.

L'Utilisateur est seul responsable de la conformité légale de son Document d'Information Précontractuelle et de son utilisation dans le cadre de la Loi Doubin.

Iralink s'efforce de maintenir le site accessible en permanence mais ne garantit pas l'absence d'interruptions liées à des opérations de maintenance ou à des incidents techniques.`
      },
      {
        title: 'Données personnelles et RGPD',
        content: `La plateforme collecte et traite des données personnelles conformément au Règlement Général sur la Protection des Données (RGPD — Règlement (UE) 2016/679) et à la loi Informatique et Libertés.

Contact données personnelles : ${PRIVACY_EMAIL}

Pour plus d'informations, consultez notre Politique de Confidentialité accessible à /privacy.

Toute réclamation peut être adressée à la CNIL (www.cnil.fr).`
      },
      {
        title: 'Droit applicable',
        content: `Les présentes mentions légales sont soumises au droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes, les tribunaux de Paris (France) seront seuls compétents.`
      },
      {
        title: 'Crédits',
        content: `Design et développement : Iralink Agency (${IRALINK_EMAIL})
Icônes : Lucide React (licence ISC)
Polices : DM Sans, DM Mono, Fraunces (Google Fonts, licence Open Font License)`
      }
    ]
  },

  cookies: {
    title: 'Politique de Cookies',
    lastUpdated: TODAY,
    sections: [
      {
        title: '1. Qu\'est-ce qu\'un cookie ?',
        content: `Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur un site web. Il permet au site de mémoriser des informations vous concernant pour améliorer votre expérience et assurer le bon fonctionnement de certaines fonctionnalités.

La réglementation applicable est la directive ePrivacy (2002/58/CE modifiée), transposée en droit français à l'article 82 de la loi Informatique et Libertés, ainsi que les lignes directrices de la CNIL.`
      },
      {
        title: '2. Cookies utilisés par DIPpro',
        content: `DIPpro utilise UNIQUEMENT des cookies strictement nécessaires au fonctionnement du service. Ces cookies ne requièrent pas votre consentement préalable (article 82 de la loi Informatique et Libertés — exemption pour cookies essentiels).

Cookie d'authentification (Supabase Auth)
• Nom : sb-[project-id]-auth-token
• Finalité : maintenir votre session de connexion active entre les pages
• Durée : session (supprimé à la fermeture du navigateur) ou jusqu'à déconnexion
• Émetteur : Supabase (infrastructure en Europe)
• Obligatoire : OUI — sans ce cookie, la connexion est impossible

Préférence de thème (localStorage)
• Nom : dippro-theme
• Finalité : mémoriser votre préférence d'affichage (clair/sombre)
• Durée : persistant (localStorage, pas un cookie HTTP)
• Émetteur : DIPpro (stockage local uniquement, jamais transmis)
• Obligatoire : NON — fonctionnalité de confort uniquement

Mesure d'audience (Vercel Analytics)
• Finalité : statistiques de fréquentation agrégées (pages vues)
• Fonctionnement : ne dépose aucun cookie, ne crée aucun identifiant individuel, données agrégées et anonymisées
• Émetteur : Vercel, Inc.
• Consentement : non requis — cet outil ne procède à aucun suivi individuel ni traçage entre sites, conformément aux critères d'exemption de la CNIL pour les outils de mesure d'audience respectueux de la vie privée`
      },
      {
        title: '3. Cookies que nous N\'utilisons PAS',
        content: `DIPpro ne dépose aucun cookie des catégories suivantes :

• Cookies publicitaires ou de ciblage comportemental
• Cookies de réseaux sociaux (Facebook Pixel, LinkedIn Insight Tag, etc.)
• Cookies de mesure d'audience (Google Analytics, Matomo, etc.)
• Cookies de partage de contenu tiers
• Cookies de profilage ou de suivi inter-sites

Cette absence de cookies de tracking est un choix délibéré pour protéger la vie privée de nos utilisateurs professionnels et celle de leurs données confidentielles (DIP).`
      },
      {
        title: '4. Stockage local (localStorage)',
        content: `DIPpro utilise le localStorage du navigateur (mécanisme distinct des cookies HTTP) pour stocker :

• Votre token d'accès JWT (accès_token) — nécessaire au maintien de la session
• Votre préférence de thème d'affichage (dippro-theme)

Ces données sont stockées localement sur votre terminal uniquement. Elles ne sont jamais transmises à des tiers et ne permettent pas de tracking entre sites.`
      },
      {
        title: '5. Gestion et suppression des cookies',
        content: `Pour les cookies strictement nécessaires, leur suppression entraîne la déconnexion automatique de la plateforme. Si vous souhaitez les supprimer :

Chrome : Paramètres → Confidentialité et sécurité → Cookies et autres données des sites
Firefox : Paramètres → Vie privée et sécurité → Cookies et données de sites
Safari : Préférences → Confidentialité → Gérer les données du site web
Edge : Paramètres → Confidentialité, recherche et services → Cookies

Vous pouvez également utiliser le mode navigation privée / incognito pour éviter tout stockage persistant.

Pour les données en localStorage, vous pouvez les supprimer via les outils développeur du navigateur (F12 → Application → Local Storage).`
      },
      {
        title: '6. Évolution de la politique de cookies',
        content: `Toute modification de la présente politique sera publiée sur cette page avec mise à jour de la date. En cas de dépôt de nouveaux cookies nécessitant votre consentement, un bandeau d'information sera affiché.

Contact pour toute question : ${PRIVACY_EMAIL}`
      }
    ]
  }
};

export default function LegalPage() {
  usePageBackground(LEGAL_BG);
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, '');
  const content = LEGAL_CONTENT[slug];

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: LEGAL_BG }}>
        <div className="text-center">
          <p className="font-cormorant text-2xl mb-4" style={{ color: '#1A1826' }}>Page introuvable</p>
          <Link to="/" className="font-dm-sans text-sm" style={{ color: '#9C4141' }}>← Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const isCgu = slug === 'cgu';
  const isMentionsLegales = slug === 'mentions-legales';

  const SEO_META = {
    cgu: { title: "Conditions Générales d'Utilisation", description: "CGU de DIPpro — plateforme SaaS de gestion du Document d'Information Précontractuelle franchise. Conditions d'utilisation, politique de non-remboursement, médiation obligatoire.", canonical: '/cgu' },
    privacy: { title: 'Politique de confidentialité', description: "Politique de confidentialité DIPpro. Protection des données RGPD, hébergement Europe, droits des utilisateurs.", canonical: '/privacy' },
    'mentions-legales': { title: 'Mentions légales', description: "Mentions légales de DIPpro par Iralink Agency. Éditeur, hébergeur, responsable de publication.", canonical: '/mentions-legales' },
    cookies: { title: 'Politique de cookies', description: "Politique de cookies de DIPpro. Cookies techniques, préférences, durée de conservation.", canonical: '/cookies' },
  };
  const seo = SEO_META[slug] || {};

  return (
    <>
      <SEOHead title={seo.title} description={seo.description} canonical={seo.canonical} noindex={true} />
    <div className="min-h-screen" style={{ background: LEGAL_BG }}>
      <header style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(156,65,65,0.18)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/" className="flex items-center gap-3 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(156,65,65,0.12)', border: '1px solid rgba(156,65,65,0.3)' }}>
                <Shield className="w-3.5 h-3.5" style={{ color: '#9C4141' }} />
              </div>
              <span className="font-cormorant text-lg" style={{ color: '#1A1826' }}>DIPpro</span>
            </Link>
            <span className="hidden sm:inline" style={{ color: '#94A3B8' }}>/</span>
            <span className="hidden sm:inline font-dm-sans text-sm truncate" style={{ color: '#64748B' }}>{content.title}</span>
          </div>
          <Link to="/register" className="font-dm-sans text-xs px-4 py-2 rounded-lg transition-all flex-shrink-0" style={{ background: 'rgba(156,65,65,0.12)', color: '#9C4141', border: '1px solid rgba(156,65,65,0.3)' }}>
            Essai gratuit →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 font-dm-sans text-sm mb-8 transition-colors" style={{ color: '#94A3B8' }}>
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        {isCgu && (
          <div className="mb-8 rounded-xl p-5 flex items-start gap-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div>
              <p className="font-dm-sans text-sm font-semibold mb-1" style={{ color: '#1A1826' }}>Avertissement important — Analyses par IA</p>
              <p className="font-dm-sans text-sm leading-relaxed" style={{ color: '#475569' }}>
                Les analyses DIPpro sont des outils d'aide à la décision. Elles <strong>ne constituent pas un conseil juridique</strong>. Tout DIP doit être validé par un avocat spécialisé avant remise officielle.
              </p>
            </div>
          </div>
        )}

        {isMentionsLegales && (
          <div className="mb-8 rounded-xl p-5 flex items-start gap-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <div>
              <p className="font-dm-sans text-sm font-semibold mb-2" style={{ color: '#1A1826' }}>
                Iralink Agency — Société non encore immatriculée
              </p>
              <p className="font-dm-sans text-sm leading-relaxed" style={{ color: '#475569' }}>
                <strong>Iralink Agency n'est pas encore formellement constituée</strong> à ce jour. La société est en cours d'immatriculation au Registre du Commerce et des Sociétés (RCS). Le SIRET, la forme juridique définitive, l'adresse du siège et l'identité complète du dirigeant seront renseignés dès l'immatriculation officielle.
              </p>
              <p className="font-dm-sans text-xs mt-2" style={{ color: '#78716C' }}>
                DIPpro est en phase bêta fermée (démonstration uniquement). Aucune transaction commerciale n'est réalisée tant que la société n'est pas immatriculée et que ces mentions légales ne sont pas complétées.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-8 lg:p-12" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}>
          <h1 className="font-cormorant text-4xl mb-2" style={{ color: '#1A1826' }}>{content.title}</h1>
          <p className="font-dm-mono text-xs mb-10" style={{ color: '#94A3B8' }}>Dernière mise à jour : {content.lastUpdated}</p>

          <div className="space-y-10">
            {content.sections.map((section) => (
              <div key={section.title}>
                <h2 className="font-dm-sans text-base font-semibold mb-3" style={{ color: '#1A1826' }}>{section.title}</h2>
                <div className="font-dm-sans text-sm leading-relaxed whitespace-pre-line" style={{ color: '#475569' }}>
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t" style={{ borderColor: 'rgba(156,65,65,0.15)' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="font-dm-sans text-xs" style={{ color: '#94A3B8' }}>© {new Date().getFullYear()} Iralink Agency — Tous droits réservés</p>
              <div className="flex gap-4 flex-wrap">
                <Link to="/cgu" className="font-dm-sans text-xs hover:underline" style={{ color: '#94A3B8' }}>CGU</Link>
                <Link to="/privacy" className="font-dm-sans text-xs hover:underline" style={{ color: '#94A3B8' }}>Confidentialité</Link>
                <Link to="/cookies" className="font-dm-sans text-xs hover:underline" style={{ color: '#94A3B8' }}>Cookies</Link>
                <Link to="/mentions-legales" className="font-dm-sans text-xs hover:underline" style={{ color: '#94A3B8' }}>Mentions légales</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
