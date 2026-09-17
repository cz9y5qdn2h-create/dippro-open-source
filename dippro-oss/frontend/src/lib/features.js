// Feature flags — controlés via variables d'environnement VITE_FEATURE_*
// Valeur par défaut : désactivé pour les fonctionnalités optionnelles,
//                    activé pour les fonctionnalités actives stables.
export const FEATURES = {
  // Désactivé par défaut — activer via VITE_FEATURE_WHATSAPP=true
  whatsapp: import.meta.env.VITE_FEATURE_WHATSAPP === 'true',
  // Désactivé par défaut — MonitorPage est un placeholder "à venir"
  monitor: import.meta.env.VITE_FEATURE_MONITOR === 'true',
  // Activé par défaut — désactiver via VITE_FEATURE_COPILOT=false
  copilot: import.meta.env.VITE_FEATURE_COPILOT !== 'false',
  // Activé par défaut — désactiver via VITE_FEATURE_ANALYTICS=false
  analytics: import.meta.env.VITE_FEATURE_ANALYTICS !== 'false',
  // Activé par défaut — page /design-preview pour valider le redesign avant application globale
  design_preview: import.meta.env.VITE_FEATURE_DESIGN_PREVIEW !== 'false',
};
