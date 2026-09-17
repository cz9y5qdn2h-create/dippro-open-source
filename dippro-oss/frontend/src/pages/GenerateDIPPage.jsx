import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import LiquidGlassBtn from '../components/ui/LiquidGlassBtn';
import toast from 'react-hot-toast';
import {
  ChevronRight, ChevronLeft, Sparkles, Save, Download,
  CheckCircle, AlertTriangle, Building2, Users, Landmark,
  TrendingUp, FileSignature, MapPin, Scale, Calendar, Info,
  Wand2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

const STEPS = [
  { id: 'identite', title: 'Identité', icon: Building2, desc: 'Informations légales du franchiseur' },
  { id: 'historique', title: 'Historique', icon: Calendar, desc: 'Parcours et enseigne' },
  { id: 'reseau', title: 'Réseau', icon: Users, desc: 'État du réseau de franchisés' },
  { id: 'finances', title: 'Finances', icon: TrendingUp, desc: 'Comptes et investissements' },
  { id: 'marque', title: 'Marque & PI', icon: Landmark, desc: 'Propriété intellectuelle' },
  { id: 'contrat', title: 'Contrat', icon: FileSignature, desc: 'Conditions contractuelles' },
  { id: 'territoire', title: 'Territoire', icon: MapPin, desc: 'Zone exclusive' },
  { id: 'litiges', title: 'Litiges', icon: Scale, desc: 'Contentieux passés et en cours' },
];

const INITIAL_FORM = {
  raison_sociale: '', forme_juridique: 'SAS', capital_social: '', rcs_ville: '', rcs_numero: '',
  siege_social: '', dirigeant_nom: '', dirigeant_fonction: 'Président', domiciliation_bancaire: '',
  date_creation: '', date_enseigne: '', historique_dirigeant: '', historique_enseigne: '',
  etat_marche: '',
  nb_franchises: '', nb_succursales: '', nb_ouvertures_12m: '', nb_fermetures_12m: '',
  details_fermetures: '', concurrent_zone_autorise: 'non', resultats_sites_pilotes: '',
  ca_n1: '', resultat_n1: '', ca_n2: '', resultat_n2: '',
  marque_nom: '', marque_inpi_numero: '', marque_depot_date: '', marque_validite: '',
  marque_territoire: 'France', marque_cession_ou_licence: 'Cédée', marque_licence_duree: '',
  droit_entree: '', redevance_exploitation: '', redevance_pub: '', apport_personnel: '',
  investissement_total: '', conditions_paiement: '',
  territoire_description: '', territoire_exclusif: 'oui', criteres_zone: '',
  duree_contrat: '', renouvellement: '', conditions_resiliation: '', conditions_cession: '',
  clause_non_concurrence: '',
  litiges_en_cours: 'non', description_litiges: '', litiges_termines: '',
  previsionnel_description: '',
};

const FORM_FIELDS = {
  identite: [
    { key: 'raison_sociale', label: 'Raison sociale', required: true, placeholder: 'Ma Franchise SAS' },
    { key: 'forme_juridique', label: 'Forme juridique', type: 'select', options: ['SAS', 'SARL', 'SA', 'SNC', 'EURL', 'SCI', 'Autre'] },
    { key: 'capital_social', label: 'Capital social (€)', placeholder: '100 000', type: 'number' },
    { key: 'rcs_numero', label: 'Numéro RCS / SIRET', placeholder: '123 456 789 RCS Paris' },
    { key: 'rcs_ville', label: 'Ville RCS', placeholder: 'Paris' },
    { key: 'siege_social', label: 'Siège social', placeholder: '123 rue de la Paix, 75001 Paris' },
    { key: 'dirigeant_nom', label: 'Nom du dirigeant', required: true, placeholder: 'Jean Dupont' },
    { key: 'dirigeant_fonction', label: 'Fonction du dirigeant', type: 'select', options: ['Président', 'PDG', 'Gérant', 'Directeur Général'] },
    { key: 'domiciliation_bancaire', label: 'Domiciliation bancaire (obligatoire — R.330-1, 3°)', placeholder: 'Société Générale, agence de Paris Opéra' },
  ],
  historique: [
    { key: 'date_creation', label: 'Date de création de la société', type: 'date' },
    { key: 'date_enseigne', label: "Date de création de l'enseigne / réseau", type: 'date' },
    { key: 'historique_dirigeant', label: 'Parcours du dirigeant (5 dernières années)', type: 'textarea', placeholder: '2020-2025 : PDG de Ma Franchise SAS...' },
    { key: 'historique_enseigne', label: "Historique de l'enseigne", type: 'textarea', placeholder: "Fondée en 2018, l'enseigne compte aujourd'hui X points de vente..." },
    { key: 'etat_marche', label: 'État du marché national ET local, perspectives (obligatoire — R.330-1, 4°)', type: 'textarea', placeholder: "Marché national en croissance de X%/an ; sur la zone de chalandise visée, présence de X concurrents directs, densité de population de X habitants..." },
  ],
  reseau: [
    { key: 'nb_franchises', label: 'Nombre de franchisés actuels', type: 'number', placeholder: '42' },
    { key: 'nb_succursales', label: 'Nombre de succursales', type: 'number', placeholder: '5' },
    { key: 'nb_ouvertures_12m', label: 'Ouvertures sur 12 derniers mois', type: 'number', placeholder: '8' },
    { key: 'nb_fermetures_12m', label: 'Fermetures sur 12 derniers mois', type: 'number', placeholder: '2' },
    { key: 'details_fermetures', label: 'Détail des fermetures / résiliations', type: 'textarea', placeholder: '1 résiliation amiable, 1 non-renouvellement...' },
    { key: 'concurrent_zone_autorise', label: 'Établissement concurrent déjà autorisé par vous dans la zone visée ?', type: 'select', options: ['non', 'oui'] },
    { key: 'resultats_sites_pilotes', label: 'Résultats des sites pilotes / franchisés comparables (rentabilité réelle)', type: 'textarea', placeholder: "Les 3 sites pilotes affichent un CA moyen de X€ en année 1, rentabilité atteinte à Y mois..." },
  ],
  finances: [
    { key: 'ca_n1', label: "Chiffre d'affaires N-1 (€)", type: 'number', placeholder: '2 500 000' },
    { key: 'resultat_n1', label: 'Résultat net N-1 (€)', type: 'number', placeholder: '320 000' },
    { key: 'ca_n2', label: "Chiffre d'affaires N-2 (€)", type: 'number', placeholder: '2 100 000' },
    { key: 'resultat_n2', label: 'Résultat net N-2 (€)', type: 'number', placeholder: '280 000' },
  ],
  marque: [
    { key: 'marque_nom', label: 'Nom de la marque', placeholder: 'Ma Franchise®' },
    { key: 'marque_inpi_numero', label: 'Numéro de dépôt INPI', placeholder: '4 012 345' },
    { key: 'marque_depot_date', label: 'Date de dépôt INPI', type: 'date' },
    { key: 'marque_validite', label: 'Date de validité', type: 'date' },
    { key: 'marque_territoire', label: 'Territoire de protection', type: 'select', options: ['France', 'Union Européenne', 'International (OMPI)', 'France + UE'] },
    { key: 'marque_cession_ou_licence', label: 'La marque vous a-t-elle été cédée ou concédée par licence ?', type: 'select', options: ['Cédée', 'Concédée par licence'] },
    { key: 'marque_licence_duree', label: 'Si licence : durée consentie', placeholder: '10 ans renouvelables' },
  ],
  contrat: [
    { key: 'droit_entree', label: "Droit d'entrée HT (€)", type: 'number', placeholder: '20 000' },
    { key: 'redevance_exploitation', label: "Redevance d'exploitation (%CA)", placeholder: '5%' },
    { key: 'redevance_pub', label: 'Redevance publicitaire (%CA)', placeholder: '2%' },
    { key: 'apport_personnel', label: 'Apport personnel minimum (€)', type: 'number', placeholder: '50 000' },
    { key: 'investissement_total', label: 'Investissement total estimé (€)', type: 'number', placeholder: '150 000' },
    { key: 'conditions_paiement', label: 'Conditions de paiement', type: 'textarea', placeholder: "Droit d'entrée à la signature, redevances mensuelles au 5 du mois..." },
    { key: 'duree_contrat', label: 'Durée du contrat', placeholder: '5 ans renouvelables' },
    { key: 'renouvellement', label: 'Conditions de renouvellement', type: 'textarea', placeholder: 'Renouvellement automatique sauf dénonciation 6 mois avant échéance...' },
    { key: 'conditions_resiliation', label: 'Conditions de résiliation', type: 'textarea', placeholder: 'Résiliation possible en cas de manquement grave non corrigé sous 30 jours...' },
    { key: 'conditions_cession', label: 'Conditions de cession', type: 'textarea', placeholder: 'Cession soumise à agrément préalable du franchiseur...' },
    { key: 'clause_non_concurrence', label: 'Clause de non-concurrence post-contractuelle (le cas échéant)', type: 'textarea', placeholder: "Interdiction d'exercer une activité similaire dans un rayon de X km pendant 1 an après la fin du contrat..." },
  ],
  territoire: [
    { key: 'territoire_exclusif', label: 'Zone exclusive accordée', type: 'select', options: ['oui', 'non', 'partielle'] },
    { key: 'territoire_description', label: 'Description de la zone', type: 'textarea', placeholder: 'Zone définie par un rayon de 5 km autour du point de vente...' },
    { key: 'criteres_zone', label: 'Critères de délimitation', type: 'textarea', placeholder: 'Basé sur une population de X habitants, délimitation par les voies...' },
  ],
  litiges: [
    { key: 'litiges_en_cours', label: 'Y a-t-il des litiges en cours ?', type: 'select', options: ['non', 'oui'] },
    { key: 'description_litiges', label: 'Description des litiges en cours', type: 'textarea', placeholder: "Si oui, décrivez brièvement la nature et l'état d'avancement..." },
    { key: 'litiges_termines', label: 'Litiges terminés dans les 5 dernières années', type: 'textarea', placeholder: "Précisez le nombre, la nature et l'issue de chaque litige..." },
    { key: 'previsionnel_description', label: 'Comptes prévisionnels — hypothèses et projections', type: 'textarea', placeholder: "Basé sur un CA prévisionnel de X€ la 1ère année, X€ la 2ème..." },
  ],
};

const CHIP_OPTIONS = {
  forme_juridique: ['SAS', 'SARL', 'SA', 'SNC', 'EURL', 'SCI', 'Autre'],
  dirigeant_fonction: ['Président', 'PDG', 'Gérant', 'Directeur Général'],
  marque_territoire: ['France', 'Union Européenne', 'International (OMPI)', 'France + UE'],
  marque_cession_ou_licence: ['Cédée', 'Concédée par licence'],
  territoire_exclusif: ['oui', 'non', 'partielle'],
  concurrent_zone_autorise: ['non', 'oui'],
  litiges_en_cours: ['non', 'oui'],
};

const NUMBER_SUGGESTIONS = {
  capital_social: ['10 000', '50 000', '100 000', '200 000', '500 000'],
  droit_entree: ['5 000', '10 000', '20 000', '30 000', '50 000'],
  apport_personnel: ['20 000', '30 000', '50 000', '100 000', '150 000'],
  investissement_total: ['50 000', '100 000', '150 000', '200 000', '300 000'],
  ca_n1: ['500 000', '1 000 000', '2 000 000', '5 000 000', '10 000 000'],
  ca_n2: ['500 000', '1 000 000', '2 000 000', '5 000 000', '10 000 000'],
  resultat_n1: ['50 000', '100 000', '200 000', '500 000'],
  resultat_n2: ['50 000', '100 000', '200 000', '500 000'],
  nb_franchises: ['5', '10', '20', '50', '100'],
  nb_succursales: ['0', '1', '5', '10', '20'],
  nb_ouvertures_12m: ['1', '3', '5', '10', '20'],
  nb_fermetures_12m: ['0', '1', '2', '5'],
};

const MONETARY_KEYS = new Set([
  'capital_social', 'droit_entree', 'apport_personnel', 'investissement_total',
  'ca_n1', 'ca_n2', 'resultat_n1', 'resultat_n2',
]);

const GUIDED_CONFIG = {
  historique_dirigeant: { questions: [
    { q: 'Quel est votre poste actuel et depuis quand ?', ph: 'Ex : Président de Ma Franchise SAS depuis janvier 2020...' },
    { q: 'Quels postes occupiez-vous les 5 années précédentes ?', ph: 'Ex : Directeur commercial chez X (2018-2020), fondateur de Y (2015-2018)...' },
    { q: 'Avez-vous une expérience dans la franchise ou ce secteur ?', ph: 'Ex : 10 ans dans la restauration rapide, certification FFE...' },
  ]},
  historique_enseigne: { questions: [
    { q: "Quand et comment l'enseigne a-t-elle été fondée ?", ph: 'Ex : Fondée en 2018 à Paris, après 2 ans de pilote avec 3 succursales...' },
    { q: 'Quelles sont les grandes étapes de développement du réseau ?', ph: 'Ex : 2019 : 1er franchisé, 2021 : 10 points de vente, 2023 : Belgique...' },
    { q: "Quelle est la proposition de valeur unique de l'enseigne ?", ph: 'Ex : Format kiosque innovant, concept végétarien premium...' },
  ]},
  etat_marche: { questions: [
    { q: 'Quel est l\'état général du marché national de votre secteur (tendances, croissance) ?', ph: 'Ex : Marché national en croissance de 4 %/an, forte demande post-covid...' },
    { q: 'Quelle est la situation spécifique sur la zone de chalandise locale visée (concurrence, saturation, particularités) ?', ph: 'Ex : Zone de 60 000 habitants, 2 concurrents directs déjà implantés, forte fréquentation piétonne...' },
    { q: 'Quelles sont les perspectives de développement de ce marché ?', ph: 'Ex : Croissance attendue de 6 %/an sur 3 ans, arrivée de nouveaux entrants limitée par le foncier disponible...' },
  ]},
  resultats_sites_pilotes: { questions: [
    { q: 'Combien de sites pilotes ou unités comparables existent et depuis quand ?', ph: 'Ex : 3 sites pilotes ouverts depuis 2021 à Lyon, Lille et Nantes...' },
    { q: 'Quels sont leurs résultats réels (CA, rentabilité, délai avant seuil de rentabilité) ?', ph: 'Ex : CA moyen de 450 000 €/an, seuil de rentabilité atteint entre 14 et 20 mois selon les sites...' },
    { q: 'Y a-t-il eu des difficultés ou résultats décevants sur certains sites ? Si oui, lesquels ?', ph: "Ex : 1 site sur 3 encore en dessous du seuil de rentabilité après 24 mois, en raison d'un emplacement moins favorable..." },
  ]},
  clause_non_concurrence: { questions: [
    { q: "L'ancien franchisé est-il soumis à une clause de non-concurrence après la fin du contrat ?", ph: 'Ex : Oui, interdiction d\'exercer une activité similaire...' },
    { q: 'Quelle est la portée géographique et la durée de cette clause ?', ph: 'Ex : Rayon de 5 km autour de l\'ancien point de vente, pendant 1 an après la cessation du contrat...' },
  ]},
  details_fermetures: { questions: [
    { q: 'Combien de fermetures ont eu lieu et sur quelle période ?', ph: 'Ex : 2 fermetures entre 2023 et 2024...' },
    { q: 'Quelles étaient les raisons principales de chaque fermeture ?', ph: "Ex : 1 pour cause de santé du franchisé, 1 résiliation amiable..." },
    { q: 'Ces fermetures ont-elles donné lieu à des litiges ?', ph: "Ex : Aucun litige, toutes réglées à l'amiable..." },
  ]},
  conditions_paiement: { questions: [
    { q: "Comment le droit d'entrée est-il payé (signature, plusieurs fois) ?", ph: "Ex : 50 % à la signature, 50 % à l'ouverture..." },
    { q: 'À quelle date les redevances mensuelles sont-elles exigibles ?', ph: 'Ex : Redevances dues au 5 de chaque mois...' },
    { q: 'Y a-t-il des pénalités de retard ou conditions particulières ?', ph: 'Ex : Intérêts de retard au taux légal majoré de 3 points...' },
  ]},
  renouvellement: { questions: [
    { q: 'Le contrat se renouvelle-t-il automatiquement ou avec accord exprès ?', ph: "Ex : Renouvellement tacite sauf dénonciation 6 mois avant l'échéance..." },
    { q: 'Quelles conditions le franchisé doit-il remplir pour renouveler ?', ph: 'Ex : Absence de défaillance grave, formation continue effectuée...' },
    { q: 'La durée du renouvellement est-elle identique au contrat initial ?', ph: 'Ex : Renouvellement par période successive de 5 ans...' },
  ]},
  conditions_resiliation: { questions: [
    { q: "Quelles sont les causes de résiliation à l'initiative du franchiseur ?", ph: 'Ex : Non-paiement des redevances, non-respect des standards...' },
    { q: 'Quel délai de mise en demeure est accordé avant résiliation ?', ph: 'Ex : 30 jours pour remédier au manquement après mise en demeure...' },
    { q: 'Y a-t-il des cas de résiliation immédiate sans préavis ?', ph: 'Ex : Faute grave, liquidation judiciaire, condamnation pénale...' },
  ]},
  conditions_cession: { questions: [
    { q: 'La cession du contrat par le franchisé est-elle possible ?', ph: "Ex : Oui, sous réserve d'agrément préalable écrit du franchiseur..." },
    { q: "Quelles sont les conditions d'agrément du cessionnaire ?", ph: 'Ex : Profil financier et humain conforme aux critères de sélection...' },
    { q: "Le franchiseur dispose-t-il d'un droit de préemption ?", ph: 'Ex : Droit de préemption exercé dans les 30 jours suivant notification...' },
  ]},
  territoire_description: { questions: [
    { q: 'Comment la zone est-elle délimitée géographiquement ?', ph: 'Ex : Rayon de 5 km autour du point de vente, commune de Lyon 3e...' },
    { q: 'La zone inclut-elle des protections particulières ?', ph: 'Ex : Exclusivité sur les ventes physiques, pas de restriction e-commerce...' },
  ]},
  criteres_zone: { questions: [
    { q: 'Sur quels critères repose la délimitation (population, zone commerciale) ?', ph: "Ex : Zone de chalandise d'au moins 50 000 habitants selon données INSEE..." },
    { q: "Y a-t-il des zones exclues ou des exceptions à l'exclusivité ?", ph: "Ex : Le franchiseur conserve le droit d'ouvrir en aéroports et gares..." },
  ]},
  description_litiges: { questions: [
    { q: 'Quelle est la nature du ou des litiges en cours ?', ph: "Ex : Litige contractuel avec un ancien franchisé portant sur la résiliation..." },
    { q: 'Devant quelle juridiction le litige est-il pendant ?', ph: 'Ex : Tribunal de Commerce de Paris, chambre 2...' },
    { q: "Quel est l'état d'avancement de la procédure ?", ph: "Ex : En cours d'instruction, audience prévue au 2ème trimestre 2025..." },
  ]},
  litiges_termines: { questions: [
    { q: 'Combien de litiges se sont clôturés dans les 5 dernières années ?', ph: 'Ex : 2 litiges entre 2020 et 2024...' },
    { q: "Quelle était la nature et l'issue de chacun ?", ph: "Ex : 1 litige résolu à l'amiable, 1 décision en faveur du franchiseur..." },
  ]},
  previsionnel_description: { questions: [
    { q: 'Quelles sont les projections de CA pour les 3 premières années ?', ph: 'Ex : Année 1 : 300 000 €, Année 2 : 420 000 €, Année 3 : 550 000 €...' },
    { q: 'Sur quelles hypothèses ces prévisions sont-elles basées ?', ph: 'Ex : Taux de redevance 5 %, coûts fixes 80 000 €/an, ticket moyen 35 €...' },
    { q: 'À quel horizon la rentabilité est-elle attendue ?', ph: 'Ex : Seuil de rentabilité atteint à 18 mois, marge nette estimée à 12 %...' },
  ]},
};

function ChipSelect({ fieldKey, value, onChange }) {
  const options = CHIP_OPTIONS[fieldKey] || [];
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'px-4 py-2 rounded-lg font-dm-sans text-sm transition-all border',
            value === opt
              ? 'bg-gold text-bg-primary border-gold font-medium shadow-sm'
              : 'border-border-subtle text-text-secondary hover:border-gold/40 hover:text-text-primary bg-bg-elevated',
          ].join(' ')}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function NumberChips({ fieldKey, value, onChange, placeholder }) {
  const suggestions = NUMBER_SUGGESTIONS[fieldKey] || [];
  const isMonetary = MONETARY_KEYS.has(fieldKey);
  return (
    <div className="space-y-2">
      <input
        type="text"
        className="input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Saisir une valeur…'}
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={[
                'px-3 py-1 rounded-md font-dm-mono text-xs transition-all border',
                value === s
                  ? 'bg-gold/20 text-gold border-gold/40'
                  : 'border-border-subtle text-text-muted hover:border-gold/30 hover:text-text-secondary bg-bg-elevated/60',
              ].join(' ')}
            >
              {s}{isMonetary ? ' €' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuidedTextBuilder({ fieldKey, label, value, onChange }) {
  const config = GUIDED_CONFIG[fieldKey];
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState(() =>
    config ? config.questions.map(() => '') : []
  );
  const [loading, setLoading] = useState(false);

  const setAnswer = (i, v) =>
    setAnswers(prev => { const next = [...prev]; next[i] = v; return next; });

  const handleGenerate = async () => {
    const payload = config.questions.map((q, i) => ({ question: q.q, answer: answers[i] }));
    if (!payload.some(qa => qa.answer.trim())) {
      toast.error('Renseignez au moins une réponse pour générer le texte');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/agent/formulate-field', { field_label: label, answers: payload });
      onChange(res.data.text || '');
      setOpen(false);
      toast.success('Texte généré !');
    } catch {
      toast.error('Erreur lors de la génération — réessayez');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        className="input-field resize-none min-h-24"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Rédigez directement ou utilisez l'assistant IA ci-dessous…"
      />
      {config && (
        <div className="rounded-xl border border-gold/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gold/5 hover:bg-gold/10 transition-colors"
          >
            <span className="flex items-center gap-2 font-dm-sans text-xs text-gold font-medium">
              <Wand2 className="w-3.5 h-3.5" />
              Rédiger avec l&apos;assistant IA
            </span>
            {open
              ? <ChevronUp className="w-3.5 h-3.5 text-gold/60" />
              : <ChevronDown className="w-3.5 h-3.5 text-gold/60" />}
          </button>

          {open && (
            <div className="px-4 pt-3 pb-4 space-y-3 bg-bg-elevated/40">
              <p className="font-dm-sans text-xs text-text-muted leading-relaxed">
                Répondez aux questions — l&apos;IA formulera ce champ selon les standards
                juridiques de la Loi Doubin&nbsp;:
              </p>
              {config.questions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <label className="font-dm-sans text-xs text-text-secondary block leading-snug">
                    {q.q}
                  </label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={answers[i]}
                    onChange={e => setAnswer(i, e.target.value)}
                    placeholder={q.ph}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="btn-liquid-glass-prominent flex items-center gap-2 text-xs py-2 px-4 disabled:opacity-60"
              >
                {loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />}
                {loading ? 'Génération en cours…' : 'Générer la formulation'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SmartField({ field, value, onChange }) {
  const update = v => onChange(field.key, v);

  return (
    <div>
      <label className="label">
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      {CHIP_OPTIONS[field.key] ? (
        <ChipSelect fieldKey={field.key} value={value} onChange={update} />
      ) : NUMBER_SUGGESTIONS[field.key] ? (
        <NumberChips
          fieldKey={field.key}
          value={value}
          onChange={update}
          placeholder={field.placeholder}
        />
      ) : field.type === 'textarea' ? (
        <GuidedTextBuilder
          fieldKey={field.key}
          label={field.label}
          value={value}
          onChange={update}
        />
      ) : (
        <input
          className="input-field"
          type={field.type || 'text'}
          value={value}
          onChange={e => update(e.target.value)}
          placeholder={field.placeholder || ''}
        />
      )}
    </div>
  );
}

export default function GenerateDIPPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [savedDipId, setSavedDipId] = useState(null);

  const generateMutation = useMutation({
    mutationFn: () => api.post('/agent/generate', { formData: form }, { timeout: 120000 }),
    onSuccess: (res) => {
      setResult(res.data);
      toast.success('DIP généré avec succès !');
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post('/dip/create-from-agent', {
      title: form.raison_sociale ? `DIP ${form.raison_sociale}` : 'DIP généré',
      sections: result.sections,
      global_score: result.global_score,
      company_name: form.raison_sociale,
    }),
    onSuccess: (res) => {
      setSavedDipId(res.data.dip?.id);
      toast.success('DIP sauvegardé dans votre compte !');
    },
    onError: (err) => toast.error(err.message),
  });

  const downloadDocxMutation = useMutation({
    mutationFn: () => api.post('/agent/docx', {
      sections: result,
      companyName: form.raison_sociale || profile?.company_name,
    }, { responseType: 'blob', timeout: 60000 }),
    onSuccess: (res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `DIP_${(form.raison_sociale || 'franchiseur').replace(/[^a-z0-9]/gi, '_')}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('DOCX téléchargé');
    },
    onError: (err) => toast.error(err.message),
  });

  const stepKeys = STEPS.map(s => s.id);
  const currentStepId = stepKeys[currentStep];
  const currentFields = FORM_FIELDS[currentStepId] || [];
  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);
  const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (result) {
    return (
      <ResultView
        result={result}
        form={form}
        savedDipId={savedDipId}
        onSave={() => saveMutation.mutate()}
        onDownload={() => downloadDocxMutation.mutate()}
        onNavigateDip={() => navigate('/dip')}
        isSaving={saveMutation.isPending}
        isDownloading={downloadDocxMutation.isPending}
        onReset={() => { setResult(null); setSavedDipId(null); }}
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <PageHeader
        title="Générer un DIP"
        subtitle="Renseignez le formulaire — l'IA rédige un DIP complet et conforme Loi Doubin"
      />

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="font-dm-sans text-sm text-text-secondary">
            Étape {currentStep + 1} sur {STEPS.length}
          </span>
          <span className="font-dm-mono text-sm text-gold">{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(i)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-dm-sans transition-all',
                i === currentStep
                  ? 'bg-gold text-bg-primary'
                  : i < currentStep
                  ? 'bg-success/15 text-success border border-success/20'
                  : 'text-text-muted hover:text-text-secondary',
              ].join(' ')}
            >
              {i < currentStep && <CheckCircle className="w-3 h-3" />}
              <step.icon className="w-3 h-3" />
              {step.title}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          {(() => { const S = STEPS[currentStep]; return <S.icon className="w-5 h-5 text-gold" />; })()}
          <div>
            <h2 className="font-cormorant text-xl text-text-primary">{STEPS[currentStep].title}</h2>
            <p className="font-dm-sans text-xs text-text-secondary">{STEPS[currentStep].desc}</p>
          </div>
        </div>

        <div className="space-y-5">
          {currentFields.map(field => (
            <SmartField
              key={field.key}
              field={field}
              value={form[field.key]}
              onChange={updateField}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
          <button
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="btn-ghost flex items-center gap-2 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(s => s + 1)}
              className="btn-primary flex items-center gap-2"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : generateMutation.isPending ? (
            <button
              disabled
              className="btn-liquid-glass-prominent flex items-center gap-2 opacity-70 cursor-not-allowed"
            >
              <LoadingSpinner size="sm" /> Génération en cours (30-60s)…
            </button>
          ) : (
            <LiquidGlassBtn
              onClick={() => generateMutation.mutate()}
              padding="10px 22px"
              cornerRadius={10}
              displacementScale={60}
              blurAmount={0.08}
              saturation={140}
              aberrationIntensity={1.5}
              elasticity={0.2}
              mode="prominent"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'white' }}>
                <Sparkles style={{ width: 16, height: 16 }} />
                Générer le DIP
              </span>
            </LiquidGlassBtn>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-gold/5 border border-gold/15">
        <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
        <p className="font-dm-sans text-xs text-text-secondary leading-relaxed">
          Les champs dotés du bouton{' '}
          <strong className="text-gold">Rédiger avec l&apos;assistant IA</strong>{' '}
          vous posent des questions ciblées pour formuler automatiquement le texte
          selon les standards de la Loi Doubin. Vous pouvez aussi rédiger directement.
        </p>
      </div>
    </div>
  );
}

function ResultView({
  result, form, savedDipId, onSave, onDownload,
  onNavigateDip, isSaving, isDownloading, onReset,
}) {
  const conformes = result.sections?.filter(s => s.status === 'conforme').length || 0;
  const totalSections = result.sections?.length || 10;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="DIP Généré"
        subtitle={`Score de conformité : ${result.global_score || 0}% — ${conformes}/${totalSections} sections conformes`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={onSave}
          disabled={isSaving || !!savedDipId}
          className={`btn-liquid-glass flex-col py-4 gap-2 h-auto ${savedDipId ? 'opacity-50' : ''}`}
        >
          {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-5 h-5" />}
          <span className="text-xs">{savedDipId ? 'Sauvegardé ✓' : 'Sauvegarder'}</span>
        </button>

        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="btn-liquid-glass flex-col py-4 gap-2 h-auto"
        >
          {isDownloading ? <LoadingSpinner size="sm" /> : <Download className="w-5 h-5" />}
          <span className="text-xs">Télécharger DOCX</span>
        </button>

        {savedDipId && (
          <button onClick={onNavigateDip} className="btn-liquid-glass-prominent flex-col py-4 gap-2 h-auto">
            <CheckCircle className="w-5 h-5" />
            <span className="text-xs">Voir le DIP</span>
          </button>
        )}

        <button onClick={onReset} className="btn-ghost flex-col py-4 gap-2 h-auto">
          <span className="text-xs">Nouveau formulaire</span>
        </button>
      </div>

      {result.summary && (
        <div className="card border-gold/15 bg-gold/3">
          <p className="font-dm-sans text-sm text-text-secondary leading-relaxed">{result.summary}</p>
        </div>
      )}

      {result.missing_data?.length > 0 && (
        <div className="card border-danger/15 bg-danger/3">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="font-dm-sans text-sm font-medium text-danger">
              Informations manquantes à compléter
            </span>
          </div>
          <ul className="space-y-1">
            {result.missing_data.map((item, i) => (
              <li key={i} className="font-dm-sans text-xs text-text-secondary flex items-start gap-2">
                <span className="text-danger mt-0.5">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {(result.sections || []).map(section => (
          <div key={section.section_number} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-dm-mono text-xs text-gold/60 w-6">{section.section_number}</span>
                <h3 className="font-dm-sans text-sm font-medium text-text-primary">{section.section_title}</h3>
              </div>
              <StatusBadge status={section.status} />
            </div>
            <div className="font-dm-sans text-sm text-text-secondary leading-relaxed bg-bg-elevated rounded-lg p-4 whitespace-pre-wrap">
              {section.content}
            </div>
            {section.suggestions?.length > 0 && (
              <div className="mt-3 space-y-1">
                {section.suggestions.map((s, i) => (
                  <p key={i} className="font-dm-sans text-xs text-gold/70 flex items-start gap-1.5">
                    <span className="mt-0.5">&#8594;</span> {s}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
