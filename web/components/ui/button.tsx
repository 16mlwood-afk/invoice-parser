import React from 'react';
import { cn } from '@/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary border border-primary',
    secondary: 'bg-secondary text-white hover:bg-secondary-hover focus:ring-secondary border border-secondary',
    success: 'bg-success text-white hover:shadow-lg focus:ring-success border border-success',
    error: 'bg-error text-white hover:shadow-lg focus:ring-error border border-error',
    outline: 'border-2 border-neutral-300 bg-white dark:bg-gray-800 text-neutral-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-neutral-400 focus:ring-primary',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-primary border-0 shadow-none',
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm gap-2',
    md: 'h-11 px-4 text-base gap-2',
    lg: 'h-13 px-6 text-lg gap-3',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
