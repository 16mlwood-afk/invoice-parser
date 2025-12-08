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
  const { settings, updateUISettings, loadSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Get initial theme from settings or localStorage
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      const stored = localStorage.getItem('theme');
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as Theme;
      }
    } catch (e) {
      console.error('Error reading theme from localStorage:', e);
    }
    
    return defaultTheme;
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Calculate resolved theme (light or dark)
  const getResolvedTheme = (themeValue: Theme): 'light' | 'dark' => {
    if (themeValue === 'system') {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeValue;
  };

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => 
    getResolvedTheme(getInitialTheme())
  );

  // Set theme and persist
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.error('Error saving theme to localStorage:', e);
    }
    
    // Update settings store (async, but don't wait)
    updateUISettings({ theme: newTheme });
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(() => {
      // If settings have a different theme, use it
      const settingsTheme = settings.ui.theme;
      if (settingsTheme && settingsTheme !== theme) {
        setThemeState(settingsTheme);
      }
    }).catch(console.error);
    
    setMounted(true);
  }, []); // Only run once on mount

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const resolved = getResolvedTheme(theme);
    
    setResolvedTheme(resolved);

    // Apply or remove dark class
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      
      const root = window.document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

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