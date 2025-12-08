import React from 'react';
import { cn } from '@/utils';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function Grid({
  columns = 1,
  gap = 'md',
  className,
  children,
  ...props
}: GridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 6 | 12;
  children: React.ReactNode;
}

export function GridItem({ span = 1, className, children, ...props }: GridItemProps) {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4',
    6: 'col-span-2 md:col-span-3 lg:col-span-6',
    12: 'col-span-2 md:col-span-4 lg:col-span-6 xl:col-span-12',
  };

  return (
    <div
      className={cn(spanClasses[span], className)}
      {...props}
    >
      {children}
    </div>
  );
}
