'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui';
import { ParserSettingsTab, UISettingsTab, ExportSettingsTab, ValidationSummary } from './components';
import { useSettingsStore } from '@/stores';

type SettingsTab = 'parser' | 'ui' | 'export';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('parser');
  const {
    isDirty,
    isLoading,
    error,
    validateSettings,
    resetSettings,
    saveSettings,
    loadSettings
  } = useSettingsStore();

  const tabs = [
    { id: 'parser' as const, label: 'Parser Settings', component: ParserSettingsTab },
    { id: 'ui' as const, label: 'UI Settings', component: UISettingsTab },
    { id: 'export' as const, label: 'Export Settings', component: ExportSettingsTab },
  ];

  const handleTabKeyDown = (event: React.KeyboardEvent, currentTab: SettingsTab) => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab);

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      setActiveTab(tabs[prevIndex].id);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      setActiveTab(tabs[nextIndex].id);
    }
  };

  // Load settings on component mount
  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      await resetSettings();
    }
  };

  const handleSave = async () => {
    if (validateSettings()) {
      const success = await saveSettings();
      if (success) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } else {
      alert('Please fix validation errors before saving.');
    }
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ParserSettingsTab;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Settings Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <nav
              className="flex space-x-1 bg-white dark:bg-neutral-800 p-1 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700"
              role="tablist"
              aria-label="Settings categories"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-50 dark:hover:bg-neutral-700'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Validation Summary */}
          <ValidationSummary className="mb-6" />

          {/* Settings Content */}
          <Card
            className="p-6"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            id={`tabpanel-${activeTab}`}
          >
            <ActiveComponent />
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset to Defaults
            </button>

            <div className="flex space-x-3">
              {isDirty && (
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  You have unsaved changes
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={!isDirty || isLoading}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDirty && !isLoading
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-gray-300 dark:bg-neutral-600 text-gray-500 dark:text-neutral-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}