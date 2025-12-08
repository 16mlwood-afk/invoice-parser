'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const { settings, updateUISettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Initialize theme from settings store (zustand persist should hydrate immediately)
  const [theme, setThemeState] = useState<Theme>(() => settings.ui?.theme || defaultTheme);

  // Calculate resolved theme (light or dark)
  const getResolvedTheme = (themeValue: Theme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeValue;
  };

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    getResolvedTheme(theme)
  );

  // Set theme and update settings store
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Update settings store (this will persist via zustand and sync to server)
    updateUISettings({ theme: newTheme });
  };

  // Set mounted when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update theme when settings change (only after initial mount to avoid loops)
  useEffect(() => {
    if (mounted && settings.ui.theme !== theme && settings.ui.theme) {
      setThemeState(settings.ui.theme);
    }
  }, [settings.ui.theme, theme, mounted]);

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    const resolved = getResolvedTheme(theme);

    setResolvedTheme(resolved);

    // Apply or remove dark class - ensure clean state
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);

      // Update DOM for system theme changes
      const root = window.document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Set initial system theme
    handleChange();

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}