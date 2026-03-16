import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'signal', label: 'SIGNAL', description: 'Tactical HUD' },
  { id: 'forge', label: 'FORGE', description: 'Neo-Brutalist' },
  { id: 'dark-forge', label: 'DARK FORGE', description: 'Noir Brutalist' },
  { id: 'meridian', label: 'MERIDIAN', description: 'Observatory' },
];

export const isForgeTheme = (theme) => theme === 'forge' || theme === 'dark-forge';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexus-theme') || 'signal';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
