import { createContext, useContext, useEffect, useState } from 'react';

const THEMES = [
  { id: 'sobre',   label: 'Sobre',   icon: 'moon' },
  { id: 'glass',   label: 'Glass',   icon: 'sparkle' },
  { id: 'lumiere', label: 'Lumière', icon: 'sun' },
];

const VALID_IDS = THEMES.map(t => t.id);

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return ctx;
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('dippro-theme');
    if (VALID_IDS.includes(saved)) return saved;
    return 'glass';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dippro-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
