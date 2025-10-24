import { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'compact';

/**
 * Custom hook for managing theme mode with localStorage persistence
 * 
 * @example
 * const { themeMode, setThemeMode, toggleTheme } = useThemeMode();
 * 
 * <Button onClick={toggleTheme}>
 *   Current: {themeMode}
 * </Button>
 */
export const useThemeMode = (defaultMode: ThemeMode = 'light') => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    // Try to get saved theme from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themeMode') as ThemeMode;
      return saved || defaultMode;
    }
    return defaultMode;
  });

  // Save to localStorage whenever theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('themeMode', themeMode);
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    themeMode,
    setThemeMode,
    toggleTheme,
  };
};
