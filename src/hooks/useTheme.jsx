import { createContext, useContext, useState, useLayoutEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'tf_admin_theme';

// Dark is the product's default look (see the demo this admin was built to
// match) — light is an opt-in preference, not a replacement.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'dark');

  // useLayoutEffect (not useEffect) so the `dark` class lands before the
  // browser paints, avoiding a flash of the wrong theme on load.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
