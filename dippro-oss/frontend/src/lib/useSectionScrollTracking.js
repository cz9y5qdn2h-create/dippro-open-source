import { useState, useRef, useCallback, useEffect } from 'react';

// Suit, parmi une liste de blocs affichés en continu (trames de document),
// lequel est actuellement le plus visible à l'écran — sert à alimenter un
// indicateur de position (pastille flottante) façon "vous êtes ici", et à
// faire défiler la page jusqu'à une trame donnée au clic.
export function useSectionScrollTracking(items, getId = (it) => it.id) {
  const refs = useRef(new Map());
  const [activeId, setActiveId] = useState(items[0] ? getId(items[0]) : null);

  const registerRef = useCallback((id, el) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('data-section-id');
        if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
        else visible.delete(id);
      });
      let bestId = null, bestRatio = -1;
      for (const it of items) {
        const id = getId(it);
        const ratio = visible.get(id);
        if (ratio !== undefined && ratio > bestRatio) { bestRatio = ratio; bestId = id; }
      }
      if (bestId) setActiveId(bestId);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    items.forEach(it => {
      const el = refs.current.get(getId(it));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(getId).join(',')]);

  const scrollToId = useCallback((id) => {
    refs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const activeIndex = Math.max(0, items.findIndex(it => getId(it) === activeId));

  return { activeId, activeIndex, registerRef, scrollToId };
}
