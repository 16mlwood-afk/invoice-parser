'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

export function SettingsLoader() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // Load settings from server on app initialization
    // This will sync with server settings if available
    loadSettings().catch((error) => {
      console.warn('Failed to load settings from server:', error);
      // This is not critical - settings will fall back to localStorage defaults
    });
  }, [loadSettings]);

  return null; // This component doesn't render anything
}