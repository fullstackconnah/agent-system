import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'signal', label: 'SIGNAL', description: 'Tactical HUD' },
  { id: 'forge', label: 'FORGE', description: 'Neo-Brutalist' },
  { id: 'meridian', label: 'MERIDIAN', description: 'Observatory' },
];

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
