'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Link from 'next/link';

interface Toast {
  id: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 animate-in slide-in-from-right-full duration-300"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {toast.message}
                </p>
                {toast.action && (
                  <div className="mt-2">
                    <Link
                      href={toast.action.href}
                      className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                      onClick={() => removeToast(toast.id)}
                    >
                      {toast.action.label} →
                    </Link>
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Convenience hook for completion toasts
export function useCompletionToast() {
  const { addToast } = useToast();

  return useCallback((jobId: string, jobTitle?: string) => {
    addToast({
      message: 'Job completed successfully!',
      action: {
        label: 'View Results',
        href: `/results/${jobId}`,
      },
    });
  }, [addToast]);
}