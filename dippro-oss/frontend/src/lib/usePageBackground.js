import { useEffect } from 'react';

// Les pages publiques (landing, auth, ressources...) peignent leur propre
// fond sur un <div> plutôt que d'utiliser le thème CSS de l'espace connecté
// (--page-bg) — sans ce hook, <body> garde le fond du thème par défaut, qui
// ne correspond pas à celui de la page. Sur mobile, le rebond de défilement
// (overscroll) découvre ce fond par défaut : ça se voit comme des bandes
// claires en haut et en bas de l'écran, en décalage avec le reste de la page.
export default function usePageBackground(background) {
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = background;
    document.documentElement.style.background = background;
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, [background]);
}
