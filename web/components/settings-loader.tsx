'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

export function SettingsLoader() {
  const { loadSettings, setError } = useSettingsStore();

  useEffect(() => {
    // Load settings from server on app initialization
    // This will sync with server settings if available
    loadSettings().catch((error) => {
      console.warn('Failed to load settings from server, using localStorage defaults:', error);
      // Set a non-blocking error that won't prevent the app from working
      setError('Failed to sync settings with server. Using local settings.');
      // This is not critical - settings will fall back to localStorage defaults
    });
  }, [loadSettings, setError]);

  return null; // This component doesn't render anything
}