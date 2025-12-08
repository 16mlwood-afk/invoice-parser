import React from 'react';
import { cn } from '@/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  const baseClasses = 'rounded-xl transition-all duration-200';

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md',
    elevated: 'bg-white dark:bg-gray-800 border border-neutral-200 dark:border-neutral-700 shadow-lg hover:shadow-xl',
    outlined: 'bg-white dark:bg-gray-800 border-2 border-neutral-300 dark:border-neutral-600 shadow-none hover:border-neutral-400 dark:hover:border-neutral-500',
    gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border border-neutral-200 dark:border-neutral-700 shadow-lg hover:shadow-xl',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('border-b border-neutral-200 pb-4 mb-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn('text-xl font-bold text-neutral-900', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div
      className={cn('', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('border-t border-neutral-200 pt-4 mt-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
