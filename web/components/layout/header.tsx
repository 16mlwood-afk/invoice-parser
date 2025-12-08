'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
}

const navigation = [
  { name: 'Home', href: '/', icon: '🏠' },
  { name: 'Upload', href: '/upload', icon: '📤' },
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Results', href: '/results', icon: '📋' },
  { name: 'Compare', href: '/compare', icon: '⚖️' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Header({ title, subtitle, showNavigation = true }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-neutral-200 dark:border-neutral-700 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-white text-lg font-bold">📄</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">
                  Invoice Parser
                </h1>
                <p className="text-xs text-neutral-500 dark:text-gray-400 -mt-1">AI-Powered Processing</p>
              </div>
            </Link>
          </div>

          {/* Navigation - Desktop */}
          {showNavigation && (
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-neutral-600 dark:text-gray-300 hover:text-primary hover:bg-neutral-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Mobile Navigation Toggle */}
          {showNavigation && (
            <div className="md:hidden">
              <button className="p-2 rounded-lg text-neutral-600 dark:text-gray-300 hover:text-primary hover:bg-neutral-100 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span>Ready</span>
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className="p-2 text-neutral-600 dark:text-gray-300 hover:text-primary hover:bg-neutral-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Page Title Section */}
        {(title || subtitle) && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 py-4">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
                )}
              </div>

              {/* Breadcrumb */}
              <nav className="hidden sm:flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-neutral-900 dark:text-neutral-100 font-medium">{title || 'Current Page'}</span>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
