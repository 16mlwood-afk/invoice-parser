import React from 'react';
import { cn } from '@/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className,
  ...props
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-neutral-200 rounded';

  const variantClasses = {
    text: 'h-4',
    rectangular: 'h-4',
    circular: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      {...props}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={index === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm', className)}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
        <Skeleton variant="rectangular" height={120} />
        <div className="flex space-x-2">
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={100} height={32} />
        </div>
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Table Header */}
      <div className="flex space-x-4 pb-2 border-b border-neutral-200">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" className="flex-1" />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
