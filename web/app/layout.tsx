import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components';
import { Header } from '@/components/layout';
import { SettingsLoader } from '@/components/settings-loader';
import './globals.css';
import React from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Amazon Invoice Parser',
  description:
    'Web interface for processing Amazon and retailer invoices with advanced PDF parsing',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-white dark:bg-gray-900`}>
        <SettingsLoader />
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            {/* Global Header */}
            <Header showNavigation={true} />

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-900 border-t border-neutral-200 dark:border-neutral-700 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-hover rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">📄</span>
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Invoice Parser v1.0</span>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-neutral-500 dark:text-neutral-400">
                    <span>© 2025 Invoice Parser</span>
                    <span>•</span>
                    <span>AI-Powered Processing</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
